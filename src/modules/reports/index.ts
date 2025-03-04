import { Application } from "express";
import samityRouter from "./routes/samity-report.route";

export function init(app: Application) {
  app.use("/reports", samityRouter);
}
