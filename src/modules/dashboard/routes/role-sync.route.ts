/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-08-11 10:27:31
 * @modify date 2022-08-11 10:27:31
 * @desc [description]
 */

import { NextFunction, Request, Response, Router } from "express";
import { getComponentId } from "../../../configs/app.config";
import { wrap } from "../../../middlewares/wraps.middle";
import { RoleSyncService } from "../services/role-sync.service";
import { ComponentType } from "./../../../interfaces/component.interface";

const router = Router();

router.get(
  "/:component",
  wrap(async (req: Request<{ component: ComponentType }>, res: Response, next: NextFunction) => {
    const componentId = getComponentId(req.params.component);

    const roleSyncService = new RoleSyncService(req.params.component);
    const data = await roleSyncService.syncRoles(componentId);

    res.status(200).send({
      message: data,
    });
  })
);

export { router as roleSyncRouter };
