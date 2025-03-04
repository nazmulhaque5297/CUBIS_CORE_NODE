import { Application } from "express";
import { citizenRoleFeatureRouter } from "./routes/citizen-role-feature.route";
import { citizenRoleRouter } from "./routes/citizen-role.route";
import { citizenRouter } from "./routes/citizen.route";

export function init(app: Application) {
  app.use("/citizen", citizenRouter);
  app.use("/citizen-role", citizenRoleRouter);
  app.use("/citizen-role-feature", citizenRoleFeatureRouter);
}
