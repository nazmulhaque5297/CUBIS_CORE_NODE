/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-09-27 15:45:50
 * @modify date 2022-09-27 15:45:50
 * @desc [description]
 */

import { LoggerOptions } from "express-winston";
import winston from "winston";
import { PGTransport } from "./pg-transport.log";

export const infoLoggerConfig: LoggerOptions = {
  transports: [
    new PGTransport({
      componentId: 0, //figure out how to manage componentId @rajuAhmed1705
      tableName: "log.info_log",
    }),
  ],
  format: winston.format.combine(winston.format.json()),
  meta: true,
  msg: "HTTP {{req.method}} {{req.url}}",
  ignoreRoute: function (req, res) {
    return false;
  },
  headerBlacklist: ["authorization"],
  bodyBlacklist: ["password"],
};
