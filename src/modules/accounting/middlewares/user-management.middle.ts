import { NextFunction, Request, Response } from "express";
import { AuthError, BadRequestError } from "rdcd-common";
import Container from "typedi";
import { verifyLongLivedToken } from "../../../utils/jwt.util";

export function userAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token: string | undefined = req.header("Authorization")?.replace("Bearer ", "");
    if (token) {
      try {
        const payload: any = await verifyLongLivedToken(token, "user");
        req.user = payload;
        next();
      } catch (ex) {
        next(new AuthError("সরবরাহকারী টোকেন টি সঠিক নয়"));
      }
    } else next(new AuthError("সঠিক টোকেন সরবরাহ করুন"));
  };
}

