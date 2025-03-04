/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-04-13 14:47:39
 * @modify date 2022-04-13 14:47:39
 * @desc [description]
 */

import { NextFunction, Request, Response, Router } from "express";
import { ComponentType } from "../../../interfaces/component.interface";
import { wrap } from "../../../middlewares/wraps.middle";
import { MasterDataSyncService } from "../services/master-data.service";

const router = Router();

router.get(
  "/:component",
  wrap(async (req: Request<{ component: ComponentType }>, res: Response, next: NextFunction) => {
    const masterDataService = new MasterDataSyncService(req.params.component);
    const data = await masterDataService.syncMasterData();

    res.status(200).send({
      message: "request successful",
      data: [],
    });
  })
);

router.get(
  "/dashboard-send/:component",
  wrap(async (req: Request<{ component: ComponentType }>, res: Response, next: NextFunction) => {
    const masterDataService = new MasterDataSyncService(req.params.component);
    const data = await masterDataService.sendMasterData();

    res.status(200).send({
      message: "request successful",
      data,
    });
  })
);

export { router as masterDataSyncRouter };
