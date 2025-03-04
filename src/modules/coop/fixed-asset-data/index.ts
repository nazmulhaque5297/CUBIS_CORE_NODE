import { Application } from "express";
import { coopRouter } from "./routes/fixedasset.route";
export function init(app: Application) {
  app.use("/coop", coopRouter);
}
