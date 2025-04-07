import { toSnakeCase } from "keys-transform";
import { buildSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";

@Service()
export class GlacMasterServices {
  constructor() {}
  async get(isPagination: boolean, limit: number, offset: number, allQuery: object, doptorId: number) {
    var queryText: string = "";
    const sql: string = "SELECT * FROM coop.glac_mst";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      const createSql = buildSql(sql, allQuery, "AND", this.filter, "id", limit, offset);
      queryText = isPagination ? createSql[0] : createSql[1];

      var memberArea = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = isPagination
        ? "SELECT * FROM coop.glac_mst where doptor_id=$1 ORDER BY id LIMIT $2 OFFSET $3"
        : "SELECT * FROM coop.glac_mst where doptor_id=$1  ORDER BY id ";
      memberArea = await (
        await pgConnect.getConnection("slave")
      ).query(queryText, isPagination ? [doptorId, limit, offset] : [doptorId]);
    }

    return memberArea.rows;
  }

  async count(allQuery: object, doptorId: number) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM coop.glac_mst";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = await buildSql(sql, allQuery, "AND", this.filter, "id")[1];
      var result = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM coop.glac_mst where doptor_id=$1 ";
      result = await (await pgConnect.getConnection("slave")).query(queryText, [doptorId]);
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
                SELECT COUNT(glac_id) 
                FROM coop.glac_mst
                WHERE id = $1
              `,
        [id]
      );
      return parseInt(feature[0].count) >= 1 ? true : false;
    }
  }
}
