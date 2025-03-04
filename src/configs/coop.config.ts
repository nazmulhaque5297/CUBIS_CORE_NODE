import fs from "fs";
import path from "path";
import { PGCredentials } from "../db-coop/base/base-connection.db";

const configPath = path.resolve(__dirname + "/../../appconfig.json");
export const appConf: any = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// @ts-ignore
export const getMasterDBCredentials: PGCredentials =
  String(process.env.NODE_ENV).toLowerCase() == "test" ? appConf.testDB.master : appConf.database.master;

// @ts-ignore
export const getSlaveDBCredentials: PGCredentials[] =
  String(process.env.NODE_ENV).toLowerCase() == "test" ? appConf.testDB.slaves : appConf.database.slave;

// @ts-ignore
export const getArchiveDBCredentials: PGCredentials =
  String(process.env.NODE_ENV).toLowerCase() == "test" ? appConf.testDB.archive : appConf.database.archive;

export const getLogDBCredentials: PGCredentials = appConf.database.log;


//component id - for component separation loan, coop and accounts.
export const ComponentId = appConf.componentId;
export const liveIp = appConf.liveIp;
export const liveIpClient = appConf.liveIpClient;
