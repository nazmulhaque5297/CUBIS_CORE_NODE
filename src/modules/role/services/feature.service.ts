import { toCamelKeys, toSnakeCase } from "keys-transform";
import { buildSql } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../db/connection.db";
import { buildInsertSql, buildUpdateSql } from "../../../utils/sql-builder.util";
import { IFeatureAttrs } from "../interfaces/feature.interface";

@Service()
export default class FeatureService {
  constructor() { }
  // create a feature
  async create(data: IFeatureAttrs, componentId: number): Promise<IFeatureAttrs> {
    const pool = db.getConnection();
    let serialNoSql = ``;
    let serialNo;
    if (data.isRoot) {
      serialNoSql = `SELECT MAX(serial_no) from users.feature WHERE is_root = true`;
      serialNo = (await pool.query(serialNoSql)).rows[0].max;
    } else if (data.parentId) {
      serialNoSql = `SELECT MAX(serial_no) from users.feature WHERE parent_id = $1`;
      serialNo = (await pool.query(serialNoSql, [data.parentId])).rows[0].max;
    }
    let finalSerialNo = serialNo ? Number(serialNo) : 0;
    const { sql, params } = buildInsertSql("users.feature", {
      ...data,
      serialNo: ++finalSerialNo,
      componentId,
    });
    const result = await pool.query(sql, params);
    return result.rows[0] ? toCamelKeys(result.rows[0]) : {};
  }

  // get feature with pagination
  async get(isPagination: boolean, limit: number, offset: number, allQuery: object, componentId: number) {
    let queryText: string = "";
    let result;
    const pool = db.getConnection("slave");
    const sql: string = `SELECT 
                          * 
                        FROM 
                          users.feature`;

    if (Object.keys(allQuery).length > 0) {
      allQuery = { ...allQuery, componentId };
      const allQueryValues: any[] = Object.values(allQuery);
      const createSql = buildSql(sql, allQuery, "AND", this.injectionFilter, "id", limit, offset);
      const orderBy = `ORDER BY 
                        CASE WHEN serial_no IS NULL THEN id ELSE serial_no END * 1000 + id ASC`;
      const queryText = isPagination ? createSql[0] : createSql[1] + orderBy;

      result = (await pool.query(queryText, allQueryValues)).rows;
    } else {
      // queryText = isPagination
      //   ? `SELECT 
      //       * 
      //     FROM 
      //       users.feature
      //     WHERE 
      //       component_id = $1
      //     ORDER BY id, parent_id, serial_no ASC
      //     LIMIT $2 
      //     OFFSET $3`
      //   : `SELECT 
      //       * 
      //     FROM 
      //       users.feature 
      //     WHERE 
      //       component_id = $1
      //     ORDER BY id, parent_id, serial_no ASC`;
      queryText = isPagination
        ? `SELECT f1.*, f2.feature_name_ban AS ParentName
      FROM USERS.FEATURE AS f1
      LEFT JOIN USERS.FEATURE AS f2 ON f1.PARENT_ID = f2.ID
      WHERE f1.COMPONENT_ID = $1
      ORDER BY f1.ID, f1.PARENT_ID, f1.SERIAL_NO ASC
        LIMIT $2 
        OFFSET $3`
        : `SELECT f1.*, f2.feature_name_ban AS ParentName
      FROM USERS.FEATURE AS f1
      LEFT JOIN USERS.FEATURE AS f2 ON f1.PARENT_ID = f2.ID
      WHERE f1.COMPONENT_ID = $1
      ORDER BY f1.ID, f1.PARENT_ID, f1.SERIAL_NO ASC`;
      
      result = (await pool.query(queryText, isPagination ? [componentId, limit, offset] : [componentId])).rows;
    }

    return result.length > 0 ? toCamelKeys(result) : [];
  }

  // update feature by id
  async update(id: number, data: IFeatureAttrs): Promise<IFeatureAttrs> {
    const { sql, params } = buildUpdateSql("users.feature", id, { ...data });
    const pool = db.getConnection();
    const result = await pool.query(sql, params);
    return toCamelKeys(result.rows[0]);
  }

  // get role based features
  async getRoleFeature(role?: number): Promise<IFeatureAttrs | undefined> {
    let sql;
    let result;
    const pool = db.getConnection();
    if (role) {
      sql = `SELECT 
              b.* 
            FROM 
              users.role_feature AS a, 
              users.feature AS b 
            WHERE 
              a.feature_id = b.id AND 
              a.role_id = $1 AND
              b.is_active = true
            ORDER BY 
              b.serial_no ASC`;
      result = (await pool.query(sql, [role])).rows;
    } else {
      sql = `SELECT 
              * 
            FROM 
              users.feature 
            ORDER BY 
              serial_no ASC`;
      result = (await pool.query(sql)).rows;
    }
    var allData: any[] = [];
    var roots: any[] = result.filter((result) => result.is_root == true);
    var childs: any[] = [];
    var childOfChild: any[] = [];

    for (const [i, v] of roots.entries()) {
      allData.push(v);
      childs = result.filter((result) => result.parent_id == v.id);
      allData[i].child = childs;
      for (const [ci, cv] of allData[i].child.entries()) {
        childOfChild = result.filter((result) => result.parent_id == cv.id);
        if (childOfChild.length > 0) allData[i].child[ci].childOfChild = childOfChild;
      }
    }

    return allData ? toCamelKeys(allData) : undefined;
  }

  // delete feature by id
  async delete(id: number): Promise<IFeatureAttrs> {
    const sql = `UPDATE users.feature SET is_active = false WHERE id = $1 RETURNING *`;
    const pool = db.getConnection();
    const result = await pool.query(sql, [id]);
    return toCamelKeys(result.rows[0]);
  }

  async getByUserId(userId: number, doptorId: number, componentId: number) {
    const query = `
      select distinct 
        e.*
      from
        users."user" a
      inner join users.user_role b on
        a.id = b.user_id
      inner join users."role" c on
        c.id = b.role_id
      inner join users.role_feature d on
        d.role_id = c.id
      inner join users.feature e on
        e.id = d.feature_id
      where
        a.id = $1 and 
        c.doptor_id = $2 and 
        c.is_active = $3 and 
        c.approve_status = $4 and 
        c.component_id = $5
        `;

    const params = [userId, doptorId, true, "A", componentId];

    const pool = await db.getConnection();
    const result = await pool.query(query, params);
    return toCamelKeys(result.rows) as IFeatureAttrs[];
  }

  async count(allQuery: object) {
    const pool = db.getConnection("slave");
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM users.feature";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = buildSql(sql, allQuery, "AND", this.injectionFilter, "id")[1];
      var result = (await pool.query(queryText, allQueryValues)).rows[0].count;
    } else {
      queryText = "SELECT COUNT(id) FROM users.feature";
      result = (await pool.query(queryText)).rows[0].count;
    }
    return result ? result : 0;
  }

  async featureCodeConversion(featureCode: string) {
    let banglaNumber: any = {
      0: "০",
      1: "১",
      2: "২",
      3: "৩",
      4: "৪",
      5: "৫",
      6: "৬",
      7: "৭",
      8: "৮",
      9: "৯",
    };
    let splitFeatureCode = featureCode.split(".");
    let finalCode = ``;
    for (let singleCodePart of splitFeatureCode) {
      for (var x in banglaNumber) {
        singleCodePart = singleCodePart.toString()?.replace(new RegExp(x, "g"), banglaNumber[x]);
      }
      finalCode = String(finalCode) + String(singleCodePart) + ".";
    }
    finalCode = finalCode.slice(0, -1);
    return finalCode;
  }
  // keys injection filter
  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }
}
