import { Request, Response, NextFunction } from "express";
import { auth } from "../modules/user/middlewares/auth.middle";
import devAuth from "../modules/role/middlewares/dev-auth.middle";
import { AuthType, InAuthOptions } from "../types/interfaces/multi-auth.interface";




export default function nAuth(options: InAuthOptions = {}) {
    return (req: Request, res: Response, next: NextFunction) => {
        const authType: AuthType = req.headers["x-auth-type"] as AuthType;
        switch(authType) {
            case "DEV":
                return devAuth(req, res, next);
            case "REG":
                const authMiddle = auth(options.featureCode ? options.featureCode : ["*"]);
                return authMiddle(req, res, next);
            default:
                next(new Error("Not implemented yet"));
        }
    }
}