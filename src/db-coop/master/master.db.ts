
import { ConnectionPool } from "mssql";
import { getMasterDBCredentials } from "../../configs/coop.config";
import { BaseConnection, SQLServerCredentials } from "../base/base-connection.db";

class Master extends BaseConnection {
  constructor(credentials: SQLServerCredentials,DatabaseName:string) {
    if(DatabaseName=='master'){
      super(credentials);
    }
    else{
      credentials.database=DatabaseName
      super(credentials);
    }
   
  }
  

  // Connect method for SQL Server using mssql.ConnectionPool
  async connect(): Promise<ConnectionPool> {
    const pool = new ConnectionPool(this.masterCredentials);
    try {
      await pool.connect();
      console.log("[INFO] connected to masterDB");
    } catch (error) {
      console.error("[ERROR] Failed to connect to masterDB:", error);
    }

    return pool;
  }
}

// Initialize master connection
export function masterConnection(databaseName:string) {
 return  new Master(getMasterDBCredentials,databaseName).connect();
}
