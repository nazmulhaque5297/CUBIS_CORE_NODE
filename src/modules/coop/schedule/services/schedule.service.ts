import { toCamelKeys, toSnakeCase } from "keys-transform";
import { PoolClient } from "pg";
import { buildInsertSql, buildUpdateWithWhereSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { buildInsertMultipleRow } from "../../../../utils/sql-builder.util";

@Service()
export default class SamityInfoScheduleServices {
  count: number;
  constructor() {
    this.count = 1;
  }

  async generateSchedule() {
    const archiveInfoSql = `select * from archive.archive_info order by id`;
    let scheduleJobList: any = toCamelKeys((await (await pgConnect.getConnection("slave")).query(archiveInfoSql)).rows);
    for (const element of scheduleJobList) {
      const scheduleTime = element.time;
      const startTime = new Date();
      let isArchived = false;
      let error;
      let flag;
      if (element.flag == "archive") {
        const transaction = await (await pgConnect.getConnection("archive")).connect();

        try {
          transaction.query("BEGIN");
          const dataFromCondition = (await (await pgConnect.getConnection("slave")).query(element.condition)).rows;

          let deleteInfo = [];

          if (dataFromCondition.length > 0) {
            for (const [index, e] of element.processInfo.entries()) {
              let countSql = `select count(id) from ` + e.fromTableName + " where ";
              let sql = `select * from ` + e.fromTableName + " where ";
              let deleteSql = `delete from ` + e.fromTableName + " where ";
              let count = 1;
              let values = [];
              for (const [index, el] of e.dumpKey.entries()) {
                if (index == 0) {
                  countSql = countSql + toSnakeCase(el) + ` IN (`;
                  sql = sql + toSnakeCase(el) + ` IN (`;
                  deleteSql = deleteSql + toSnakeCase(el) + ` IN (`;
                  for (const [i, ele] of dataFromCondition.entries()) {
                    if (i == dataFromCondition.length - 1) {
                      sql = sql + `$${count} )`;
                      countSql = countSql + `$${count} )`;
                      deleteSql = deleteSql + `$${count} )`;
                    } else {
                      sql = sql + `$${count} ,`;
                      countSql = countSql + `$${count} ,`;
                      deleteSql = deleteSql + `$${count} ,`;
                    }

                    values.push(ele[e.dumpConditionKey[index]]);
                    count++;
                  }
                } else {
                  sql = sql + " and " + toSnakeCase(el) + ` IN (`;
                  countSql = countSql + " and " + toSnakeCase(el) + ` IN (`;
                  for (const [i, ele] of dataFromCondition.entries()) {
                    if (i == dataFromCondition.length - 1) {
                      sql = sql + `$${count} )`;
                      countSql = countSql + `$${count} )`;
                      deleteSql = deleteSql + `$${count} )`;
                    } else {
                      sql = sql + `$${count} ,`;
                      countSql = countSql + `$${count} ,`;
                      deleteSql = deleteSql + `$${count} ,`;
                    }
                    values.push(ele[e.dumpConditionKey[index]]);
                    count++;
                  }
                }
              }
              const countDataSet = (await (await pgConnect.getConnection("slave")).query(countSql, values)).rows[0]
                ?.count;

              if (countDataSet && countDataSet >= e.dataTransferLimit) {
                const loopCount = Math.ceil(parseInt(countDataSet) / e.dataTransferLimit);
                for (let i = 0; i < loopCount; i++) {
                  const enhanceSql =
                    sql + `order by id limit ${e.dataTransferLimit} offset ${i == 0 ? 0 : i * e.dataTransferLimit}`;

                  const data = (await (await pgConnect.getConnection("slave")).query(enhanceSql, values)).rows;

                  const { sql: archiveSql, params: archiveParam } = buildInsertMultipleRow(
                    e.toTableName,
                    data,
                    e.jsonField
                  );
                  const archiveData = (await transaction.query(archiveSql, archiveParam)).rows;

                  if (archiveData) {
                    isArchived = true;

                    if (i == 0) {
                      deleteInfo.push({
                        deleteSql,
                        values,
                        serial: e.deleteSerial,
                      });
                    }
                  }
                }
              } else if (countDataSet > 0) {
                const data = (await (await pgConnect.getConnection("slave")).query(sql, values)).rows;

                const { sql: archiveSql, params: archiveParam } = buildInsertMultipleRow(
                  e.toTableName,
                  data,
                  e.jsonField
                );
                const archiveData = (await transaction.query(archiveSql, archiveParam)).rows;

                if (archiveData) {
                  isArchived = true;
                  deleteInfo.push({
                    deleteSql,
                    values,
                    serial: e.deleteSerial,
                  });
                }
              }
            }

            deleteInfo = deleteInfo.sort((a, b) => {
              return a.serial - b.serial;
            });

            for (const e of deleteInfo) {
              await (await pgConnect.getConnection("master")).query(e.deleteSql, e.values);
            }
          } else {
            isArchived = true;
          }
          flag = "archive";
          transaction.query("COMMIT");
        } catch (ex: any) {
          transaction.query("ROLLBACK");
          isArchived = false;
          flag = "archive";
          error = ex;
        } finally {
          transaction.release();
        }
      } else if (element.flag == "dataSync") {
        const transaction = await (await pgConnect.getConnection("master")).connect();
        try {
          transaction.query("BEGIN");
          await this.staticJob(element.purpose, transaction);
          isArchived = true;
          flag = "dataSync";
          transaction.query("COMMIT");
        } catch (ex: any) {
          transaction.query("ROLLBACK");
          error = ex;
          flag = "dataSync";

          // throw new BadRequestError(ex);
        } finally {
          transaction.release();
        }
      }

      const endTime = new Date();
      const { sql: archiveLogSql, params: aechiveLogParams } = isArchived
        ? buildInsertSql("archive.archive_log", {
            archiveInfoId: element.id,
            log: "data archive sucessfully",
            isCompleted: true,
            flag,
            startTime,
            endTime,
          })
        : buildInsertSql("archive.archive_log", {
            archiveInfoId: element.id,
            log: error,
            isCompleted: false,
            flag,
            startTime,
            endTime,
          });

      const archiveLogData = (await (await pgConnect.getConnection("master")).query(archiveLogSql, aechiveLogParams))
        .rows;
    }

    return true;
  }

  async staticJob(purpose: string, transaction: PoolClient) {
    if (purpose == "web_site") {
      this.webSiteSync(transaction);
    }
  }
  async webSiteSync(transaction: PoolClient, officeId?: number) {
    let sql = ``;
    let samityResult = [];
    if (officeId) {
      sql = `select id from coop.samity_info where office_id=$1`;
      samityResult = (await transaction.query(sql, [officeId])).rows;
    } else {
      sql = `select id from coop.samity_info`;
      samityResult = (await transaction.query(sql)).rows;
    }

    for (const element of samityResult) {
      const samityDataPageDataSql = `SELECT
                                       a.samity_name,
                                       a.samity_code,
                                       a.samity_level,
                                       a.samity_district_id,
                                       a.samity_division_id,
                                       a.samity_upa_city_id,
                                       a.samity_upa_city_type,
                                       a.samity_uni_thana_paw_id,
                                       a.samity_uni_thana_paw_type,
                                       a.samity_type_id,
                                       a.mobile,
                                       a.email,
                                       b.name as name_bangla,
                                       c.project_name_bangla,
                                       d.name_bn office_name,
                                       e.name_bn doptor_name,
                                       f.district_name_bangla,
                                       g.upazila_name_bangla,
                                       h.division_name_bangla as samity_division_name_bangla,
                                       i.type_name samiy_type_name,
                                       j.name_bn doptor_name
                                     FROM
                                       coop.samity_info a
                                     LEFT JOIN users.user b ON
                                       b.id = a.organizer_id
                                     LEFT JOIN master.project_info c ON
                                       c.id = a.project_id
                                     INNER JOIN master.office_info d ON
                                       d.id = a.office_id
                                     INNER JOIN master.doptor_info e ON
                                       e.id = a.doptor_id
                                     INNER JOIN master.district_info f ON
                                       f.id = a.district_id
                                     INNER JOIN master.upazila_info g ON
                                       g.id = a.upazila_id
                                     INNER JOIN master.division_info h ON
                                       h.id=a.samity_division_id
                                     INNER JOIN coop.samity_type i ON
                                       i.id=a.samity_type_id
                                     INNER JOIN master.doptor_info j ON
                                       j.id=a.doptor_id
                                     WHERE
                                       a.id = $1`;
      const samityDataForPageData = (await transaction.query(samityDataPageDataSql, [element.id])).rows[0];

      const sql = `Select * from portal.page_data where samity_id = $1 and status = true`;

      const result = (await transaction.query(sql, [element.id])).rows[0];

      if (result.id) {
        const committeeInfoSql = `SELECT * FROM coop.committee_info WHERE samity_id=$1`;
        const committeeInfoDataResult = (
          await (await pgConnect.getConnection("slave")).query(committeeInfoSql, [element.id])
        ).rows[0];

        let committeeMembers = [];

        if (committeeInfoDataResult) {
          const committeeMemberSql = `select
          b.id,
          b.samity_id,
          b.committee_id,
          b.committee_role_id,
              a.member_name,
              a.member_name_bangla,
              a.member_photo,
              a.member_sign,
              c.role_name
            from
          coop.committee_member b
             left join  coop.member_info a on b.samity_id=a.samity_id and b.member_id=a.id
             left join master.committee_role c on c.id=b.committee_role_id 
            where
              b.samity_id = $1`;
          committeeMembers = (await transaction.query(committeeMemberSql, [element.id])).rows;
        }

        const budgetSql = `SELECT
                     a.id,
                     a.samity_id,
                     a.start_year,
                     a.end_year,
                     a.amount,
                     b.glac_name,
                     b.glac_code
                   FROM
                     coop.budget_info a
                   INNER JOIN coop.glac_mst b ON
                     a.glac_id = b.id
                   WHERE samity_id = $1`;
        const budgetResult = (await transaction.query(budgetSql, [element.id])).rows;
        const { sql: pageDataUpdateSql, params: pageDataParams } = buildUpdateWithWhereSql(
          "portal.page_data",
          { samityId: element.id },
          {
            data: {
              mainBudgetData: budgetResult ? budgetResult : [],
              committeeMemberWithPhoto: committeeMembers,
              samityDataForPageData: samityDataForPageData,
            },
            updatedBy: "scheduler",
            updatedAt: new Date(),
          }
        );

        const pageData = (await transaction.query(pageDataUpdateSql, pageDataParams)).rows;
      }
    }
  }
}
