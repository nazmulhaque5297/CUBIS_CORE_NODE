import { toCamelKeys } from "keys-transform";
import { BadRequestError } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { minioPresignedGet } from "../../../../utils/minio.util";

@Service()
export class PageValueServices {
  constructor() {}

  async get(samityId: number) {
    try {
      const sql = `Select * from portal.page_data where samity_id = $1 and status = true`;

      const result = (await (await pgConnect.getConnection("slave")).query(sql, [samityId])).rows[0];

      const committeeInfoSql = `SELECT * FROM coop.committee_info WHERE status = 'A' and samity_id=$1`;
      const committeeInfoDataResult = (
        await (await pgConnect.getConnection("slave")).query(committeeInfoSql, [samityId])
      ).rows[0];
      result.data.committeeInfoData = committeeInfoDataResult
        ? toCamelKeys(committeeInfoDataResult)
        : committeeInfoDataResult;

      const committeeMemberSql = `select 
      b.committee_id,
      b.committee_role_id,
      b.status,
          d.member_name,
          d.member_name_bangla,
          d.member_photo,
          d.member_sign,
          c.role_name
from coop.committee_info a, coop.committee_member b, master.committee_role c, coop.member_info d
where a.samity_id = b.samity_id
and a.id = b.committee_id
and a.status = 'A'
and b.committee_role_id = c.id
and b.member_id = d.id
and a.samity_id = $1
order by b.committee_role_id`;
      const committeeMembers = (await (await pgConnect.getConnection("slave")).query(committeeMemberSql, [samityId]))
        .rows;

      const memberDetailsWithPhoto = [];

      if (committeeMembers && committeeMembers.length > 0) {
        for (const e of committeeMembers) {
          memberDetailsWithPhoto.push(await minioPresignedGet(toCamelKeys(e), ["memberPhoto", "memberSign"]));
        }
      }

      result.data.committeeMemberWithPhoto = memberDetailsWithPhoto;

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
      const budgetResult = (await (await pgConnect.getConnection("slave")).query(budgetSql, [samityId])).rows;
      result.data.mainBudgetData = budgetResult ? toCamelKeys(budgetResult) : budgetResult;

      return result ? toCamelKeys(result) : {};
    } catch (ex: any) {
      throw new BadRequestError(ex);
    }
  }
}
