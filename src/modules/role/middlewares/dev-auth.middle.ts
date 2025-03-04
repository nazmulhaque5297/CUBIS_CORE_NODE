import { compare } from "bcryptjs";
import { NextFunction, Request, Response } from "express";
import AuthError from "../../../errors/auth.error";
import { getAdminCreds } from "../../../configs/app.config";
import { verifyLongLivedToken } from "../../../utils/jwt.util";



export default async function devAuth(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const token: string | undefined = req.header("Authorization")?.replace("Bearer ", "");
    if(token) {
        try {
            const payload: any = await verifyLongLivedToken(token, "dev");
            req.user = payload;
            next();
        }
        catch(ex) {
            next(new AuthError("Invalid Token"))
        }
    }
    else next(new AuthError("No Bearer Token Found"));
}

export const devCredentialCheck = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { username, password } = req.body;
    const {username: devUser, password: devPassword} = getAdminCreds();
    const passwordMatch = await compare(password, devPassword);
    if (!passwordMatch || username !== devUser) {
        next(new AuthError("Invalid Credentials"));
    }
    next();
};