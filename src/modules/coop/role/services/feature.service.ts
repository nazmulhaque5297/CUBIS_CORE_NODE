import { toCamelKeys, toSnakeCase } from "keys-transform";
import { buildGetSql, buildSql } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../../db/connection.db";
// import { pgConnect as db, pgConnect } from "../../../db/factory/connection.db";
import { IPaginationResponse } from "../../../../types/interfaces/pagination.interface";
import {
  emptyPaginationResponse,
  getPaginationDetails,
} from "../../../../utils/pagination-loan.utils";
import {
  buildInsertSql,
  buildUpdateSql,
  buildWhereAggrSql,
  buildWhereSql,
} from "../../../../utils/sql-builder-loan.utils";
import { IFeatureAttrs } from "../interfaces/feature.interface";

@Service()
export default class FeatureService {
  constructor () {}
  // create a feature
  async create (data: IFeatureAttrs): Promise<IFeatureAttrs> {
    const { sql, params } = buildInsertSql("users.feature", { ...data });

    //console.log(sql, params);
    const pool = await db.getConnection();
    const result = await pool.query(sql, params);
    return toCamelKeys(result.rows[0]);
  }

  // get feature with pagination
  async get (
    page: number,
    limit: number,
    filter: IFeatureAttrs
  ): Promise<IPaginationResponse> {
    const pool = await db.getConnection();
    const filterKeys = Object.keys(filter);
    if (filterKeys.length > 0) {
      //build where condition dynamically to get updated count value after filtering
      const { sql: countSql, params: countParams } = buildWhereAggrSql(
        "SELECT COUNT(*) AS total FROM users.feature",
        filter,
        this.injectionFilter
      );

      const totalCount = await (
        await pool.query(countSql, countParams)
      ).rows[0].total;
      const pagination = getPaginationDetails(page, totalCount, limit);
      if (pagination === undefined) return emptyPaginationResponse(page, limit);

      //build where condition dynamically to get data after filtering
      const { sql, params } = buildWhereSql(
        "SELECT * FROM users.feature",
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
      const countRes = await pool.query(
        "SELECT COUNT(*) AS total FROM users.feature"
      );
      const totalCount: number = countRes.rows[0].total;
      const pagination = getPaginationDetails(page, totalCount, limit);

      if (pagination === undefined) return emptyPaginationResponse(page, limit);
      const sql = `
                SELECT * FROM users.feature 
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

  async getAll (
    isPagination: boolean,
    limit: number,
    offset: number,
    allQuery: object,
    componentId:number
  ): Promise<IPaginationResponse | any> {
    // var queryText: string = "";
    // const sql: string = "SELECT * FROM users.feature";
    // const allQueryValues: any[] = Object.values(allQuery);
    // if (Object.keys(allQuery).length > 0) {
    //   const createSql = buildSql(
    //     sql,
    //     allQuery,
    //     "AND",
    //     this.injectionFilter,
    //     "id",
    //     limit,
    //     offset
    //   );
    //   queryText = isPagination ? createSql[0] : createSql[1];

    //   //console.log(queryText);

    //   var data = await (
    //     await db.getConnection("slave")
    //   ).query(queryText, allQueryValues);
    // } else {
    //   queryText = isPagination
    //     ? "SELECT * FROM users.feature ORDER BY id LIMIT $1 OFFSET $2"
    //     : "SELECT * FROM users.feature ORDER BY id ";
    //   data = await (
    //     await db.getConnection("slave")
    //   ).query(queryText, isPagination ? [limit, offset] : []);
    // }

    // return data.rows ? toCamelKeys(data.rows) : data.rows;
    const connection = db.getConnection("slave");
    const { queryText, values } = buildGetSql(['*'], "users.feature", {
      is_active: true,
      componentId
    });
    const { rows: roles } = await connection.query(queryText, values);


    return toCamelKeys([...roles]) as IFeatureAttrs[];
  }

  // update feature by id
  async update (id: number, data: IFeatureAttrs): Promise<IFeatureAttrs> {
    const { sql, params } = buildUpdateSql("users.feature", id, { ...data });
    const pool = await db.getConnection();
    const result = await pool.query(sql, params);
    return toCamelKeys(result.rows[0]);
  }

  // delete feature by id
  async delete (id: number): Promise<IFeatureAttrs> {
    const sql = `DELETE FROM users.feature WHERE id = $1 RETURNING *`;
    const pool = await db.getConnection();
    const result = await pool.query(sql, [id]);
    return toCamelKeys(result.rows[0]);
  }

  async count (allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM users.feature";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = await buildSql(
        sql,
        allQuery,
        "AND",
        this.injectionFilter,
        "id"
      )[1];
      var result = await (
        await db.getConnection("slave")
      ).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM users.feature";
      result = await (await db.getConnection("slave")).query(queryText);
    }
    return result.rows[0].count;
  }

  async getByUserId (userId: number, doptorId: number) {
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
        a.id = $1 and b.doptor_id = $2 and b.status = $3
      `;

    const params = [userId, doptorId, "A"];

    const pool = await db.getConnection();
    const result = await pool.query(query, params);
    return toCamelKeys(result.rows) as IFeatureAttrs[];
  }

  // keys injection filter
  injectionFilter (key: string): string {
    return toSnakeCase(key);
  }
}
