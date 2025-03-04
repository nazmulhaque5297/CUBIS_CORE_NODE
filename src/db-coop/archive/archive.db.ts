import { Pool } from "pg";
import { getArchiveDBCredentials } from "../../configs/coop.config";
import { BaseConnection, PGCredentials } from "../base/base-connection.db";

class Archive extends BaseConnection {
  constructor(credentials: PGCredentials) {
    super(credentials);
  }
  async connect() {
    const pool = new Pool({ ...this.archiveCredentials });
    try {
      await pool.connect();
      console.log("[INFO] connected to ArchiveDB");
    } catch (error) {
      console.log(error);
    }
    return pool;
  }
}

export const archiveConnection = new Archive(getArchiveDBCredentials).connect();
