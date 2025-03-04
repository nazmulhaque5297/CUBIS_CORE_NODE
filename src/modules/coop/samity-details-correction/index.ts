import { Application } from "express";
import { coopRouter } from "./routes/correction.route";
export function init(app: Application) {
  app.use("/coop/correction", coopRouter);
}
