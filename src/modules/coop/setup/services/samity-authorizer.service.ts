import { toCamelKeys } from "keys-transform";
import _ from "lodash";
import { BadRequestError, buildGetSql, buildInsertSql, buildUpdateSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";

@Service()
export class samityAuthorizerServices {
  constructor() {}

  async getBySamityId(samityId: number) {
    try {
      const sql = `SELECT
      a.id,
      a.member_id,
      b.member_name AS authorize_person_name,
      b.member_name_bangla AS authorize_person_name_bangla,
      a.effect_date
  FROM
      coop.samity_authorized_person a
  INNER JOIN coop.member_info b ON
      a.member_id = b.id
  WHERE
      a.samity_id = $1 and a.status=true`;
      const result = (await (await pgConnect.getConnection("slave")).query(sql, [samityId])).rows[0];
      return result ? toCamelKeys(result) : [];
    } catch (ex: any) {
      throw new BadRequestError(ex);
    }
  }

  async create(data: any, user: any) {
    let result = [];

    const transaction = await (await pgConnect.getConnection("master")).connect();

    try {
      transaction.query("BEGIN");

      for (const element of data) {
        if (parseInt(element.id) == 0 && element.status) {
          const { queryText, values } = buildGetSql(["nid", "brn"], "coop.member_info", { id: element.memberId });
          // console.log({ queryText, values });
          const memberResult = await (await transaction.query(queryText, values)).rows[0];
          const citizenSql = `select id from users.user where nid=$1 or brn=$2`;

          const citizenResult = await (
            await transaction.query(citizenSql, [memberResult.nid, memberResult.brn])
          ).rows[0];

          const { sql, params } = buildInsertSql("coop.samity_authorized_person", {
            ..._.omit(element, "id"),
            createdBy: user.userId,
            createdAt: new Date(),
            effectDate: new Date(),
            nid: memberResult.nid ? memberResult.nid : null,
            brn: memberResult.brn ? memberResult.brn : null,
            userId: citizenResult ? citizenResult.id : null,
          });

          // console.log(sql, params);

          const authorizerSetupResult = await (await transaction.query(sql, params)).rows[0];

          result.push(authorizerSetupResult);
        } else if (element.id > 0 && !element.status) {
          const { sql, params } = buildUpdateSql(
            "coop.samity_authorized_person",
            element.id,
            {
              ..._.omit(element, "id"),
              expireDate: new Date(),
              updatedBy: user.userId,
              updatedAt: new Date(),
            },
            "id"
          );

          const authorizerSetupResult = await (await transaction.query(sql, params)).rows[0];

          result.push(authorizerSetupResult);
        }
      }

      await transaction.query("COMMIT");
      return result ? toCamelKeys(result) : result;
    } catch (error) {
      console.log("error", error);
      await transaction.query("ROLLBACK");

      return undefined;
    } finally {
      transaction.release();
    }
  }
}
