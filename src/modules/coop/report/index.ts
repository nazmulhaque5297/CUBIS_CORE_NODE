import { Application } from "express";
import { reportRouter } from "./routes/report.route";

export function init(app: Application) {
  app.use("/coop/report", reportRouter);
}
