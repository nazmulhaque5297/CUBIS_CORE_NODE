import { Pool } from "pg";
import { getMasterDBCredentials } from "../../configs/coop.config";
import { BaseConnection, PGCredentials } from "../base/base-connection.db";

class Master extends BaseConnection {
  constructor(credentials: PGCredentials) {
    super(credentials);
  }
  async connect() {
    const pool = new Pool({ ...this.masterCredentials });
    try {
      await pool.connect();
      console.log("[INFO] connected to masterDB");
    } catch (error) {
      console.log(error);
    }
    return pool;
  }
}

export const masterConnection = new Master(getMasterDBCredentials).connect();
