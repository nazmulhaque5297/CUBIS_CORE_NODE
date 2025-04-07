/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-30 13:42:51
 * @modify date 2021-11-30 13:42:51
 * @desc [description]
 */

import { NextFunction, Request, Response, Router } from "express";
import { omit } from "lodash";
import Container from "typedi";
import { validates } from "../../../../middlewares/express-validation.middle";
import { wrap } from "../../../../middlewares/wraps.middle";
import { citizenExists } from "../../citizen/middlewares/citizen.middle";
import { AuthorizedPersonInputAttrs } from "../interfaces/authorized-person.interface";
import { samityExist } from "../middlewares/init/init-samity-registration.middle";
import { AuthorizedPersonServices } from "../services/authorized-person.service";
import { validateSamityAuthorizedPerson } from "../validators/authorized-person.validator";

const router = Router();
const AuthorizedPersonService = Container.get(AuthorizedPersonServices);

router.get(
  "/",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const filter = omit(req.query, ["page", "limit"]);

    const result = await AuthorizedPersonService.get(req.query.page as any, req.query.limit as any, {
      ...(filter as any),
    });
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

router.post(
  "/",
  [validates(validateSamityAuthorizedPerson), samityExist, citizenExists],
  wrap(async (req: Request<any, any, AuthorizedPersonInputAttrs>, res: Response, next: NextFunction) => {
    const authorizedPerson = await AuthorizedPersonService.create(req.body, "authorizedPerson");
    res.status(201).send({
      message: "Authorized Person created successfully",
      data: authorizedPerson,
    });
  })
);

export { router as AuthorizedPersonRouter };
