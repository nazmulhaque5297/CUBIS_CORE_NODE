/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-01-17 12:13:58
 * @modify date 2022-01-17 12:15:28
 * @desc [description]
 */

import { toSnakeKeys } from "keys-transform";
import { Pool, PoolClient } from "pg";

/**
 * @description This function count a column from a specific table with where conditions.
 *              This function only return true or false.
 * @param  {string} columnName which column want to be counted
 * @param  {string} tableName  Name of the Table
 * @param  {PoolClient} connection Database connection
 * @param  {Object} whereCondition Conditions and it must be a object and object can not be null
 * @returns {Promise<boolean>} true or false depends on the result of the query execution.
 */

export const isExistsByColumn = async (
  columnName: string,
  tableName: string,
  connection: Pool | PoolClient,
  whereCondition: Object = {}
): Promise<Boolean> => {
  let queryText = `SELECT COUNT (${columnName}) FROM ${tableName}`;
  let count = 1;
  const keys = Object.keys(toSnakeKeys(whereCondition));
  const values = Object.values(whereCondition);
  if (whereCondition) {
    for (const [index, key] of keys.entries()) {
      if (index === 0) {
        queryText = queryText + ` WHERE ${keys[index]}= $${count} `;
        count = count + 1;
      } else {
        queryText = queryText + ` AND ${keys[index]}= $${count} `;
        count = count + 1;
      }
    }
  }

  const countResult: any = await (await connection.query(queryText, values)).rows[0].count;

  return countResult >= 1 ? true : false;
};
