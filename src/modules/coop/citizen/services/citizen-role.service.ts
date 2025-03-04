/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-12-05 11:41:26
 * @modify date 2021-12-05 11:41:26
 * @desc [description]
 */

import { toCamelKeys, toSnakeCase } from "keys-transform";
import {
  NotFoundError,
  buildInsertSql,
  buildUpdateWithWhereSql,
  buildWhereAggrSql,
  buildWhereSql,
  emptyPaginationResponse,
  getPaginationDetails,
} from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { IFeatureAttrs } from "../../../../modules/role/interfaces/feature.interface";
import { IPaginationResponse } from "../../../../types/interfaces/pagination.interface";
import { CitizenRoleAttrs } from "../interfaces/citizen-role.interface";

@Service()
export class CitizenRoleServices {
  constructor() {}

  async get(page: number, limit: number, filter: CitizenRoleAttrs): Promise<IPaginationResponse> {
    const pool = await pgConnect.getConnection();
    const filterKeys = Object.keys(filter);
    if (filterKeys.length > 0) {
      //build where condition dynamically to get updated count value after filtering
      const { sql: countSql, params: countParams } = buildWhereAggrSql(
        "SELECT COUNT(*) AS total FROM users.role",
        filter,
        this.injectionFilter
      );

      const totalCount = await (await pool.query(countSql, countParams)).rows[0].total;
      const pagination = getPaginationDetails(page, totalCount, limit);
      if (pagination === undefined) return emptyPaginationResponse(page, limit);

      //build where condition dynamically to get data after filtering
      const { sql, params } = buildWhereSql(
        "SELECT * FROM users.role",
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
      const countRes = await pool.query("SELECT COUNT(*) AS total FROM users.role");
      const totalCount: number = countRes.rows[0].total;
      const pagination = getPaginationDetails(page, totalCount, limit);

      if (pagination === undefined) return emptyPaginationResponse(page, limit);
      const sql = `
        SELECT * FROM users.role 
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

  async create(data: CitizenRoleAttrs): Promise<CitizenRoleAttrs> {
    const { sql, params } = buildInsertSql("users.role", {
      ...data,
    });
    const pool = await pgConnect.getConnection();
    const result = await pool.query(sql, params);
    return toCamelKeys(result.rows[0]);
  }

  async update(conditions: any, updates: CitizenRoleAttrs): Promise<CitizenRoleAttrs> {
    const client = await (await pgConnect.getConnection()).connect();

    const { sql, params } = buildUpdateWithWhereSql("users.role", conditions, updates);

    const {
      rows: [data],
    } = await client.query(sql, params);

    return data ? (toCamelKeys(data) as CitizenRoleAttrs) : data;
  }

  async delete(id: number): Promise<CitizenRoleAttrs> {
    const sql = `DELETE FROM users.role WHERE id = $1 RETURNING *`;
    const pool = await pgConnect.getConnection();
    const result = await pool.query(sql, [id]);
    return toCamelKeys(result.rows[0]);
  }

  async citizenRoleExists(id: number): Promise<boolean> {
    const sql = `SELECT EXISTS(SELECT 1 FROM users.role WHERE id = $1)`;
    const pool = await pgConnect.getConnection();
    const result = await pool.query(sql, [id]);
    return result.rows[0].exists;
  }

  async getCitizenRoleByRoleName(name: string, doptorId: any): Promise<CitizenRoleAttrs> {
    const sql = `SELECT * FROM users.role WHERE role_name = $1 and doptor_id=$2`;
    const pool = await pgConnect.getConnection();
    const {
      rows: [result],
    } = await pool.query(sql, [name, doptorId]);
    if(result){
      return toCamelKeys(result);
    } else {
      throw new NotFoundError("বাংলাদেশ পল্লী উন্নয়ন বোর্ড রোল পাওয়া যায়নি");
    }
  }

  async getFeatureByName(name: string): Promise<IFeatureAttrs[] | undefined> {
    //sql query for getting feature by role name
    const sql = `select c.*
    from 
      users.role_feature a,
      users.role b,
      users.feature c
    where b.role_name = $1
      and a.role_id = b.id 
      and a.feature_id = c.id;`;
    const pool = await pgConnect.getConnection();
    const result = await pool.query(sql, [name]);
    return result.rows[0] ? (toCamelKeys(result.rows) as IFeatureAttrs[]) : undefined;
  }

  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }
}
