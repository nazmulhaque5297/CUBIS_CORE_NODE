/**
 * @author Md Hasibuzzaman
 * @email hasib.9437.hu@gmail.com
 * @create date 2022-07-3 10.50.00
 * @modify date 2022-07-3 10.50.00
 * @desc [description]
 */

import { toCamelKeys } from "keys-transform";
import { buildUpdateSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../../db-coop/factory/connection.db";

@Service()
export class SubscribeService {
  constructor() {}

  async getSubscribe(samityId: number): Promise<any | null> {
    const samityTypeSql = `select subscribe from coop.samity_info where id=$1`;
    const samityTypeResult = (await (await pgConnect.getConnection("slave")).query(samityTypeSql, [samityId])).rows[0];
    if (samityTypeResult) {
      return toCamelKeys(samityTypeResult);
    } else {
      return toCamelKeys({});
    }
  }

  async putSubscribe(data: any): Promise<any | null> {
    const { sql, params } = buildUpdateSql(
      "coop.samity_info",
      data.id,
      {
        subscribe: data.subscribe,
      },
      "id"
    );

    const samityTypeResult = (await (await pgConnect.getConnection("master")).query(sql, params)).rows[0];

    if (samityTypeResult) {
      return toCamelKeys(samityTypeResult);
    } else {
      return toCamelKeys({});
    }
  }
}
