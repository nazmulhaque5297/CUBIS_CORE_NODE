import { NextFunction, Request, Response, Router } from "express";
import Container from "typedi";
import { wrap } from "../../../../../middlewares/wraps.middle";
import { dynamicAuthorization } from "../../middlewares/coop/application/application.middle";
import { SamityInfoServices } from "../../services/dashboard/samity-info.service";

const router = Router();
const SamityInfoService = Container.get(SamityInfoServices);

router.get(
  "/",
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    console.log('work', req.user.doptorId)
    const data = await SamityInfoService.getAllTypeOfSamityInformation(req.user, parseInt(req.user.doptorId));
    res.status(200).send({
      message: "data Serve Sucessfully",
      data,
    });
  })
);
export { router as dashBoardSamityInfoRouter };
