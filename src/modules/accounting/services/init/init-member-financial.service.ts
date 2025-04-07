import { BadRequestError, buildSql } from "rdcd-common";
import Container, { Service } from "typedi";
import { pgConnect } from "../../../../../db-coop/factory/connection.db";
import { buildInsertSql, buildUpdateSql } from "../../../../../utils/sql-builder.util";
import { memberFinancialAttrs } from "../../interfaces/init/init-member-financial.interface";

import { toCamelKeys, toSnakeCase } from "keys-transform";
import { isExistsByColumn } from "../../../../../utils/service.utils";
import { RegistrationStepServices } from "../reg-steps.service";

@Service()
export class MemberFinancialServices {
  constructor() {}

  async getValue(samityId: number, query: any) {
    // //console.log(
    //   "query",
    //   Object.keys(query).length === 0 && query.constructor === Object
    // );
    if (query.getType == "centralSamity") {
      const query = `select 
                    A.samity_no_of_share,
                    A.samity_share_amount,
                    A.samity_savings_amount,
                    A.samity_loan_outstanding,
                    B.ref_samity_id,
                    B.samity_name,
                    B.samity_code
                  from
                  (
                  select
                          samity_id,
                          sum(no_of_share) as samity_no_of_share,
                          sum(share_amount) as samity_share_amount,
                          sum(savings_amount) as samity_savings_amount,
                          sum(loan_outstanding) as samity_loan_outstanding
                            from
                            coop.member_financial_info
                            group by
                            samity_id
                      ) A ,
                      (
                  select  
                     a.ref_samity_id,
                     b.samity_name,
                     b.samity_code
                  from
                  temps.member_info a
                  inner join coop.samity_info b on
                  a.ref_samity_id = b.id
                  where
                  a.samity_id = $1 and a.is_active=true) B
                  where
                  A.samity_id = B.ref_samity_id`;

      const result = (await pgConnect.getConnection("slave")).query(query, [samityId]);

      return result ? toCamelKeys((await result).rows) : result;
    } else if (query.getType == "nationalSamity") {
      const query = `select
                         C.samity_id,
                         D.member_name,
                         D.samity_code,
                         C.samity_no_of_share,
                         C.samity_share_amount,
                         C.samity_savings_amount,
                         C.samity_loan_outstanding
                       from
                         (
                         select
                           B.samity_id,
                           sum(A.samity_no_of_share) as samity_no_of_share,
                           sum(A.samity_share_amount) as samity_share_amount,
                           sum(A.samity_savings_amount) as samity_savings_amount,
                           sum(A.samity_loan_outstanding) as samity_loan_outstanding
                         from
                           (
                           select
                             samity_id,
                             sum(no_of_share) as samity_no_of_share,
                             sum(share_amount) as samity_share_amount,
                             sum(savings_amount) as samity_savings_amount,
                             sum(loan_outstanding) as samity_loan_outstanding
                           from
                             coop.member_financial_info
                           group by
                             samity_id) A,
                           (
                           select
                             samity_id,
                             ref_samity_id
                           from
                             coop.member_info ) B
                         where
                           A.samity_id = B.ref_samity_id
                         group by
                           B.samity_id ) C ,
                         (
                         select
                           a.member_name,
                           a.samity_id,
                           a.ref_samity_id,
                           b.samity_code
                         from
                           temps.member_info a
                         inner join coop.samity_info b on
                           b.id = a.ref_samity_id
                         where
                           a.samity_id = $1 and a.is_active=true ) D
                       where
                         C.samity_id = D.ref_samity_id`;

      const result = (await pgConnect.getConnection("slave")).query(query, [samityId]);

      return result ? toCamelKeys((await result).rows) : result;
    } else if (Object.keys(query).length === 0 && query.constructor === Object) {
      const queryText = `select mfi.id,mi.member_code,mi.nid,mi.member_name,mi.member_name_bangla,mi.father_name,mfi.member_id,mfi.samity_id,no_of_share,share_amount,savings_amount,loan_outstanding 
      from temps.member_financial_info as mfi left join temps.member_info as mi
      on mfi.member_id = mi.id where mfi.samity_id=$1 and mi.is_active=true`;
      const memberIdOfSameSamity = await (await pgConnect.getConnection("slave")).query(queryText, [samityId]);
      return memberIdOfSameSamity ? toCamelKeys(memberIdOfSameSamity.rows) : {};
    }
  }

  async get(isPagination: boolean, limit: number, offset: number, allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT * FROM temps.member_financial_info";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      const createSql = buildSql(sql, allQuery, "AND", this.filter, "member_financial_id", limit, offset);
      queryText = isPagination ? createSql[0] : createSql[1];

      var memberArea = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = isPagination
        ? "SELECT * FROM temps.member_financial_info ORDER BY member_financial_id LIMIT $1 OFFSET $2"
        : "SELECT * FROM temps.member_financial_info ORDER BY member_financial_id ";
      memberArea = await (await pgConnect.getConnection("slave")).query(queryText, isPagination ? [limit, offset] : []);
    }

    return memberArea.rows;
  }

  //create new memberArea
  async create(data: memberFinancialAttrs): Promise<memberFinancialAttrs | {}> {
    const { sql, params } = buildInsertSql("temps.member_financial_info", {
      ...data,
    });

    const result = await (await pgConnect.getConnection("master")).query(sql, params);
    return result.rows[0] ? toCamelKeys(result.rows[0]) : {};
  }

  // update feature by id
  async update(memberFinancialId: number, samityId: number, data: memberFinancialAttrs): Promise<memberFinancialAttrs> {
    const transaction = await (await pgConnect.getConnection("master")).connect();

    try {
      transaction.query("BEGIN");
      const { sql, params } = buildUpdateSql("temps.member_financial_info", memberFinancialId, {
        ...data,
      });

      const updateResult = await transaction.query(sql, params);

      if (memberFinancialId) {
        const RegistrationStepService = Container.get(RegistrationStepServices);
        const regStepResult = await RegistrationStepService.updateSteps(samityId, transaction, 5, data.updatedBy);
      }

      transaction.query("COMMIT");
      return updateResult?.rows[0];
    } catch (ex: any) {
      transaction.query("ROLLBACK");
      throw new BadRequestError(ex);
    } finally {
      transaction.release();
    }
  }

  async delete(id: number): Promise<{}> {
    const sql = `DELETE FROM temps.member_financial_info WHERE member_financial_id = $1 RETURNING *`;
    const result = await (await pgConnect.getConnection("slave")).query(sql, [id]);
    return toCamelKeys(result.rows[0]);
  }

  async count(allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT( member_financial_id) FROM temps.member_financial_info";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = await buildSql(sql, allQuery, "AND", this.filter, "member_financial_id")[1];
      var result = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT( member_financial_id) FROM temps.member_financial_info";
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
                SELECT COUNT(member_financial_id) 
                FROM temps.member_financial_info
                WHERE member_financial_id = $1
              `,
        [id]
      );
      return parseInt(feature[0].count) >= 1 ? true : false;
    }
  }

  async samityIdExist(id: number): Promise<Boolean> {
    return await isExistsByColumn("id", "temps.samity_info", await pgConnect.getConnection("slave"), { id });
  }

  async isMemberIdAlginWithSamityId(id: number, samityId: number) {
    // //console.log("hi i am in isMemberIdAlginWithSamityId");
    // //console.log(id, samityId);
    // //console.log(
    //   await isExistsByColumn(
    //     "id",
    //     "temp.member_info",
    //     await (await pgConnect.getConnection("slave")).connect(),
    //     { id, samityId }
    //   )
    // );

    return await isExistsByColumn("id", "temps.member_info", await pgConnect.getConnection("slave"), { id, samityId });
  }
  async isMemberIdExistInDb(memberId: number, samityId: number) {
    // //console.log("hi i am in isMemberIdExistInDb");
    // //console.log(memberId, samityId);
    // //console.log(
    //   await isExistsByColumn(
    //     "id",
    //     "temp.member_financial_info",
    //     await (await pgConnect.getConnection("slave")).connect(),
    //     { memberId, samityId }
    //   )
    // );

    return await isExistsByColumn("id", "temps.member_financial_info", await pgConnect.getConnection("slave"), {
      memberId,
      samityId,
    });
  }

  async memberIdExistUpdate(memberId: number, samityId: number): Promise<any> {
    const {
      rows: [memberCount],
    } = await (
      await pgConnect.getConnection("slave")
    ).query(
      `
        SELECT COUNT(id) 
        FROM 
          temps.member_info
        WHERE 
          id=$1 AND samity_id=$2; 
      `,
      [memberId, samityId]
    );

    if (parseInt(memberCount.count) >= 1) {
      const {
        rows: [memberCountInSamityTransaction],
      } = await (
        await pgConnect.getConnection("slave")
      ).query(
        `
          SELECT COUNT(member_id) 
          FROM 
          temps.member_financial_info
          WHERE 
            member_id=$1 AND samity_id=$2; 
        `,
        [memberId, samityId]
      );
      return parseInt(memberCountInSamityTransaction.count) == 1 ? true : false;
    } else {
      return false;
    }
  }

  async memberFinancialIdExist(memberFinancialId: number) {
    const queryText = ` SELECT COUNT(id)  FROM temps.member_financial_info WHERE  id=$1;`;
    const count = await (await pgConnect.getConnection("slave")).query(queryText, [memberFinancialId]);
    return count.rows[0].count >= 1 ? true : false;
  }

  // To check Same Id check when we send the json Data like samityId,memberID

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
}
