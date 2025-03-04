import { NextFunction, Request, Response, Router } from "express";
import { validates } from "../../../../middlewares/express-validation.middle";
import Container from "typedi";
import { wrap } from "../../../..//middlewares/wraps.middle";
import { auth } from "../../../../modules/user/middlewares/auth.middle";
import { SamityServices } from "../services/correction.service";
import { samityCorrectionData } from "../validators/samity_correction.validator";
import { dynamicAuthorization } from "../../coop/middlewares/coop/application/application.middle";

const router = Router();

router.get(
  "/samity-correction/:id",
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    let samityid = Number(req.params.id);
    const correction: SamityServices = Container.get(SamityServices);
    const result = await correction.getSamityData(samityid);

    res.status(200).send({
      message: "সফলভাবে তৈরি হয়েছে",
      data: result,
    });
  })
);

router.post(
  "/samity-correction",
  dynamicAuthorization,
  validates(samityCorrectionData),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    console.log(req.body);

    const correction: SamityServices = Container.get(SamityServices);
    const response = await correction.postSamityData({
      ...req.body,
    });
    res.status(201).send({
      message: response?.message,
      data: response?.result,
    });
  })
);

export { router as coopRouter };
