/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-08-24 09:31:56
 * @modify date 2022-08-24 09:31:56
 * @desc [description]
 */

import { NextFunction, Request, Response, Router } from "express";
import { wrap } from "../../../middlewares/wraps.middle";
import { AssociationSyncService } from "../services/association.service";
import { ComponentType } from "./../../../interfaces/component.interface";
import { auth } from "../../user/middlewares/auth.middle";

const router = Router();

router.post(
  "/:component",
  auth(["*"]),
  wrap(async (req: Request<{ component: ComponentType }>, res: Response, next: NextFunction) => {
    const associationService = new AssociationSyncService(req.params.component);
    const { doptorId, officeId } = req.query;
    const data = await associationService.sendSamityToDashboard(
      req.params.component,
      req.user.userId,
      Number(doptorId),
      officeId == "ALL" ? "ALL" : Number(officeId)
    );
    res.status(200).send({
      message: "request successful",
      data,
    });
  })
);

export { router as AssociationSyncRouter };
