/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-12-05 16:14:30
 * @modify date 2021-12-05 16:14:30
 * @desc [description]
 */

import { NextFunction, Request, Response, Router } from "express";
import Container from "typedi";
import { validates } from "../../../../middlewares/express-validation.middle";
import { wrap } from "../../../../middlewares/wraps.middle";
import devAuth from "../../../../modules/role/middlewares/dev-auth.middle";
import { citizenAuth } from "../middlewares/citizen-auth.middle";
import { checkCitizenRoleExistsInBody } from "../middlewares/citizen-role.middle";
import { CitizenRoleFeatureServices } from "../services/citizen-role-feature.service";
import { CitizenRoleServices } from "../services/citizen-role.service";
import CitizenServices from "../services/citizen.service";
import { createCitizenRoleFeature } from "../validators/citizen-role-feature";

const router = Router();
const CitizenRoleFeatureService = Container.get(CitizenRoleFeatureServices);
const CitizenService = Container.get(CitizenServices);
const CitizenRoleService = Container.get(CitizenRoleServices);

router.post(
  "/",
  [devAuth, validates(createCitizenRoleFeature), checkCitizenRoleExistsInBody],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const citizenRoleFeature = await CitizenRoleFeatureService.create(req.body);
    res.status(201).send({
      message: "Citizen Role Feature Created Successfully",
      data: citizenRoleFeature,
    });
  })
);

// router.get(
//   "/",
//   wrap(async (req: Request, res: Response, next: NextFunction) => {
//     const filter = omit(req.query, ["page", "limit"]);
//     const result = await CitizenRoleFeatureService.get(
//       req.query.page as any,
//       req.query.limit as any,
//       filter
//     );
//     return res.status(200).json({
//       message: "Request Successful",
//       data: result,
//     });
//   })
// );

router.get(
  "/",
  [citizenAuth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const isAuthorizedPerson = await CitizenService.isAuthorizedPerson(
      req.user.userId,
      req.user.nid,
      req.user.brn,
      req?.user?.memberId
    );

    const role = isAuthorizedPerson
      ? await CitizenRoleService.getCitizenRoleByRoleName("AUTHORIZED_PERSON", "")
      : await CitizenRoleService.getCitizenRoleByRoleName("ORGANIZER", "");
    if (role) {
      const result = await CitizenRoleFeatureService.getRoleFeature(Number(role.id));
      return res.status(200).json({
        message: "Request Successful",
        data: result,
      });
    }
    return res.status(200).json({
      message: "Request Successful",
      data: [],
    });
  })
);

export { router as citizenRoleFeatureRouter };
