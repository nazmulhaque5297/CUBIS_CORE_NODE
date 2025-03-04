import express, { NextFunction, Request, Response, Router } from "express";
import { Paginate } from "rdcd-common";
import Container from "typedi";
import { validates } from "../../../../middlewares/express-validation.middle";
import { wrap } from "../../../../middlewares/wraps.middle";
import { auth } from "../../../../modules/user/middlewares/auth.middle";
import RoleService from "../services/role.service";
import { approveRole, createRole, getRoleById, updateRole } from "../validators/role.validator";

const router: Router = express.Router();

/**
 * Author: Nahid
 * Updater:
 */

/**
 * Create Role
 * authId: 1.1
 */
router.post(
  "/",
  [auth(["*"]), validates(createRole)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const roleService: RoleService = Container.get(RoleService);
    const result = await roleService.create(
      {
        ...req.body,
        approveStatus: "A",
        doptorId: req.user.doptorId,
        createdBy: req.user.userId,
      },
      req.user.componentId
    );

    return res.status(201).json({
      message: "সফল ভাবে তৈরী হয়েছে",
      data: {
        id: result.id ?? null,
      },
    });
  })
);

/**
 * Get Role with pagination and filter
 * authId: 1.2
 */
router.get(
  "/",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const roleService: RoleService = Container.get(RoleService);
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    const allQuery: any = req.query;
    const doptorId: number = Number(req.user.doptorId)

    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;

    delete allQuery.page;
    delete allQuery.limit;
    delete allQuery.isPagination;
    const count: number = await roleService.count(allQuery);
    const pagination = new Paginate(count, limit, page);

    const result = await roleService.getAll(
      isPagination,
      pagination.limit,
      pagination.skip,
      allQuery,
      req.user.componentId,
      doptorId
    );
    console.log({ doptorId });
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * Get Role by Id
 * authId: 1.2
 */
router.get(
  "/:id",
  [auth(["*"]), validates(getRoleById)],

  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const roleService: RoleService = Container.get(RoleService);
    const result = await roleService.getById(parseInt(req.params.id), req.user.doptorId, req.user.componentId);

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * Update role by id
 * authId: 1.3
 */
router.put(
  "/:id",
  [auth(["*"]), validates(updateRole)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const roleService: RoleService = Container.get(RoleService);
    const result = await roleService.update(
      { id: parseInt(req.params.id), doptorId: req.user.doptorId },
      { ...req.body, updatedBy: req.user.userId, updateDate: new Date() }
      // Number(req.user.roleId)
    );

    return res.status(200).json({
      message: "সফলভাবে হালনাগাদ করা হয়েছে",
      data: {
        id: result ? result.id : null,
      },
    });
  })
);

/**
 * Update role approval
 * authId: 1.4
 */
router.put(
  "/approval/:id",
  [auth(["*"]), validates(approveRole)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const roleService: RoleService = Container.get(RoleService);
    const result = await roleService.update(
      { id: parseInt(req.params.id) },
      { ...req.body, approvedBy: req.user.username, approveDate: new Date() }
    );

    return res.status(200).json({
      message: "Request Successful",
      data: {
        id: result ? result.id : null,
      },
    });
  })
);

/**
 * get users by role id
 */

router.get(
  "/get-users-by-role/:id",
  [auth(["*"]), validates(getRoleById)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const roleService: RoleService = Container.get(RoleService);
    const { id } = req.params;
    const users = await roleService.getUsersByRoleId(Number(id));

    res.status(200).send({
      message: "Request successful",
      data: users,
    });
  })
);

router.get(
  "/feature/assign",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const roleService: RoleService = Container.get(RoleService);
    const result: any = await roleService.getAllFeaturesForAssign(req.user.componentId);
    return res.status(200).json({
      message: "Request Successful",
      data: result ?? null,
    });
  })
);

export default router;
