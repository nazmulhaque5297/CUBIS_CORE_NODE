import { Application } from "express";
import { coopRouter } from "./routes/memberfinance.route";
export function init(app: Application) {
  app.use("/coop", coopRouter);
}
