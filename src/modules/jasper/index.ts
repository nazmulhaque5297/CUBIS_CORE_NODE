import { Application } from "express";
import { jasperRouter } from "./routes/jasper-documents.route";

export function init(app: Application) {
  app.use("/jasper", jasperRouter);
}
