import { Application } from "express";
import { ArchiveRouter } from "./routes/archive.route";

export function init(app: Application) {
  app.use("/coop/archive", ArchiveRouter);
}
