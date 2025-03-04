import { Application } from "express";
import { userRoleRouter } from "./routes/user-role.router";
import userRouter from "./routes/user.route";

export function init(app: Application) {
  app.use("/user", userRouter);
  app.use("/user-role", userRoleRouter);
}
