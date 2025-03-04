/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-09-28 16:41:34
 * @modify date 2022-09-28 16:41:34
 * @desc [description]
 */

import { buildInsertSql } from "rdcd-common";
import Transport from "winston-transport";
import db from "../db/connection.db";

export class PGTransport extends Transport {
  tableName: string;
  componentId: number;
  constructor(
    opts: Transport.TransportStreamOptions & {
      tableName: string;
      componentId: number;
    }
  ) {
    super(opts);

    this.tableName = opts.tableName;
    this.componentId = opts.componentId;
  }

  log(info: any, callback: () => void) {
    const { level, message, meta } = info;
    if (!callback) {
      callback = () => {};
    }

    const pool = db.getConnection("log");

    const { sql, params } = buildInsertSql(this.tableName, {
      level,
      message,
      meta,
      res_status: meta?.res?.statusCode || null,
      componentId: this.componentId,
      correlationId: meta.req.headers["x-correlation-id"],
      createdAt: new Date(),
    });

    pool.query(sql, params);

    setImmediate(() => {
      this.emit("logged", info);
    });

    // Perform the writing to the remote service
    callback();

    return null;
  }
}
