import { toCamelKeys } from "keys-transform";
import { buildGetSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../../db-coop/factory/connection.db";
import { buildInsertSql } from "../../../../../utils/sql-builder.util";
import { nameClearanceInput } from "../../interfaces/coop/name-clearance.interface";

@Service()
export class NameClearanceServices {
  constructor() {}

  async post(data: nameClearanceInput) {
    const { sql, params } = buildInsertSql("coop.name_clearance", {
      ...data,
    });

    const result = (await (await pgConnect.getConnection("master")).query(sql, params)).rows[0];
    return result ? toCamelKeys(result) : {};
  }

  async getByuserId(userId: number) {
    const queryText = `SELECT * FROM coop.name_clearance WHERE user_id=$1`;
    const result = (await (await pgConnect.getConnection("slave")).query(queryText, [userId])).rows;

    return result ? toCamelKeys(result) : {};
  }

  async getByIds(queryParams: any) {
    const { queryText, values } = buildGetSql(["*"], "coop.name_clearance", queryParams);
    const result = (await (await pgConnect.getConnection("slave")).query(queryText, values)).rows;
    return result ? toCamelKeys(result) : {};
  }

  // async isSamityNameExist(samityName: string) {
  //   const sql = `SELECT id FROM coop.application WHERE data->>'samity_name'=$1`;
  //   const record = await (
  //     await (await pgConnect.getConnection("slave")).query(sql, [samityName])
  //   ).rows;
  //   return record.length > 0 ? true : false;
  // }

  async isSamityNameExist(samityName: string, officeId: number, samityTypeId: number) {
    const queryText = ` select
    count(id)
  from
    coop.application
  where
    service_id = 1 and status != 'R'
    and data->'office_id' =$1
    and data->'samity_type_id' =$2
    and data->>'samity_name'=$3`;
    const result = await (
      await (await pgConnect.getConnection("slave")).query(queryText, [officeId, samityTypeId, samityName])
    ).rows[0];
    const sqlCoop = `select
      count(id)
    from
      coop.samity_info
    where
      office_id = $1
      and samity_type_id = $2
      and samity_name= $3 `;
    const samityNameResult = await (
      await (await pgConnect.getConnection("slave")).query(sqlCoop, [officeId, samityTypeId, samityName])
    ).rows[0];

    return result.count == 0 && samityNameResult.count == 0 ? false : true;
  }
  async isSamityNameExistUpdate(samityName: string, officeId: number, samityTypeId: number, applicationId: number) {
    const queryText = ` select
    count(id)
  from
    coop.application
  where
    service_id = 1 and status != 'R'
    and data->'office_id' =$1
    and data->'samity_type_id' =$2
    and data->>'samity_name'=$3
    and id!=$4`;
    const result = await (
      await (
        await pgConnect.getConnection("slave")
      ).query(queryText, [officeId, samityTypeId, samityName, applicationId])
    ).rows[0];

    const sqlCoop = `select
      count(id)
    from
      coop.samity_info
    where
      office_id = $1
      and samity_type_id = $2
      and samity_name= $3 `;
    const samityNameResult = await (
      await (await pgConnect.getConnection("slave")).query(sqlCoop, [officeId, samityTypeId, samityName])
    ).rows[0];

    return result.count == 0 && samityNameResult.count == 0 ? false : true;
  }
}
