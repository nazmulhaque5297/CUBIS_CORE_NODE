import jwt from "jsonwebtoken";

declare module "jsonwebtoken" {
  export interface UserNameJwtPayload extends jwt.JwtPayload {
    username: string;
  }
}
