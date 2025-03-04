/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-09-28 14:56:17
 * @modify date 2022-09-28 14:56:17
 * @desc [description]
 */
import { NextFunction, Request, Response } from "express";

export const processHandler = async (req: Request, res: Response, next: NextFunction) => {
  let correlationId = req.headers["x-correlation-id"];

  const componentId = 0; // figure out how to manage @rajuAhmed1705

  if (!correlationId) {
    correlationId = `${componentId}-${Date.now().toString()}`;
    req.headers["x-correlation-id"] = correlationId;
  }

  res.set("x-correlation-id", correlationId);

  return next();
};
