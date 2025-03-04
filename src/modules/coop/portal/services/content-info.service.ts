import { toCamelKeys } from "keys-transform";
import { buildGetSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";

@Service()
export class ContentInfoServices {
  constructor() {}

  async getById(pageId: number | null) {
    const { queryText, values } = buildGetSql(["id", "content_name_bn"], "portal.content_info", { pageId });

    const data = (await (await pgConnect.getConnection("slave")).query(queryText, values)).rows;
    return data ? toCamelKeys(data) : {};
  }
}
