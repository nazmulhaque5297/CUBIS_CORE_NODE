import { NextFunction, Request, Response, Router } from "express";
import Container from "typedi";
import { getCode } from "../../../../configs/auth.config";
import { validates } from "../../../../middlewares/express-validation.middle";
import { wrap } from "../../../../middlewares/wraps.middle";
import { citizenAuth } from "../../../../modules/coop/citizen/middlewares/citizen-auth.middle";
import { RegistrationStepServices } from "../services/reg-steps.service";
import { validationForCitizenGet } from "../validators/reg-steps.validator";

const router = Router();
const RegistrationStepService = Container.get(RegistrationStepServices);

router.get(
  "/",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityId: any = req.query.samityId ? req.query.samityId : null;
    const isAll = req.query.all ? req.query.all : "";

    const registrationStep = await RegistrationStepService.get(req.user.userId, isAll);
    res.status(200).send({
      message: "request successful",
      data: registrationStep,
    });
  })
);

router.get(
  "/all-data-by-citizen",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  validates(validationForCitizenGet),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    console.log("work data");
    const userId: number = parseInt(req.user.userId);
    const status: any = req.query.status ? req.query.status : null;
    const doptorId: number = req.user.doptorId;

    const registrationStep = await RegistrationStepService.getByuserId(userId, status, doptorId);

    res.status(200).send({
      message: "request successful",
      data: registrationStep,
    });
  })
);

router.get(
  "/:samityId",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityId = req.params.samityId;
    const registrationStep = await RegistrationStepService.getBySamityId(parseInt(samityId));
    res.status(200).send({
      message: "request successful",
      data: registrationStep,
    });
  })
);

router.put(
  "/",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.userId;
    const updateStepsData = await RegistrationStepService.update({
      ...req.body,
      userId,
    });
    res.status(200).send({
      message: "Update Successfully",
      data: updateStepsData,
    });
  }
);

export { router as regStepsRouter };
