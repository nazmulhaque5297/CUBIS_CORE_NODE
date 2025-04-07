/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-02 12:24:36
 * @modify date 2021-11-02 12:24:36
 * @desc [description]
 */

import { NextFunction, Request, Response, Router } from "express";
import { toCamelKeys } from "keys-transform";
import { validateRequest } from "rdcd-common";
import Container from "typedi";
import { wrap } from "../../../../middlewares/wraps.middle";
import { Paginate } from "../../../../utils/pagination-coop.utils";
import { CommitteeRoleInputAttrs } from "../interfaces/committee-role.interface";
import { idCheck, uniqueCheck } from "../middlewares/committee-role.middle";
import { CommitteeRoleServices } from "../services/committee-role.service";
import {
  validateCommitteeRole,
  validateCommitteeRoleDel,
  validateCommitteeRoleUpdate,
} from "../validators/committee-role.validator";
import { dynamicAuthorization } from "../middlewares/coop/application/application.middle";
// import { dynamicAuthorizations } from "../../../../../../modules/coop/coop/middlewares/coop/application/application.middle";

const router = Router();
const CommitteeRoleService = Container.get(CommitteeRoleServices);

router.get(
  "/",
  [dynamicAuthorization],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    console.log('work designation api')
    const user = req.user;
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    const allQuery: any = req.query;
    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
    delete allQuery.page;
    delete allQuery.limit;
    delete allQuery.isPagination;
    const count: number = await CommitteeRoleService.count(allQuery);
    const pagination = new Paginate(count, limit, page);

    const committeeRoles = await CommitteeRoleService.get(
      user,
      isPagination,
      pagination.limit,
      pagination.skip,
      allQuery
    );

    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data: toCamelKeys(committeeRoles),
    });
  })
);

router.post(
  "/",
  validateCommitteeRole,
  validateRequest,
  uniqueCheck,
  wrap(async (req: Request<unknown, unknown, CommitteeRoleInputAttrs>, res: Response, next: NextFunction) => {
    const createdBy = "admin";

    const role = await CommitteeRoleService.create({
      ...req.body,
      createdBy,
    });

    res.status(201).send({
      message: "created successfully",
      data: toCamelKeys(role),
    });
  })
);

router.put(
  "/:id",
  validateCommitteeRoleUpdate,
  validateRequest,
  idCheck,
  uniqueCheck,
  wrap(async (req: Request<any, any, CommitteeRoleInputAttrs>, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);
    const updatedBy = "admin";
    const updatedRole = await CommitteeRoleService.update({ ...req.body, updatedBy }, id);

    res.status(200).send({
      message: "created successfully",
      data: toCamelKeys(updatedRole),
    });
  })
);

router.delete(
  "/:id",
  validateCommitteeRoleDel,
  validateRequest,
  idCheck,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const committeeRoleId = await CommitteeRoleService.delete(Number(id));
    res.status(200).send({
      message: "deleted successfully",
      data: { committeeRoleId },
    });
  })
);

export { router as committeeRoleRouter };
