import { NextFunction, Request, Response } from "express";
import { AuthError } from "rdcd-common";
import { verifyLongLivedToken } from "../../../../utils/jwt.util";

export async function ssoAuthCitizen(req: Request, res: Response, next: NextFunction) {
  const token: string | undefined = req.header("Authorization")?.replace("Bearer ", "");
  if (token) {
    try {
      const payload: any = await verifyLongLivedToken(token, "citizen");
      req.user = payload;
      next();
    } catch (ex) {
      next(new AuthError("Invalid Token"));
    }
  } else next(new AuthError("No Bearer Token Found"));
}
