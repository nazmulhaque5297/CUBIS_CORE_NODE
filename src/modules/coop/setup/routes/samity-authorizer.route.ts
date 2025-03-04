import { NextFunction, Request, Response, Router } from "express";
import { validateRequest } from "rdcd-common";
import Container from "typedi";
import { validates } from "../../../../middlewares/express-validation.middle";
import { wrap } from "../../../../middlewares/wraps.middle";
import { auth } from "../../../../modules/user/middlewares/auth.middle";
import { samityAuthorizerServices } from "../services/samity-authorizer.service";
import { validateGetSamityAuthorizer, validatePostSamityAuthorizer } from "../validators/samity-authorizer.validator";

const router = Router();

const samityAuthorizerService = Container.get(samityAuthorizerServices);

router.get(
  "/:samityId",
  validateGetSamityAuthorizer,
  validateRequest,
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityId = parseInt(req.params.samityId);
    const authorizerInfo = await samityAuthorizerService.getBySamityId(samityId);

    res.status(200).send({
      message: "Data serve Successfully",
      data: authorizerInfo,
    });
  })
);

router.post(
  "/",
  auth(["*"]),
  validates(validatePostSamityAuthorizer, true),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const result = await samityAuthorizerService.create(req.body, req.user);

    res.status(201).send({
      message: "সফল ভাবে তৈরী হয়েছে ",
      data: result,
    });
  })
);
export { router as authorizerInfoRouter };
