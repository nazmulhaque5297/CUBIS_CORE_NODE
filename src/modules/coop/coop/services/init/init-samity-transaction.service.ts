import { BadRequestError, buildSql } from "rdcd-common";
import Container, { Service } from "typedi";
import { pgConnect } from "../../../../../db-coop/factory/connection.db";
import { buildUpdateSql } from "../../../../../utils/sql-builder.util";
import { samityTransactionAttrs } from "../../interfaces/init/init-samity-transaction.interface";

import { toCamelKeys, toSnakeCase, toSnakeKeys } from "keys-transform";
import { RegistrationStepServices } from "../reg-steps.service";

@Service()
export class SamityTransactionServices {
  constructor() {}

  async get(isPagination: boolean, limit: number, offset: number, allQuery: object) {
    let queryText: string = "";
    const sql: string = "SELECT * FROM temps.samity_gl_trans";
    const allQueryValues: any[] = Object.values(allQuery);

    if (Object.keys(allQuery).length >= 1) {
      const createSql = buildSql(sql, allQuery, "AND", this.filter, "id", limit, offset);

      queryText = isPagination ? createSql[0] : createSql[1];

      var memberArea = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = isPagination
        ? "SELECT * FROM temps.samity_gl_trans  ORDER BY id LIMIT $1 OFFSET $2"
        : "SELECT * FROM temps.samity_gl_trans  ORDER BY id ";
      memberArea = await (await pgConnect.getConnection("slave")).query(queryText, isPagination ? [limit, offset] : []);
    }
    return memberArea.rows;
  }

  // async get(samityId: number) {
  //   const sql = `select * from coop.samity_transaction_temp where samity_id=$1`;
  //   return memberArea.rows;
  // }

  //create new memberArea

  // Promise<samityTransactionAttrs>
  // async create(data: samityTransactionAttrs): Promise<any> {
  //   const transaction = await (
  //     await pgConnect.getConnection("master")
  //   ).connect();

  //   const sql = `INSERT INTO temp.samity_gl_trans
  //   (samity_id,glac_id,exp_amt,inc_amt,financial_year,is_ie_budget,orp_code,budget_role,tran_date,created_by,created_at)
  //   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ,
  //   ($12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22);
  //   `;

  //   const result = (await pgConnect.getConnection("master")).query(sql, [
  //     512,
  //     291,
  //     0,
  //     1000,
  //     "2022 - 2023",
  //     "B",
  //     "INC",
  //     "N",
  //     "2022-11-15T06:42:05.667Z",
  //     24,
  //     "2022-11-15T06:42:05.667Z",
  //     512,
  //     291,
  //     0,
  //     1000,
  //     "2022 - 2023",
  //     "B",
  //     "INC",
  //     "N",
  //     "2022-11-15T06:42:05.667Z",
  //     24,
  //     "2022-11-15T06:42:05.667Z",
  //   ]);

  //   // try {
  //   //   transaction.query("BEGIN");

  //   //   const { sql, params } = buildInsertSql("temp.samity_gl_trans", {
  //   //     ...data,
  //   //   });

  //   //   //console.log(sql, params);

  //   //   const result = await transaction.query(sql, params);

  //   //   if (result) {
  //   //     const RegistrationStepService = Container.get(RegistrationStepServices);
  //   //     const regStepResult = await RegistrationStepService.updateSteps(
  //   //       data.samityId,
  //   //       transaction,
  //   //       6,
  //   //       data.updatedBy
  //   //     );
  //   //   }
  //   //   transaction.query("COMMIT");
  //   //   return result.rows[0] ? toCamelKeys(result.rows[0]) : result;
  //   // } catch (ex: any) {
  //   //   transaction.query("ROLLBACK");
  //   //   throw new BadRequestError(ex);
  //   // } finally {
  //   //   transaction.release();
  //   // }
  // }

  async create(data: samityTransactionAttrs[], user: any, type: string) {
    //console.log("data", data);
    const transaction = await (await pgConnect.getConnection("master")).connect();

    let sql = `INSERT INTO temps.samity_gl_trans`;
    let sqlKeys = Object.keys(toSnakeKeys(data[0]));
    let keysList = ``;
    for (const [i, e] of sqlKeys.entries()) {
      if (i == 0) {
        keysList = keysList + `(${e},`;
      } else if (i == sqlKeys.length - 1) {
        keysList = keysList + `${e})`;
      } else {
        keysList = keysList + `${e},`;
      }
    }

    sql = sql + "" + keysList + "" + "VALUES" + "";

    let start = 1;
    const params = [];
    let parameterList = ``;
    for (const [index, element] of data.entries()) {
      let keys = Object.keys(element);
      let v = ``;
      for (const [i, e] of keys.entries()) {
        if (i == 0) {
          v = v + `($${start},`;
          start++;
        } else if (i == keys.length - 1) {
          v = v + `$${start})`;
          start++;
        } else {
          v = v + `$${start},`;
          start++;
        }
      }
      if (index == data.length - 1) {
        parameterList = parameterList + "" + v;
      } else {
        parameterList = parameterList + "" + v + ",";
      }

      params.push(...Object.values(element));
    }

    sql = sql + parameterList + "" + "returning * ;";

    try {
      transaction.query("BEGIN");

      const result = await (await transaction.query(sql, params)).rows;

      if (result.length > 0 && type == "budget") {
        const RegistrationStepService = Container.get(RegistrationStepServices);
        const regStepResult = await RegistrationStepService.updateSteps(
          data[0].samityId,
          transaction,
          7,
          data[0].createdBy
        );
      }
      if (result.length > 0 && type == "expense") {
        const RegistrationStepService = Container.get(RegistrationStepServices);
        const regStepResult = await RegistrationStepService.updateSteps(
          data[0].samityId,
          transaction,
          6,
          data[0].createdBy
        );
      }
      transaction.query("COMMIT");
      return result ? toCamelKeys(result) : result;
    } catch (ex: any) {
      transaction.query("ROLLBACK");
      throw new BadRequestError(ex);
    } finally {
      transaction.release();
    }

    // const sql = `INSERT INTO temp.samity_gl_trans
    // (samity_id,glac_id,exp_amt,inc_amt,financial_year,is_ie_budget,orp_code,budget_role,tran_date,created_by,created_at)
    // VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ,
    // ($12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22);
    // `;

    // const result = (await pgConnect.getConnection("master")).query(sql, [
    //   512,
    //   291,
    //   0,
    //   1000,
    //   "2022 - 2023",
    //   "B",
    //   "INC",
    //   "N",
    //   "2022-11-15T06:42:05.667Z",
    //   24,
    //   "2022-11-15T06:42:05.667Z",
    //   512,
    //   291,
    //   0,
    //   1000,
    //   "2022 - 2023",
    //   "B",
    //   "INC",
    //   "N",
    //   "2022-11-15T06:42:05.667Z",
    //   24,
    //   "2022-11-15T06:42:05.667Z",
    // ]);
  }

  // update feature by id
  async update(id: number, data: samityTransactionAttrs): Promise<any> {
    const { sql, params } = buildUpdateSql("temps.samity_gl_trans", id, {
      ...data,
    });
    const updateResult: samityTransactionAttrs = (await (await pgConnect.getConnection("master")).query(sql, params))
      .rows[0];
    return updateResult ? toCamelKeys(updateResult) : {};
  }

  async delete(id: number): Promise<any> {
    const sql = `DELETE FROM temps.samity_gl_trans WHERE id = $1 RETURNING *`;
    const result = await (await pgConnect.getConnection("master")).query(sql, [id]);
    return toCamelKeys(result.rows[0]);
  }

  async count(allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT( id) FROM temps.samity_gl_trans";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = await buildSql(sql, allQuery, "AND", this.filter, "id")[1];
      var result = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT( id) FROM temps.samity_gl_trans";
      result = await (await pgConnect.getConnection("slave")).query(queryText);
    }
    return result.rows[0].count;
  }

  filter(key: string) {
    return toSnakeCase(key);
  }

  async checkExistingId(id: any) {
    if (!id) {
      return true;
    } else {
      const { rows: feature } = await (
        await pgConnect.getConnection("slave")
      ).query(
        `
                SELECT COUNT(id) 
                FROM temps.samity_gl_trans
                WHERE id = $1
              `,
        [id]
      );
      return parseInt(feature[0].count) >= 1 ? true : false;
    }
  }

  async samityIdExist(id: number): Promise<boolean> {
    const {
      rows: [samityCount],
    } = await (
      await pgConnect.getConnection("slave")
    ).query(
      `
        SELECT COUNT(id) 
        FROM 
          temps.samity_info
        WHERE 
          id=$1;
      `,
      [id]
    );
    return parseInt(samityCount.count) >= 1 ? true : false;
  }

  async memberIdExist(id: number): Promise<boolean> {
    const {
      rows: [memberCount],
    } = await (
      await pgConnect.getConnection("slave")
    ).query(
      `
        SELECT COUNT(member_id) 
        FROM 
          temps.member_info
        WHERE 
          member_id=$1;
      `,
      [id]
    );
    return parseInt(memberCount.count) >= 1 ? true : false;
  }

  async glacIdExist(id: number): Promise<boolean> {
    const {
      rows: [glacIdCount],
    } = await (
      await pgConnect.getConnection("slave")
    ).query(
      `
        SELECT COUNT(id) 
        FROM 
          coop.glac_mst
        WHERE 
          id=$1;
      `,
      [id]
    );
    return parseInt(glacIdCount.count) >= 1 ? true : false;
  }

  async glacIdExistWithSamityId(id: number, samityId: number, financialYear: any, isIeBudget: string) {
    const {
      rows: [glacIdCount],
    } = await (
      await pgConnect.getConnection("slave")
    ).query(
      `
        SELECT COUNT(id) 
        FROM 
          temps.samity_gl_trans
        WHERE 
          glac_id=$1 AND samity_id=$2 AND financial_year=$3 AND is_ie_budget=$4
      `,
      [id, samityId, financialYear, isIeBudget]
    );
    return parseInt(glacIdCount.count) >= 1 ? true : false;
  }

  async glacIdExistWithSamityIdUpdate(
    id: number,
    samityId: number,
    financialYear: any,
    isIeBudget: string,
    tranId: number
  ) {
    const {
      rows: [glacIdCount],
    } = await (
      await pgConnect.getConnection("slave")
    ).query(
      `
        SELECT COUNT(glac_id) 
        FROM 
          temps.samity_gl_trans
        WHERE 
          glac_id=$1 AND samity_id=$2 AND financial_year=$3 AND is_ie_budget=$4 and id != $5;
      `,
      [id, samityId, financialYear, isIeBudget, tranId]
    );
    return parseInt(glacIdCount.count) >= 1 ? true : false;
  }

  async tranIdExist(id: number): Promise<boolean> {
    const {
      rows: [tranIdCount],
    } = await (
      await pgConnect.getConnection("slave")
    ).query(
      `
        SELECT COUNT(id) 
        FROM 
          temps.samity_gl_trans
        WHERE 
          id=$1;
      `,
      [id]
    );
    return parseInt(tranIdCount.count) >= 1 ? true : false;
  }

  async sameNameIdCheck(dataArray: any, nameId: string) {
    const nameIdArrays: any = [];
    dataArray.forEach((element: any) => {
      const id = Number(element[nameId]);
      nameIdArrays.push(id);
    });
    let hasDuplicates = (arr: any) => new Set(arr).size != arr.length;
    const allEqual = (arr: any) => arr.every((val: any) => val === arr[0]);
    return [hasDuplicates(nameIdArrays), allEqual(nameIdArrays)];
  }

  async findGlacNameByGlacId(glacId: number) {
    const sql = `SELECT glac_name FROM coop.glac_mst WHERE id=$1`;
    const glacName = (await (await pgConnect.getConnection("slave")).query(sql, [glacId])).rows[0].glac_name;
    return glacName;
  }

  async expenseOrIncomeMessage(budgetRole: string, orpCode: string) {
    return budgetRole
      ? budgetRole === "P" && orpCode === "EXP"
        ? `বর্তমান বাজেট এর ব্যায়ের অংশে`
        : budgetRole === "P" && orpCode === "INC"
        ? `বর্তমান বাজেট আয়ের অংশে`
        : budgetRole === "N" && orpCode === "EXP"
        ? `ভবিষৎ বাজেট এর ব্যায়ের অংশে`
        : budgetRole === "N" && orpCode === "INC"
        ? `ভবিষৎ বাজেট আয়ের অংশে`
        : "Some Thing Worng with Orpcode or Budget Role"
      : !budgetRole
      ? orpCode === "EXP"
        ? `ব্যায়ের অংশে`
        : orpCode === "INC"
        ? `আয়ের অংশে`
        : "something Went Wrong With Orpcode sss"
      : "something Went Wrong With Orpcode ddd";
  }
}
