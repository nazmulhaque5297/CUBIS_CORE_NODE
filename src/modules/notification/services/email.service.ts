/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-06-19 11:49:53
 * @modify date 2022-06-19 11:49:53
 * @desc [description]
 */

import { toCamelKeys } from "keys-transform";
import { PoolClient } from "pg";
import { buildInsertSql } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../db/connection.db";
import { EmailNotification } from "../interfaces/component.interface";

@Service()
export class EmailNotificationService {
  constructor() {}

  async create({}: EmailNotification, transaction?: PoolClient) {
    const vConnection = transaction ? transaction : db.getConnection("master");

    const { sql, params } = buildInsertSql("notification.email", {
      ...arguments[0],
    });

    const {
      rows: [data],
    } = await vConnection.query(sql, params);

    return toCamelKeys(data);
  }

  // async read(id: number, userType: string, userId: number) {
  //   const { sql, params } = buildUpdateWithWhereSql(
  //     "notification.component",
  //     { id, userType, userId },
  //     { readAt: new Date(), readStatus: true }
  //   );

  //   const {
  //     rows: [data],
  //   } = await (await pgConnect.getConnection("master")).query(sql, params);

  //   return toCamelKeys(data);
  // }

  // async getNotificationById(
  //   id: number,
  //   userType: string,
  //   readStatus?: boolean
  // ) {
  //   const whereCondition = pickBy(
  //     {
  //       userType,
  //       userId: id,
  //       readStatus,
  //     },
  //     (v) => v !== undefined
  //   );

  //   const { queryText, values } = buildGetSql(
  //     ["*"],
  //     "notification.component",
  //     whereCondition
  //   );

  //   const { rows: data } = await (
  //     await pgConnect.getConnection("master")
  //   ).query(queryText, values);

  //   console.log({ data, queryText, values });

  //   return toCamelKeys(data);
  // }
}
