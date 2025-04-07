import { toCamelKeys } from "keys-transform";
import { BadRequestError, buildSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { buildInsertSql, buildUpdateSql } from "../../../../utils/sql-builder.util";
import { workingAreaAttrs } from "../interfaces/working-area.interface";

@Service()
export class WorkingAreaServices {
  constructor() {}

  async get(isPagination: boolean, limit: number, offset: number, allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT * FROM temps.working_area";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      const createSql = buildSql(sql, allQuery, "AND", this.filter, "id ", limit, offset);
      const queryText = isPagination ? createSql[0] : createSql[1];

      var features = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = isPagination
        ? "SELECT * FROM temps.working_area ORDER BY id  LIMIT $1 OFFSET $2"
        : "SELECT * FROM temps.working_area ORDER BY id ";

      features = await (await pgConnect.getConnection("slave")).query(queryText, isPagination ? [limit, offset] : []);
    }

    return features.rows;
  }

  async workingAreaBySamityId(samityId: any) {
    const sql = `select * from temps.working_area where samity_id=$1`;
    const result = (await (await pgConnect.getConnection("slave")).query(sql, [samityId])).rows;

    return result ? toCamelKeys(result) : result;
  }

  //create new workingArea
  async create(data: workingAreaAttrs): Promise<workingAreaAttrs> {
    const { sql, params } = buildInsertSql("temps.working_area", {
      ...data,
    });
    const result = await (await pgConnect.getConnection("master")).query(sql, params);
    return toCamelKeys(result.rows[0]);
  }

  // update feature by id
  async update(id: number, data: workingAreaAttrs): Promise<workingAreaAttrs> {
    const { sql, params } = buildUpdateSql("temps.working_area", id, {
      ...data,
    });
    const {
      rows: [updateResult],
    } = await (await pgConnect.getConnection("master")).query(sql, params);
    return toCamelKeys(updateResult);
  }

  async delete(id: number): Promise<workingAreaAttrs | null> {
    const sql = `DELETE FROM temps.working_area WHERE id = $1 RETURNING id`;
    const result = await (await pgConnect.getConnection("master")).query(sql, [id]);

    return result.rows ? toCamelKeys(result.rows) : null;
  }

  async deleteArr(deleteArr: any[]) {
    const sql = `DELETE FROM temps.working_area WHERE id = $1 RETURNING id`;
    const returnData = [];
    for (const element of deleteArr) {
      const result = (await (await pgConnect.getConnection("master")).query(sql, [element.id])).rows;
      returnData.push(result);
    }
    return returnData ? toCamelKeys(returnData) : returnData;
  }
  async count(allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM temps.working_area";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = buildSql(sql, allQuery, "AND", this.filter, "id")[1];

      var result = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM temps.working_area";
      result = await (await pgConnect.getConnection("slave")).query(queryText);
    }
    return result.rows[0].count;
  }

  filter(key: string) {
    switch (key) {
      case "workingAreaId":
        return "id";
      case "samityId":
        return "samity_id,";
      case "divisionId":
        return "division_id";
      case " upazilaId":
        return " upazila_id";
      case "cityCorpId":
        return "city_corp_id";
      case "unionId":
        return "union_id";
      case "detailsAddress":
        return "details_address";
      case "status":
        return "status";

      default:
        throw new BadRequestError("Inavlid Request");
    }
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
                FROM temps.working_area
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
}
