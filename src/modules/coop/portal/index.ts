/**
 * @author Md Saifur Rahman
 * @email saifur1985bd@gmail.com
 * @create date 2022-01-26 12:04:55
 * @modify date 2022-01-26 12:04:55
 * @desc [description]
 */

import { Application } from "express";
import { contentInfoRouter } from "./routes/content-info.route";
import { pageDataRouter } from "./routes/page-data.route";
import { pageInfoRouter } from "./routes/page-info.route";
import { pageRouter } from "./routes/page.route";

export function init(app: Application) {
  app.use("/coop/portal/page-info", pageInfoRouter);
  app.use("/coop/portal/content-info", contentInfoRouter);
  app.use("/coop/portal/page-data", pageDataRouter);
  app.use("/coop/portal/page", pageRouter);
}
