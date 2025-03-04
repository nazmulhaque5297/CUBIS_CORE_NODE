import express, { NextFunction, Request, Response, Router } from "express";
import lo from "lodash";
import Container from "typedi";
import { validates } from "../../../middlewares/express-validation.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { auth } from "../../user/middlewares/auth.middle";
import RoleService from "../services/role.service";
import { approveRole, createRole, getRoleById, getRoleWithFilter, updateRole } from "../validators/role.validator";

const router: Router = express.Router();

/**
 * Author: Nahid
 * Updater: Adnan
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
  [auth(["*"]), validates(getRoleWithFilter)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const roleService: RoleService = Container.get(RoleService);
    const filter = lo.omit(req.query, ["page", "limit", "user"]);
    const result = await roleService.get(
      req.query.page as any,
      req.query.limit as any,
      { ...filter },
      req.user.doptorId as number,
      req.user.username as string,
      Number(req.query.user),
      req.user.componentId
    );
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
      { id: parseInt(req.params.id), doptorId: req.user.doptorId },
      { ...req.body, approvedBy: req.user.userId, approveDate: new Date() }
      // Number(req.user.roleId)
    );

    return res.status(200).json({
      message: "Request Successful",
      data: {
        id: result ? result.id : null,
      },
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
