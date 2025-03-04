import { Application } from "express";
import { processRouter } from "./routes/process.route";

export function init(app: Application) {
  app.use("/coop/process", processRouter);
}
