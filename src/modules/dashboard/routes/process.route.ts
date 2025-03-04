/**
 * @author Md Ziaur Rahman
 * @email ziaurrahaman939@gmail.com
 * @create date 2022-11-29 09:31:56
 * @modify date 2022-11-29 09:31:56
 * @desc [description]
 */

import { NextFunction, Request, Response, Router } from "express";
import { ComponentType } from "../../../interfaces/component.interface";
import { wrap } from "../../../middlewares/wraps.middle";
import { auth } from "../../user/middlewares/auth.middle";
import { ProcessService } from "../services/process.service";
const router = Router();

router.get(
  "/:component/:type",
  auth(["*"]),
  wrap(async (req: Request<{ component: ComponentType; type: string }>, res: Response, next: NextFunction) => {
    const { type, component } = req.params;
    const associationService = new ProcessService(component);
    const doptorId = req.user?.doptorId;
    const data = await associationService.getProcessByType(type);
    res.status(200).send({
      message: "request successful",
      data: {
        ...data,
        doptorId: doptorId,
      },
    });
  })
);

export { router as ProcessRouter };
