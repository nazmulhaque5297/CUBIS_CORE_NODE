/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-03 10:20:41
 * @modify date 2021-11-03 10:20:41
 * @desc [description]
 */

import { Request, Response, Router } from "express";
import { toCamelKeys } from "keys-transform";
import { validateRequest } from "rdcd-common";
import Container from "typedi";
import { getCode } from "../../../../../configs/auth.config";
import { wrap } from "../../../../../middlewares/wraps.middle";
import { citizenAuth } from "../../../citizen/middlewares/citizen-auth.middle";
import { InitCommitteeRegistrationInputAttrs } from "../../interfaces/init/init-committee-registration.interface";
import { initCommitteeTypeCheck } from "../../middlewares/init/init-committee-registration.middle";
import { samityExist } from "../../middlewares/init/init-samity-registration.middle";
import { InitialCommitteeRegistrationServices } from "../../services/init/init-committee-registration.service";
import { SamityRegistrationServices } from "../../services/init/init-samity-info.service";
import { ValidateCommitteeRegistrationInput } from "../../validators/init/init-committee-registration.validator";

const router = Router();
const InitCommitteeRegistrationService = Container.get(InitialCommitteeRegistrationServices);

router.get(
  "/:id",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  samityExist,
  // initCommitteeCheck,
  wrap(async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = await InitCommitteeRegistrationService.getBySamityId(Number(id));
    res.status(200).send({
      message: "সফল ভাবে তথ্য সরবরাহ করা হয়েছে",
      data: toCamelKeys(data),
    });
  })
);

router.post(
  "/",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  ValidateCommitteeRegistrationInput,
  validateRequest,
  samityExist,
  initCommitteeTypeCheck,
  wrap(async (req: Request<unknown, unknown, InitCommitteeRegistrationInputAttrs>, res: Response) => {
    const SamityRegistrationService = Container.get(SamityRegistrationServices);
    const doptorId = await SamityRegistrationService.samityDoptorId(req.body.samityId);
    const committee = await InitCommitteeRegistrationService.create({ ...req.body, doptorId }, req.user.userId);
    res.status(201).send({
      message: "সফল ভাবে তৈরী হয়েছে ",
      data: toCamelKeys(committee),
    });
  })
);

router.put(
  "/:id",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  ValidateCommitteeRegistrationInput,
  validateRequest,
  // idCheck,
  samityExist,
  wrap(async (req: Request, res: Response) => {
    const SamityRegistrationService = Container.get(SamityRegistrationServices);
    const doptorId = await SamityRegistrationService.samityDoptorId(req.body.samityId);
    const committee = await InitCommitteeRegistrationService.update(
      Number(req.params.id),
      { ...req.body, doptorId },
      req.user.userId
    );
    res.status(200).send({
      message: "হালনাগাদ সম্পন্ন হয়েছে",
      data: toCamelKeys(committee),
    });
  })
);

export { router as initCommitteeRegistrationRouter };
