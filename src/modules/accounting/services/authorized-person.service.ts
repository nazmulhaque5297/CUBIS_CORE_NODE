/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-30 16:02:55
 * @modify date 2021-11-30 16:02:55
 * @desc [description]
 */
import { toCamelKeys, toSnakeCase } from "keys-transform";
import { PoolClient } from "pg";
import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { emptyPaginationResponse, getPaginationDetails } from "../../../../utils/pagination.util";
import { buildInsertSql, buildWhereAggrSql, buildWhereSql } from "../../../../utils/sql-builder.util";
import { AuthorizedPersonAttrs, AuthorizedPersonInputAttrs } from "../interfaces/authorized-person.interface";

@Service()
export class AuthorizedPersonServices {
  constructor() {}

  async get(page: number, limit: number, filter: AuthorizedPersonAttrs) {
    const filterKeys = Object.keys(filter);
    if (filterKeys.length > 0) {
      //build where condition dynamically to get updated count value after filtering
      const { sql: countSql, params: countParams } = buildWhereAggrSql(
        "SELECT COUNT(*) AS total FROM coop.samity_authorized_person",
        filter,
        this.injectionFilter
      );

      const {
        rows: [{ total: totalCount }],
      } = await (await pgConnect.getConnection("slave")).query(countSql, countParams);

      const pagination = getPaginationDetails(page, totalCount, limit);
      if (pagination === undefined) return emptyPaginationResponse(page, limit);

      //build where condition dynamically to get data after filtering
      const { sql, params } = buildWhereSql(
        "SELECT * FROM coop.samity_authorized_person",
        filter,
        pagination.skip,
        pagination.limit,
        this.injectionFilter
      );

      const result = await (await pgConnect.getConnection("slave")).query(sql, params);

      return {
        limit: limit,
        currentPage: page,
        totalPages: pagination.total ?? 0,
        count: totalCount,
        data: toCamelKeys(result.rows) as any,
      };
    } else {
      const countRes = await (
        await pgConnect.getConnection("slave")
      ).query("SELECT COUNT(*) AS total FROM coop.samity_authorized_person");

      const totalCount: number = countRes.rows[0].total;
      const pagination = getPaginationDetails(page, totalCount, limit);

      if (pagination === undefined) return emptyPaginationResponse(page, limit);

      const sql = `
          SELECT * 
          FROM 
            coop.samity_authorized_person
          LIMIT $1 
          OFFSET $2
      `;
      const result = await (await pgConnect.getConnection("slave")).query(sql, [pagination.limit, pagination.skip]);

      return {
        limit: limit,
        currentPage: page,
        totalPages: pagination.total ?? 0,
        count: totalCount,
        data: toCamelKeys(result.rows) as any,
      };
    }
  }

  async create(
    { samityId, userId, effectDate }: AuthorizedPersonInputAttrs,
    createdBy: string
  ): Promise<AuthorizedPersonAttrs | undefined> {
    const timestamp = new Date();
    const transaction = await (await pgConnect.getConnection("master")).connect();

    try {
      const { sql, params } = buildInsertSql("coop.samity_authorized_person", {
        samityId,
        userId,
        effectDate,
        createdBy,
        createdAt: timestamp,
      });

      await transaction.query("BEGIN");

      (await this.samityAuthorizedPersonExists(samityId, transaction)) &&
        (await this.expireDate(samityId, transaction, timestamp, createdBy));

      const {
        rows: [authorizedPerson],
      } = await transaction.query(sql, params);

      await transaction.query("COMMIT");
      return authorizedPerson as AuthorizedPersonAttrs;
    } catch (error) {
      await transaction.query("ROLLBACK");
      return undefined;
    } finally {
      transaction.release();
    }
  }

  async createByApplication(
    { samityId, userId, effectDate }: AuthorizedPersonInputAttrs,
    createdBy: string,
    transaction: PoolClient
  ): Promise<AuthorizedPersonAttrs | undefined> {
    const timestamp = new Date();

    try {
      const { sql, params } = buildInsertSql("coop.samity_authorized_person", {
        samityId,
        userId,
        effectDate,
        createdBy,
        createdAt: timestamp,
      });

      (await this.samityAuthorizedPersonExists(samityId, transaction)) &&
        (await this.expireDate(samityId, transaction, timestamp, createdBy));

      const {
        rows: [authorizedPerson],
      } = await transaction.query(sql, params);

      return authorizedPerson as AuthorizedPersonAttrs;
    } catch (error) {
      return undefined;
    }
  }

  async expireDate(samityId: number, transaction: PoolClient, timestamp: Date, updatedBy: string) {
    const updateLastDate = `
    UPDATE 
      coop.samity_authorized_person 
    SET 
      expire_date = $1,
      updated_at = $2,
      updated_by = $3
    WHERE 
      samity_id = $4
    AND 
      expire_date IS NULL`;

    return await transaction.query(updateLastDate, [timestamp, timestamp, updatedBy, samityId]);
  }

  async samityAuthorizedPersonExists(samityId: number, transaction: PoolClient) {
    const {
      rows: [{ total }],
    } = await transaction.query(
      `SELECT count(id) as total
      FROM 
        coop.samity_authorized_person 
      WHERE 
        samity_id = $1 
      AND 
        expire_date IS NULL`,
      [samityId]
    );
    return total > 0;
  }

  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }
}
