import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { BadRequestError } from "rdcd-common";
import Container from "typedi";
import { getJWTSecret } from "../../../configs/app.config";
import AuthError from "../../../errors/auth.error";
import { verifyLongLivedToken } from "../../../utils/jwt.util";
import FeatureService from "../../role/services/feature.service";
import UserService from "../services/user.service";

export function auth(featureNumberArr: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token: string | undefined = req.header("Authorization")?.replace("Bearer ", "");
    if (token) {
      try {
        const payload: any = await verifyLongLivedToken(token, "app");
        const features = await isUserAndRoleActive(payload.username, payload.officeId, payload.componentId);
        let isFeatureExists: Boolean = false;
        for (let i = 0; i < featureNumberArr.length; i++) {
          const featureNumber = featureNumberArr[i];
          if (features.includes(featureNumber) || featureNumber === "*") {
            isFeatureExists = true;
            break;
          }
        }

        if (isFeatureExists) {
          req.user = payload;
          next();
        } else next(new AuthError("Authorization not provided"));
      } catch (ex) {
        next(new AuthError("Invalid Token"));
      }
    } else next(new AuthError("No Bearer Token Found"));
  };
}

export async function isUserAndRoleActive(username: string, officeId: number, componentId: number) {
  const userService: UserService = Container.get(UserService);
  const featureService: FeatureService = Container.get(FeatureService);

  const user = await userService.getByUsernameAndOfficeId(username, officeId);
  if (user && user.isActive && user.doptorId && user.officeId && user.designationId && user.employeeId) {
    // get the user role
    const features = await featureService.getByUserId(user.id, user.doptorId, componentId);
    // check the role is active or not
    if (features.length) {
      return features.map((f) => f.dispalyNo);
    } else throw new BadRequestError("Role is not approved or active");
  } else throw new BadRequestError("User is not approved or active");
}

export async function tokenVerification(token: string | undefined, userType: string) {
  if (token) {
    try {
      const secret = userType == "auth" ? "app" : "citizen";
      const isVerified: boolean = await tokenCheck(token, secret);
      return isVerified;
    } catch (ex) {}
  }
}

export async function tokenCheck(token: string, jwtType: any = "app"): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const secret: string = getJWTSecret(jwtType);
      jwt.verify(token, secret, (err: any, payload: any) => {
        if (err) reject(err);
        resolve(true);
      });
    } catch (ex) {
      reject(ex);
    }
  });
}
