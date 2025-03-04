/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-04-17 10:27:55
 * @modify date 2022-04-17 10:27:55
 * @desc [description]
 */
import { Application } from "express";
import { AssociationSyncRouter } from "./routes/association.route";
import { doptorSyncRouter } from "./routes/doptor.route";
import { geoCodeSyncRouter } from "./routes/geo-code.route";
import { masterDataSyncRouter } from "./routes/master-data.route";
import { roleSyncRouter } from "./routes/role-sync.route";
import { ProcessRouter } from "./routes/process.route";

export function init(app: Application) {
  app.use("/geo-code-sync", geoCodeSyncRouter);
  app.use("/doptor-sync", doptorSyncRouter);
  app.use("/role-sync", roleSyncRouter);
  app.use("/master-data-sync", masterDataSyncRouter);
  app.use("/association-sync", AssociationSyncRouter);
  app.use("/process", ProcessRouter);
}
