import { Application } from "express";
import scheduleRouter from "../schedule/routes/schedule.route";

export function init(app: Application) {
  app.use("/schedule", scheduleRouter);
}
