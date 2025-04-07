import { NextFunction, Request, Response } from "express";
import { BadRequestError } from "rdcd-common";

export const pageCheck = async (req: Request, res: Response, next: NextFunction) => {
  var page: any = req.query.page;

  if (parseInt(page) <= 0) {
    next(new BadRequestError("Page number can not be zero or negative"));
  } else {
    next();
  }
};
