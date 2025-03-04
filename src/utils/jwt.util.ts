import jwt from "jsonwebtoken";
import { getJWTSecret, JwtType } from "../configs/app.config";

export async function getLongLivedToken(body: object, expireTime: string, jwtType: JwtType = "app"): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const secret: string = getJWTSecret(jwtType);
      jwt.sign(body, secret, { expiresIn: expireTime }, (err, token) => {
        if (err) reject(err);
        if (token) resolve(token);
      });
    } catch (ex) {
      reject(ex);
    }
  });
}

export async function verifyLongLivedToken(token: string, jwtType: JwtType = "app"): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const secret: string = getJWTSecret(jwtType);
      jwt.verify(token, secret, (err: any, payload: any) => {
        if (err) reject(err);
        resolve(payload);
      });
    } catch (ex) {
      reject(ex);
    }
  });
}
