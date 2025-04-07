
import { ConnectionPool } from "mssql";  // Import SQL Server's ConnectionPool
import { masterConnection } from "../master/master.db";


class ConnectionFactory {
  private count: number = 0;

  // Method to get a connection to SQL Server
  async getConnection(
    name: "master" | "CCULBCSCUBS" | "CCULBHKCUBS" | "CCULBHRCUBS" = "master"
  ): Promise<ConnectionPool> {
    if (name.toLowerCase() === "master") {
      // Connect to the master database
      return await masterConnection("master");
    }
    
    else if(name=="CCULBCSCUBS" || name=="CCULBHKCUBS" || name=="CCULBHRCUBS" ){
      return await masterConnection(name);
    }
    
    else {
      throw new Error("Connection credentials are not valid");
    }
  }
}

export const sqlConnect = new ConnectionFactory();
