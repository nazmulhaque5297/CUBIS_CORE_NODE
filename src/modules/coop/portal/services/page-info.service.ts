import { toSnakeCase } from "keys-transform";
import { buildSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";

@Service()
export class PageInfoServices {
  constructor() {}

  async get(isPagination: boolean, limit: number, offset: number, allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT * FROM portal.page_info";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      const createSql = buildSql(sql, allQuery, "AND", this.filter, "id ", limit, offset);
      const queryText = isPagination ? createSql[0] : createSql[1];
      var features = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = isPagination
        ? "SELECT * FROM portal.page_info ORDER BY id  LIMIT $1 OFFSET $2"
        : "SELECT * FROM portal.page_info ORDER BY id ";
      features = await (await pgConnect.getConnection("slave")).query(queryText, isPagination ? [limit, offset] : []);
    }

    return features.rows;
  }

  async count(allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM portal.page_info";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = await buildSql(sql, allQuery, "AND", this.filter, "id")[1];
      var result = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM portal.page_info";
      result = await (await pgConnect.getConnection("slave")).query(queryText);
    }
    return result.rows[0].count;
  }

  filter(key: string) {
    return toSnakeCase(key);
  }
}
