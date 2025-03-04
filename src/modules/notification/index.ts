import { Application } from "express";
import { componentNotificationRouter } from "./routes/component.route";

export function init(app: Application) {
  app.use("/notification", componentNotificationRouter);
}
