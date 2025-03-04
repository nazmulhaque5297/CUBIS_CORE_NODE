import { Pool } from "pg";
import PGConnection, { DBType, IPGCredentials } from "./pg.db";

interface IPGConnectionMap {
  master: PGConnection;
  slave?: PGConnection[];
  log: PGConnection;
  archive: PGConnection;
}

export interface IAppDBCredentials {
  master: IPGCredentials;
  slave?: IPGCredentials[];
  log: IPGCredentials;
  archive: IPGCredentials;
}

class Connection {
  private pgPools: IPGConnectionMap;
  private slaveNext: number = 0;

  constructor() {}

  /**
   * Connection with database
   */
  async connect(connections: IAppDBCredentials) {
    /**
     * Connection to master database
     */
    this.pgPools = {
      master: new PGConnection(connections.master, "master"),
      log: new PGConnection(connections.log, "log"),
      archive: new PGConnection(connections.archive, "archive"),
    };
    await this.pgPools["master"].ping();
    console.log("[INFO] Connected to master db.");

    await this.pgPools["log"].ping();
    console.log("[INFO] Connected to log db.");

    await this.pgPools["archive"].ping();
    console.log("[INFO] Connected to archive db.");
    /**
     * Connection to slaves if exists
     */
    if (connections.slave) {
      let slaveConnections: PGConnection[] = [];
      for (let [index, conn] of connections.slave.entries()) {
        let slave = new PGConnection(conn, "slave");
        await slave.ping();
        slaveConnections.push(slave);
        console.log(`[INFO] Connected to slave db ${index}.`);
      }
      this.pgPools["slave"] = slaveConnections;
    }
  }

  /**
   * get Database connection pool
   * @param type
   * @param fallback
   */
  getConnection(type: DBType = "master"): Pool {
    switch (type) {
      case "master":
        return this.pgPools["master"].getPool();
      case "slave":
        return this.getSlave().getPool();
      case "log":
        return this.pgPools["log"].getPool();
      case "archive":
        return this.pgPools["archive"].getPool();
      default:
        return this.pgPools["master"].getPool();
    }
  }

  private getSlave(): PGConnection {
    const slaveDB: PGConnection[] | undefined = this.pgPools["slave"];
    if (slaveDB) {
      if (this.slaveNext === slaveDB.length) this.slaveNext = 0;
      return slaveDB[this.slaveNext++];
    } else {
      return this.pgPools["master"];
    }
  }
}

export default new Connection();
