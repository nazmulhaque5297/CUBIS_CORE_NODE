import { toCamelKeys } from "keys-transform";
import lo from "lodash";
import { PoolClient } from "pg";
import { BadRequestError, buildUpdateWithWhereSql } from "rdcd-common";

import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { buildUpdateSql } from "../../../../utils/sql-builder.util";

@Service()
export class RegistrationStepServices {
  constructor() {}

  async create(s: any) {
    s.createdAt = new Date();
    const regSql = `INSERT INTO temps.reg_steps (
          samity_id,samity_name, user_id, last_step,url, status, created_by, created_at)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`;
    const regStepResult = await (
      await pgConnect.getConnection("master")
    ).query(regSql, [s.samityId, s.samityName, s.userId, s.lastStep, s.url, s.status, s.createdBy, new Date()]);

    return toCamelKeys(regStepResult.rows[0]);
  }

  async get(userId: number, isAll: any) {
    if (isAll == "all") {
      const transaction = await (await pgConnect.getConnection("slave")).connect();
      try {
        const regStepsData = [];
        await transaction.query("BEGIN");
        const sql = `SELECT a.*, b.samity_name,b.created_at as samity_creation_date,b.samity_level from temps.reg_steps as a, temps.samity_info as b 
        where a.samity_id=b.id`;

        const resStepsAndSamityData: any = (await (
          await transaction.query(sql)
        ).rows[0])
          ? toCamelKeys((await transaction.query(sql)).rows)
          : null;

        if (resStepsAndSamityData) {
          for (const element of resStepsAndSamityData) {
            const samityId = element.samityId;

            const sqlForDivisionName = `SELECT b.division_name_bangla 
                                      FROM temps.samity_info as a, master.division_info as b 
                                      WHERE a.samity_division_id=b.id AND a.id=$1 `;
            const divisionNameBangla = await (
              await transaction.query(sqlForDivisionName, [samityId])
            ).rows[0].division_name_bangla;
            const sqlForDistrictName = `SELECT b.district_name_bangla
                                        FROM temps.samity_info as a, master.district_info as b
                                        WHERE a.samity_district_id=b.id AND a.id=$1 `;
            const districtNameBangla = await (
              await transaction.query(sqlForDistrictName, [samityId])
            ).rows[0].district_name_bangla;

            const sqlForProjectName = `SELECT b.project_name
                                        FROM temps.samity_info as a, master.project_info as b
                                        WHERE a.project_id=b.id AND a.id=$1 `;
            const projectNameBangla = await (
              await transaction.query(sqlForProjectName, [samityId])
            ).rows[0].project_name;

            element.divisionNameBangla = divisionNameBangla;
            element.districtNameBangla = districtNameBangla;

            element.projectNameBangla = projectNameBangla;
            regStepsData.push(element);
          }
          await transaction.query("COMMIT");

          return regStepsData;
        }
      } catch (ex) {
        await transaction.query("ROLLBACK");
        throw new BadRequestError(`error is ${ex}`);
      } finally {
        transaction.release();
      }
    } else if (isAll == "single") {
      const sql = `SELECT * from temps.reg_steps WHERE user_id=$1 AND status=$2 `;
      const result = (await (await pgConnect.getConnection("slave")).query(sql, [userId, "P"])).rows[0];

      if (result) {
        return toCamelKeys(result);
      } else {
        return {
          lastStep: 0,
          url: "coop/registration",
        };
      }
    } else {
      throw new BadRequestError("Invalid query params is added");
    }
  }

  async getByuserId(userId: number, status: string | null, doptorId: number) {
    let queryText;
    let pendingSamityResult;
    if (status === "P") {
      // queryText = `SELECT * from temps.reg_steps WHERE user_id=$1 AND status=$2 `;
      queryText = `SELECT a.*, b.doptor_id from temps.reg_steps a 
      left join temps.samity_info b on a.samity_id=b.id 
      WHERE a.user_id=$1 AND a.status=$2 AND b.doptor_id=$3`;
      pendingSamityResult = (
        await (await pgConnect.getConnection("slave")).query(queryText, [userId, status, doptorId])
      ).rows;
    } else {
      // queryText = `SELECT * FROM temps.reg_steps WHERE user_id=$1`;
      queryText = `SELECT a.*, b.doptor_id from temps.reg_steps a 
      left join temps.samity_info b on a.samity_id=b.id 
      WHERE a.user_id=$1 AND b.doptor_id=$2`;
      pendingSamityResult = (await (await pgConnect.getConnection("slave")).query(queryText, [userId, doptorId])).rows;
    }
    const allDataOfRegStepsByCitizen = [];

    const allSamityId: any = pendingSamityResult ? toCamelKeys(pendingSamityResult) : null;

    if (allSamityId) {
      for (const element of allSamityId) {
        const samityId = element.samityId;
        const sql = `SELECT
                      a.id as samity_id,
                      a.samity_name,
                      a.samity_level,
                      a.phone,
                      a.mobile,
                      a.email,
                      a.website,
                      a.enterprising_id,
                      a.created_at as samity_creation_date,
                      a.samity_level,
  	                  b.division_name_bangla,
  	                  c.district_name_bangla,
  	                  e.upa_city_name_bangla,
  	                  d.uni_thana_paw_name_bangla,
  	                  f.project_name,
  	                  g.type_name,
                      h.status as reg_status
                  FROM temps.samity_info a
  	              INNER JOIN master.division_info as b ON a.samity_division_id=b.id
  	              INNER JOIN master.district_info as c ON a.samity_division_id=c.id
  	              INNER JOIN master.mv_union_thana_paurasabha_info d ON a.samity_uni_thana_paw_id=d.uni_thana_paw_id
  	                          AND a.samity_uni_thana_paw_type= d.uni_thana_paw_type
  	              INNER JOIN master.mv_upazila_city_info e ON a.samity_upa_city_id=e.upa_city_id
  	                          AND a.samity_upa_city_type=e.upa_city_type
  	              LEFT JOIN master.project_info f ON a.project_id=f.id
  	              INNER JOIN  coop.samity_type g ON a.samity_type_id=g.id
                  INNER JOIN temps.reg_steps h ON a.id=h.samity_id
  	               WHERE a.id=$1`;
        const result = (await (await pgConnect.getConnection("slave")).query(sql, [samityId])).rows[0];
        allDataOfRegStepsByCitizen.push({
          regStepsData: element,
          samityData: result,
        });
      }
    }

    return allDataOfRegStepsByCitizen.length >= 1 ? toCamelKeys(allDataOfRegStepsByCitizen) : null;
  }

  async update(s: any) {
    const id = s.id;
    const data = lo.omit(s, ["createdBy", "createdAt", "updatedBy", "updatedAt"]);
    data.updatedBy = s.userId;
    data.updatedAt = new Date();

    const { sql, params } = buildUpdateSql("temps.reg_steps", id, {
      ...data,
    });
    const stepsData = (await (await pgConnect.getConnection("master")).query(sql, params)).rows[0];
    return toCamelKeys(stepsData);
  }

  async getBySamityId(samityId: number, transaction?: PoolClient) {
    const sql = `SELECT * FROM temps.reg_steps WHERE samity_id=$1`;
    const result = transaction
      ? (await transaction.query(sql, [samityId])).rows[0]
      : (await (await pgConnect.getConnection("slave")).query(sql, [samityId])).rows[0];
    return result
      ? toCamelKeys(result)
      : {
          regStepsData: {
            lastStep: 0,
            url: "coop/registration",
          },
        };
  }

  async updateSteps(samityId: number, transaction: PoolClient, lastStep: number, updatedBy: any) {
    const regStepsData: any = await this.getBySamityId(samityId, transaction);

    if (regStepsData.id && regStepsData.lastStep < lastStep) {
      let updateObj =
        lastStep == 9
          ? {
              lastStep,
              url: this.pageLink(lastStep),
              status: "C",
              updatedBy,
              updatedAt: new Date(),
            }
          : {
              lastStep,
              url: this.pageLink(lastStep),
              updatedBy,
              updatedAt: new Date(),
            };

      const { sql: regSql, params: regParams } = buildUpdateWithWhereSql(
        "temps.reg_steps",
        { id: regStepsData.id },
        updateObj
      );
      const regStepResult = await (await transaction.query(regSql, regParams)).rows[0];

      return regStepResult ? toCamelKeys(regStepResult) : regStepResult;
    }
  }

  pageLink = (lastStep: number) => {
    if (lastStep == 2) {
      return "/coop/samity-management/coop/member-registration";
    } else if (lastStep == 3) {
      return "/coop/samity-management/coop/designation";
    } else if (lastStep == 4) {
      return "/coop/samity-management/coop/member-expenditure";
    } else if (lastStep == 5) {
      return "/coop/samity-management/coop/income-expense";
    } else if (lastStep == 6) {
      return "/coop/samity-management/coop/budget";
    } else if (lastStep == 7) {
      return "/coop/samity-management/coop/required-doc";
    } else if (lastStep == 8) {
      return "/coop/samity-management/coop/samity-reg-report";
    } else if (lastStep == 9) {
      return "/reports/basic-report/document-download";
    }
  };
}
