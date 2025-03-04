/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-12-05 10:44:57
 * @modify date 2021-12-05 10:44:57
 * @desc [description]
 */

import { NextFunction, Request, Response, Router } from "express";
import { omit, size } from "lodash";
import { BadRequestError } from "rdcd-common";
import Container from "typedi";
import { citizenConf } from "../../../../configs/citizen.config";
import { validates } from "../../../../middlewares/express-validation.middle";
import { wrap } from "../../../../middlewares/wraps.middle";
import devAuth from "../../../../modules/role/middlewares/dev-auth.middle";
import { CitizenRoleAttrs } from "../interfaces/citizen-role.interface";
import { checkCitizenRoleExists } from "../middlewares/citizen-role.middle";
import { CitizenRoleServices } from "../services/citizen-role.service";
import {
  createCitizenRole,
  deleteCitizenRole,
  getCitizenRoleWithFilter,
  updateCitizenRole,
} from "../validators/citizen-role.validator";

const router = Router();
const CitizenRoleService = Container.get(CitizenRoleServices);

router.get(
  "/",
  [devAuth, validates(getCitizenRoleWithFilter)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const filter = omit(req.query, ["page", "limit"]);
    const result = await CitizenRoleService.get(req.query.page as any, req.query.limit as any, filter);
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

router.post(
  "/init-citizen-role",
  [devAuth],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const citizenRoles: CitizenRoleAttrs[] = citizenConf.citizenRoles;
    for (let c of citizenRoles) {
      await CitizenRoleService.create({
        ...c,
        createdBy: req.user.username,
        createdAt: new Date(),
      });
    }
    return res.status(200).json({
      message: "Request Successful",
      data: null,
    });
  })
);

router.post(
  "/",
  [devAuth, validates(createCitizenRole)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const result = await CitizenRoleService.create({
      ...req.body,
      createdBy: req.user.username,
      createdAt: new Date(),
    });

    res.status(201).json({
      message: "Request Successful",
      data: {
        id: result?.id ?? null,
      },
    });
  })
);

router.put(
  "/:id",
  [devAuth, validates(updateCitizenRole)],
  checkCitizenRoleExists,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    if (size(req.body) > 0) {
      const result = await CitizenRoleService.update(
        { id: parseInt(req.params.id) },
        {
          ...req.body,
          updatedBy: req.user.username,
          updatedAt: new Date(),
        }
      );
      return res.status(200).json({
        message: "Request Successful",
        data: {
          id: result.id ?? null,
        },
      });
    }
    next(new BadRequestError("No update field provided"));
  })
);

router.delete(
  "/:id",
  [devAuth, validates(deleteCitizenRole)],
  checkCitizenRoleExists,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const result = await CitizenRoleService.delete(parseInt(req.params.id));
    return res.status(200).json({
      message: "Request Successful",
      data: result.id ?? null,
    });
  })
);

export { router as citizenRoleRouter };
