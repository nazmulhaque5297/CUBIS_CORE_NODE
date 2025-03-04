/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-12-05 16:17:37
 * @modify date 2021-12-05 16:17:37
 * @desc [description]
 */

import { toCamelKeys, toSnakeCase } from "keys-transform";
import { emptyPaginationResponse, getPaginationDetails } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect as db, pgConnect } from "../../../../db-coop/factory/connection.db";
import { buildInsertSql, buildWhereAggrSql, buildWhereSql } from "../../../../utils/sql-builder.util";
import { CitizenRoleFeatureAttrs } from "../interfaces/citizen-role-feature.interface";

@Service()
export class CitizenRoleFeatureServices {
  constructor () {}

  async create (c: CitizenRoleFeatureAttrs) {
    const { sql, params } = buildInsertSql("users.role_feature", c);
    const {
      rows: [result],
    } = await (await pgConnect.getConnection()).query(sql, params);
    return toCamelKeys(result);
  }

  async get (page: number, limit: number, filter: CitizenRoleFeatureAttrs) {
    const pool = await db.getConnection();
    const filterKeys = Object.keys(filter);
    if (filterKeys.length > 0) {
      //build where condition dynamically to get updated count value after filtering
      const { sql: countSql, params: countParams } = buildWhereAggrSql(
        "SELECT COUNT(*) AS total FROM users.role_feature",
        filter,
        this.injectionFilter
      );

      const totalCount = await (await pool.query(countSql, countParams)).rows[0].total;
      const pagination = getPaginationDetails(page, totalCount, limit);
      if (pagination === undefined) return emptyPaginationResponse(page, limit);

      //build where condition dynamically to get data after filtering
      const { sql, params } = buildWhereSql(
        "SELECT * FROM users.role_feature",
        filter,
        pagination.skip,
        pagination.limit,
        this.injectionFilter
      );
      const result = await pool.query(sql, params);
      return {
        limit: limit,
        currentPage: page,
        totalPages: pagination.total ?? 0,
        count: totalCount,
        data: toCamelKeys(result.rows) as any,
      };
    } else {
      const countRes = await pool.query("SELECT COUNT(*) AS total FROM users.role_feature");
      const totalCount: number = countRes.rows[0].total;
      const pagination = getPaginationDetails(page, totalCount, limit);

      if (pagination === undefined) return emptyPaginationResponse(page, limit);
      const sql = `
        SELECT * FROM users.role_feature 
        LIMIT $1 
        OFFSET $2
        `;
      const result = await pool.query(sql, [pagination.limit, pagination.skip]);
      return {
        limit: limit,
        currentPage: page,
        totalPages: pagination.total ?? 0,
        count: totalCount,
        data: toCamelKeys(result.rows) as any,
      };
    }
  }

  // get role based features or menu
  async getRoleFeature (role: number): Promise<any | undefined> {
    const sql = `
     SELECT 
      c.id,  
      c.feature_name,
      c.feature_name_ban,
      c.url,
      c.is_root,
      c.type,
      c.position,
      c.icon_id,
      c.parent_id,
      c.serial_no
     FROM 
       users.role a
       INNER JOIN users.role_feature b ON a.id = b.role_id
       INNER JOIN users.feature c ON b.feature_id = c.id
     WHERE
       a.id = $1;`;
    const pool = await db.getConnection();
    const result = (await pool.query(sql, [role])).rows;
    var allData: any[] = [];
    var roots: any[] = result.filter(result => result.is_root == true);
    var children: any[] = [];
    var childOfChild: any[] = [];

    for (const [i, v] of roots.entries()) {
      allData.push(v);
      children = result.filter(result => result.parent_id == v.id);
      allData[i].child = children;
      for (const [ci, cv] of allData[i].child.entries()) {
        childOfChild = result.filter(result => result.parent_id == cv.id);
        if (childOfChild.length > 0) allData[i].child[ci].childOfChild = childOfChild;
      }
    }

    return allData ? toCamelKeys(allData) : undefined;
  }

  injectionFilter (key: string): string {
    return toSnakeCase(key);
  }
}
