import { toCamelKeys, toSnakeCase } from "keys-transform";
import { PoolClient } from "pg";
import { buildInsertSql, buildUpdateWithWhereSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";

@Service()
export default class SamityInfoScheduleServices {
  count: number;
  constructor() {
    this.count = 1;
  }

  async generateSchedule() {
    const archiveInfoSql = `select * from archive.archive_info`;
    let scheduleJobList: any = toCamelKeys((await (await pgConnect.getConnection("slave")).query(archiveInfoSql)).rows);

    for (const element of scheduleJobList) {
      const scheduleTime = element.time;

      if (scheduleTime) {
        let sqlDataFromCondition = `select `;
        let keys;
        let values;
        let expectedDataKeys;
        let expectedDataValues;
        let insertInArchiveError;
        if (element.condition) {
          expectedDataKeys = Object.keys(element.condition.expectedData);
          expectedDataValues = Object.values(element.condition.expectedData);

          for (const e of expectedDataValues) {
            sqlDataFromCondition = sqlDataFromCondition + e;
          }
          sqlDataFromCondition =
            sqlDataFromCondition +
            ` from ${element.condition.tableName} 
              where `;

          keys = Object.keys(element.condition.whereCondition);
          values = Object.values(element.condition.whereCondition);
          let count = 1;

          for (const [index, e] of keys.entries()) {
            if (index == 0) {
              sqlDataFromCondition = sqlDataFromCondition + toSnakeCase(e) + ` =$${count}`;
              count = count + 1;
            } else {
              sqlDataFromCondition = sqlDataFromCondition + " and " + toSnakeCase(e) + ` =$${count}`;
              count = count + 1;
            }
          }
        }

        const dataFromCondition = (await (await pgConnect.getConnection("slave")).query(sqlDataFromCondition, values))
          .rows;

        for (const el of dataFromCondition) {
          for (const [index, e] of element.fromTableName.entries()) {
            let sql = `select * from ` + e.tableName + " where ";
            let deleteSql = `delete from ` + e.tableName + " where ";
            let count = 1;
            let values = [];

            for (const [index, key] of e.dumpKey.entries()) {
              if (index == 0) {
                sql = sql + toSnakeCase(key) + ` =$${count}`;
                deleteSql = deleteSql + toSnakeCase(key) + ` =$${count}`;

                count = count + 1;
              } else {
                sql = sql + toSnakeCase(key) + " and " + ` =$${count}`;
                deleteSql = deleteSql + toSnakeCase(key) + " and " + ` =$${count}`;
                count = count + 1;
              }
            }

            for (const key of e.dumpConditionKey) {
              values.push(el[key]);
            }

            const data = (await (await pgConnect.getConnection("slave")).query(sql, values)).rows;
          }
        }

        const { sql: archiveLogSql, params: aechiveLogParams } = buildInsertSql("archive.archive_log", {
          archiveInfoId: element.id,
          log: "data archive sucessfully",
          isArchive: true,
        });

        const archiveLogData = (await (await pgConnect.getConnection("master")).query(archiveLogSql, aechiveLogParams))
          .rows;
      }
    }

    return true;
  }

  async staticJob(purpose: string, transaction: PoolClient) {
    if (purpose == "web_site") {
      this.webSiteSync(transaction, 0);
    }
  }

  //officeId==0 means all samity
  async webSiteSync(transaction: PoolClient, officeId: number) {
    let sql = ``;
    let samityResult = [];
    if (officeId == 0) {
      sql = `select id from coop.samity_info`;
      samityResult = (await transaction.query(sql)).rows;
    } else if (officeId) {
      sql = `select id from coop.samity_info where office_id=$1`;
      samityResult = (await transaction.query(sql, [officeId])).rows;
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

        // result.data.committeeMemberWithPhoto = committeeMembers;

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
