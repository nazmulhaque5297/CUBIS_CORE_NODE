/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-06-19 11:49:53
 * @modify date 2022-06-19 11:49:53
 * @desc [description]
 */

import { toCamelKeys } from "keys-transform";
import { pickBy } from "lodash";
import { PoolClient } from "pg";
import { buildGetSql, buildInsertSql, buildUpdateWithWhereSql } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../db/connection.db";
import { ComponentNotification } from "../interfaces/component.interface";

@Service()
export class ComponentNotificationService {
  constructor() {}

  async create({}: ComponentNotification, transaction?: PoolClient) {
    const vConnection = transaction ? transaction : db.getConnection("master");

    const { sql, params } = buildInsertSql("notification.component", {
      ...arguments[0],
    });

    const {
      rows: [data],
    } = await vConnection.query(sql, params);

    return toCamelKeys(data);
  }

  async read(id: number, userType: string, userId: number) {
    const { sql, params } = buildUpdateWithWhereSql(
      "notification.component",
      { id, userType, userId },
      { readAt: new Date(), readStatus: true }
    );

    const {
      rows: [data],
    } = await db.getConnection("master").query(sql, params);

    return toCamelKeys(data);
  }

  async getNotificationById(id: number, userType: string, componentId: number, readStatus?: boolean) {
    const whereCondition = pickBy(
      {
        userType,
        userId: id,
        readStatus,
        componentId,
      },
      (v) => v !== undefined
    );

    const { queryText, values } = buildGetSql(["*"], "notification.component", whereCondition);

    const { rows: data } = await db.getConnection("master").query(queryText, values);

    return toCamelKeys(data);
  }
}
