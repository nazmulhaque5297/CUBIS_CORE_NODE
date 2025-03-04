import { NextFunction, Request, Response } from "express";
import { CustomError as CustomErrorCommon } from "rdcd-common";
import CustomError from "../errors/custom.error";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({
      message: inferMsg(err.statusCode),
      errors: err.serializeErrors(),
    });
  }

  if (err instanceof CustomErrorCommon) {
    return res.status(err.statusCode).json({
      message: inferMsg(err.statusCode),
      errors: err.serializeErrors(),
    });
  }

  console.error(err);
  return res.status(500).json({
    message: inferMsg(err.statusCode),
    errors: [{ message: err.message, err }],
  });
};

const inferMsg = (statusCode: number): string => {
  switch (statusCode) {
    case 400:
      return "Bad Request";
    case 401:
      return "Authentication Error";
    case 404:
      return "Not Found";
    case 500:
      return "Internal Server Error";
    default:
      return "Internal Server Error";
  }
};
