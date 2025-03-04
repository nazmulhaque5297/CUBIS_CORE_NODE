/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-09-28 15:53:27
 * @modify date 2022-09-28 15:53:27
 * @desc [description]
 */

import { ErrorLoggerOptions } from "express-winston";
import winston from "winston";
import { PGTransport } from "./pg-transport.log";

export const errLoggerConfig: ErrorLoggerOptions = {
  transports: [
    new PGTransport({
      componentId: 0, //figure out how to manage componentId @rajuAhmed1705
      tableName: "log.error_log",
    }),
  ],
  format: winston.format.combine(winston.format.json()),
  meta: true,
  msg: "HTTP {{req.method}} {{req.url}}",
  headerBlacklist: ["authorization"],
};
