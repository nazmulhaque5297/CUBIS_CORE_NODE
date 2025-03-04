/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2023-01-29 12:41:15
 * @modify date 2023-01-29 12:41:15
 * @desc [description]
 */

import { NextFunction, Request, Response } from "express";

export const decodeQuery = (req: Request, res: Response, next: NextFunction) => {
  const toBase64 = req.query.id as string;

  const decodedQuery = Buffer.from(toBase64.replace(/\_/g, "/").replace(/\-/g, "+"), "base64").toString("ascii");

  const queryParams: { [key: string]: string } = {};
  console.log({ decodeQuery, queryParams });

  decodedQuery.split("&").forEach((query) => {
    if (query.includes("=")) {
      const [key, value] = query.split("=");
      queryParams[key] = value;
    }
  });

  req.query = queryParams;

  next();
};
