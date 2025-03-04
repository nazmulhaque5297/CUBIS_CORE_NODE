import { toCamelKeys, toSnakeCase } from "keys-transform";
import { buildSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { buildInsertSql, buildUpdateSql } from "../../../../utils/sql-builder.util";
import { memberAreaAttrs } from "../interfaces/init/init-samity-info.interface";

@Service()
export class MemberAreaServices {
  constructor() {}

  async get(isPagination: boolean, limit: number, offset: number, allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT * FROM temps.member_area";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      const createSql = buildSql(sql, allQuery, "AND", this.filter, "id", limit, offset);
      queryText = isPagination ? createSql[0] : createSql[1];

      var memberArea = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = isPagination
        ? "SELECT * FROM temps.member_area ORDER BY id LIMIT $1 OFFSET $2"
        : "SELECT * FROM temps.member_area ORDER BY id ";
      memberArea = await (await pgConnect.getConnection("slave")).query(queryText, isPagination ? [limit, offset] : []);
    }

    return memberArea.rows;
  }

  //create new memberArea
  async create(data: memberAreaAttrs): Promise<memberAreaAttrs | {}> {
    const { sql, params } = buildInsertSql("temps.member_area", {
      ...data,
    });
    const result = await (await pgConnect.getConnection("master")).query(sql, params);

    return result.rows[0] ? toCamelKeys(result.rows[0]) : {};
  }

  // update feature by id
  async update(id: number, data: memberAreaAttrs): Promise<memberAreaAttrs | {}> {
    const { sql, params } = buildUpdateSql("temps.member_area", id, {
      ...data,
    });
    const {
      rows: [updateResult],
    } = await (await pgConnect.getConnection("master")).query(sql, params);
    return updateResult ? toCamelKeys(updateResult) : {};
  }

  async delete(id: number): Promise<memberAreaAttrs | {}> {
    const sql = `DELETE FROM temps.member_area WHERE id = $1 RETURNING *`;
    const result = await (await pgConnect.getConnection("master")).query(sql, [id]);

    return result.rows[0] ? toCamelKeys(result.rows[0]) : {};
  }

  async count(allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM temps.member_area";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = await buildSql(sql, allQuery, "AND", this.filter, "id")[1];
      var result = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM temps.member_area";
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
                FROM temps.member_area
                WHERE id = $1
              `,
        [id]
      );
      return parseInt(feature[0].count) >= 1 ? true : false;
    }
  }

  async clean(obj: any) {
    for (var propName in obj) {
      if (obj[propName] === null || obj[propName] === undefined || obj[propName] === "" || obj[propName] === "") {
        delete obj[propName];
      }
    }
    return obj;
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

  async isExistSamityId(samityId: number) {
    const sql = ` SELECT COUNT(id) 
    FROM 
      temps.samity_info
    WHERE 
    id=$1`;
    const result = (await (await pgConnect.getConnection("slave")).query(sql, [samityId])).rows[0].count;

    return result >= 1 ? true : false;
  }
}
