import { Application } from "express";
import { setUpDocMappingRouter } from "./routes/doc-mapping.route";
import { authorizerInfoRouter } from "./routes/samity-authorizer.route";
import { officeHeadRouter } from "./routes/office-head-select.router";

export function init(app: Application) {
  app.use("/coop/doc-mapping", setUpDocMappingRouter);
  app.use("/coop/setup/samity-authorizer", authorizerInfoRouter);
  app.use("/coop/office-head-select", officeHeadRouter)
  
}
