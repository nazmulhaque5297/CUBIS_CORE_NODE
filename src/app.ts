import { json, urlencoded } from "body-parser";
import cors from "cors";
import express, { Application } from "express";
import expressWinston from "express-winston";
import fs from "fs";
import helmet from "helmet";
import * as http from "http";
import moment from "moment-timezone";
import morgan from "morgan";
import * as path from "path";
import "reflect-metadata";
import Container from "typedi";
import { defaultDateFormat, defaultTimezone, getDB } from "./configs/app.config";
import pgConnection from "./db/connection.db";
import { errLoggerConfig } from "./loggers/error-logger.log";
import { infoLoggerConfig } from "./loggers/info-logger.log";
import { errorHandler } from "./middlewares/error-handler.middle";
import { processHandler } from "./middlewares/process-handler.middle";
import LoanInfoScheduleServices from "./modules/scheduler/services/schedule.service";
import { requestBodyHTMLEscape } from "./utils/html-escape.utils";
// importing modules
import * as accountsModule from "./modules/accounts";
import * as activityModule from "./modules/activity";
import * as applicationModule from "./modules/application";
import * as dashboardModule from "./modules/dashboard";
import * as externalAPI from "./modules/external-api";
import * as inventoryModule from "./modules/inventory";
import * as jesperModule from "./modules/jasper";
import * as loanModule from "./modules/loan";
import * as masterModule from "./modules/master";
import * as migrationModule from "./modules/migration";
import * as notificationModule from "./modules/notification";
import * as obsModule from "./modules/obs";
import * as reportsModule from "./modules/reports";
import * as roleModule from "./modules/role";
import * as samityModule from "./modules/samity";
import * as sanctionModule from "./modules/sanction";
import * as savingsModule from "./modules/savings";
import * as scheduleModule from "./modules/schedule";
import * as transactionModule from "./modules/transaction";
import * as userModule from "./modules/user";
import * as vmsModule from "./modules/vms";

//coop modeles import
import * as citizenModule from "./modules/coop/citizen";
import * as coopModule from "./modules/coop/coop";
import * as employeeManagementModule from "./modules/coop/employee-management";
import * as fixedAsset from "./modules/coop/fixed-asset-data";
import * as memberFinancialInfo from "./modules/coop/member-financial-info";
import * as portalModule from "./modules/coop/portal";
import * as processModule from "./modules/coop/process";
import * as coopReportModule from "./modules/coop/report";
import * as coopRoleModule from "./modules/coop/role";
import * as samityCorrectionModule from "./modules/coop/samity-details-correction";
import * as archiveModule from "./modules/coop/schedule";
import * as setupModule from "./modules/coop/setup";
import { LoanDashboardServices } from "./modules/loan/services/dashboard/dashboard.service";
import { scheduleJob } from "node-schedule";

export default async function appFactory(): Promise<Application> {
  // express app init
  const app: Application = express();

  // enabling cors
  app.use(cors());

  // secuirity headers set by helmet
  app.use(helmet());

  // security header
  app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "upgrade-insecure-requests");
    next();
  });

  //fixed timezone
  moment().tz(defaultTimezone).format(defaultDateFormat);

  // body parser config
  const jsonParser: any = json({
    inflate: true,
    limit: "10mb",
    type: "application/json",
    verify: (req: http.IncomingMessage, res: http.ServerResponse, buf: Buffer, encoding: string) => {
      // place for sniffing raw request
      return true;
    },
  });

  // using json parser and urlencoder
  app.use(jsonParser);
  app.use(urlencoded({ extended: true }));

  //process handler
  app.use(processHandler);

  // enabling loggin of HTTP request using morgan
  // create a write stream (in append mode)
  const accessLogStream = fs.createWriteStream(path.join(__dirname, "access.log"), { flags: "a" });
  // setup the logger
  app.use(morgan("combined", { stream: accessLogStream }));

  //to prevent scripting
  app.use(requestBodyHTMLEscape);

  //Schedule to be updated materialized view in database
  //materializedViewUpdate();

  // for handling uncaught exception from application
  process.on("uncaughtException", (err) => {
    console.error("[ERROR] Uncaught Exception : ", err.message);
    // throw new Error(`[ERROR] Uncaught Exception : ${err.message}`);
  });

  process.on("unhandledRejection", (error: any) => {
    //@ts-ignore
    console.error("[ERROR] From event: ", error?.toString());
    // throw new Error(`[ERROR] From event: ${error?.toString()}`);
  });

  //connection
  await pgConnection.connect(getDB());

  //loggers
  app.use(expressWinston.logger(infoLoggerConfig));

  /**
   * Register Modules
   */
  roleModule.init(app);
  userModule.init(app);
  masterModule.init(app);
  samityModule.init(app);
  reportsModule.init(app);
  sanctionModule.init(app);
  transactionModule.init(app);
  applicationModule.init(app);
  dashboardModule.init(app);
  loanModule.init(app);
  jesperModule.init(app);
  scheduleModule.init(app);
  notificationModule.init(app);
  migrationModule.init(app);
  accountsModule.init(app);
  inventoryModule.init(app);
  savingsModule.init(app);
  vmsModule.init(app);
  activityModule.init(app);
  externalAPI.init(app);
  obsModule.init(app);

  //coop modules
  coopModule.init(app);
  citizenModule.init(app);
  portalModule.init(app);
  employeeManagementModule.init(app);
  processModule.init(app);
  setupModule.init(app);
  archiveModule.init(app);
  coopReportModule.init(app);
  coopRoleModule.init(app);
  samityCorrectionModule.init(app);
  memberFinancialInfo.init(app);
  fixedAsset.init(app);
  app.use(expressWinston.errorLogger(errLoggerConfig));

  /**
   * Register Error Handler
   */
  app.use(errorHandler);
  const loanInfoScheduleServices = Container.get(LoanInfoScheduleServices);

  // scheduleJob(" 06 01 * * *", () => {
  //   loanInfoScheduleServices.generateSchedule();
  // });

  // for dashboard schedule
  const dashboardScheduleServices = Container.get(LoanDashboardServices)
  scheduleJob('0 0 * * *', () => {
    dashboardScheduleServices.insertLoanDashboardData();
  });

  return app;
}
