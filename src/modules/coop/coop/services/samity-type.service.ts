import { toSnakeCase } from "keys-transform";
import { buildSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { isExistsByColumn } from "../../../../utils/service.utils";

@Service()
export default class SamityTypeServices {
  async get(isPagination: boolean, limit: number, offset: number, allQuery: any, doptorId: number) {
    var queryText: string = "";
    const sql: string = "SELECT * FROM coop.samity_type";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      const createSql = buildSql(sql, allQuery, "AND", this.filter, "id", limit, offset);
      const queryText = isPagination ? createSql[0] : createSql[1];
      var features = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = isPagination
        ? "SELECT * FROM coop.samity_type where doptor_id=$3 ORDER BY id LIMIT $1 OFFSET $2"
        : "SELECT * FROM coop.samity_type where doptor_id=$1 ORDER BY id";
      features = await (
        await pgConnect.getConnection("slave")
      ).query(queryText, isPagination ? [limit, offset, doptorId] : [doptorId]);
    }

    return features.rows;
  }

  async count(allQuery: any, doptorId: number) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM coop.samity_type";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = buildSql(sql, allQuery, "AND", this.filter, "id")[1];
      var result = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM coop.samity_type WHERE doptor_id=$1";
      result = await (await pgConnect.getConnection("slave")).query(queryText, [doptorId]);
    }
    return result.rows[0].count;
  }

  async idCheck(id: any) {
    // const pool = await (await pgConnect.getConnection("master")).connect();
    return await isExistsByColumn("id", "coop.samity_type", await pgConnect.getConnection("slave"), { id });
  }

  filter(key: string) {
    return toSnakeCase(key);
  }
}
