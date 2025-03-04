import { Pool } from "pg";
import { getLogDBCredentials } from "../../configs/coop.config";
import { BaseConnection, PGCredentials } from "../base/base-connection.db";

class Log extends BaseConnection {
  constructor(credentials: PGCredentials) {
    super(credentials);
  }
  async connect() {
    const pool = new Pool({ ...this.logCredentials });

    try {
      await pool.connect();
      console.log("[INFO] connected to logDB");
    } catch (error) {
      console.log(error);
    }
    return pool;
  }
}

export const logConnection = new Log(getLogDBCredentials).connect();
