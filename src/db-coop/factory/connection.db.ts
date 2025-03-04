import { Pool } from "pg";
import { archiveConnection } from "../archive/archive.db";
import { logConnection } from "../log/log.db";
import { masterConnection } from "../master/master.db";
import { slaveConnection } from "../slave/slave.db";

class ConnectionFactory {
  private count: number = 0;
  async getConnection(
    name: "master" | "slave" | "archive" | "log" = "master"
  ): Promise<Pool> {
    if (name.toLowerCase() === "master") {
      return await masterConnection;
    }
    if (name.toLowerCase() === "archive") {
      return await archiveConnection;
    }

    if (name.toLowerCase() === "log") {
      return await logConnection;
    }

    if (name.toLowerCase() === "slave") {
      const slaves = await slaveConnection;
      const slave = slaves[this.count];
      this.count++;

      if (this.count >= slaves.length) {
        this.count = 0;
      }
      return slave;
    } else {
      throw new Error("connection credentials is not valid");
    }
  }
}

export const pgConnect = new ConnectionFactory();
