import { Application } from "express";
import { applicationApprovalRouter } from "./routes/application-approval.route";
import createApplication from "./routes/application.route";
import { serviceInfoRoute } from "./routes/service-info.route";
import transactionApplicationRoute from "./routes/transaction-application.route";
export function init(app: Application) {
  app.use("/application", createApplication);
  app.use("/service-info", serviceInfoRoute);
  app.use("/application-approval", applicationApprovalRouter);
  app.use("/transaction-application", transactionApplicationRoute);
}
