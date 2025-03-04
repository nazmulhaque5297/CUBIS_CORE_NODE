import express, { NextFunction, Request, Response, Router } from "express";
import Container from "typedi";
import { getComponentId } from "../../../configs/app.config";
import { validates } from "../../../middlewares/express-validation.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import devAuth from "../../role/middlewares/dev-auth.middle";
import { userRoleInput } from "../interfaces/user-role.interface";
import { UserRoleServices } from "../services/user-role.service";
import { userRoleValidates } from "../validators/user-role.validator";
import { ComponentType } from "./../../../interfaces/component.interface";

const router: Router = express.Router();
const userRoleService = Container.get(UserRoleServices);
router.post(
  "/:component",
  devAuth,
  validates(userRoleValidates),
  wrap(async (req: Request<{component:ComponentType}>, res: Response, next: NextFunction) => {
    const data: userRoleInput = req.body;
    const createdBy = req.user.userId;
    const createdAt = new Date();

    const result = await userRoleService.create(data, createdBy, createdAt);
    res.status(201).send({
      message: "সফল ভাবে তৈরী হয়েছে",
      data: result,
    });
  })
);

router.get(
  "/:component",
  devAuth,
  wrap(async (req: Request<{ component: ComponentType }>, res: Response, next: NextFunction) => {
    const componentId = getComponentId(req.params.component);
    const data = await userRoleService.get(componentId);
    res.status(201).send({
      message: "সফল ভাবে তৈরী হয়েছে",
      data: data,
    });
  })
);

router.put(
  "/:id",
  devAuth,
  //   validates(userRoleValidates),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const id = parseInt(req.params.id);
    const updateBody = req.body;
    const data = await userRoleService.put(id, {
      ...updateBody,
      updatedBy: req.user.username ? req.user.username : "SuperAdmin",
      updatedAt: new Date(),
    });
    res.status(201).send({
      message: "সফল ভাবে হালনাগাদ হয়েছে ",
      data: data,
    });
  })
);

export { router as userRoleRouter };
