import { NextFunction, Request, Response, Router } from "express";
import { toCamelKeys } from "keys-transform";
import lo from "lodash";
import { BadRequestError, validateRequest } from "rdcd-common";
import { Container } from "typedi";
import { getCode } from "../../../../configs/auth.config";
import { wrap } from "../../../middlewares/wraps.middle";
import { Paginate } from "../../../../utils/pagination-coop.utils";
import { citizenAuth } from "../../citizen/middlewares/citizen-auth.middle";
import { workingAreaAttrs } from "../interfaces/working-area.interface";
import { idCheckValidation } from "../middlewares/member-area.middle";
import { WorkingAreaServices } from "../services/working-area.service";
import {
  validateGetBySamity,
  validatesArray,
  validateWorkingArea,
  validationDelete,
} from "../validators/working-area.validator";

const router: Router = Router();
const workingAreaService = Container.get(WorkingAreaServices);
router.post(
  "/",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  validateWorkingArea,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dataArray = req.body;
    const finalResult: any = [];
    const createdBy = req.user.userId ? req.user.userId : "Admin";
    for await (const element of dataArray) {
      const cleanElement = await workingAreaService.clean(element);
      const result: workingAreaAttrs | undefined = await workingAreaService.create({
        ...cleanElement,
        createdBy,
        createdAt: new Date(),
      });
      finalResult.push(result);
    }
    res.status(201).json({
      message: "Request Successful",
      data: finalResult,
    });
  })
);

router.get(
  "/",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    const allQuery: any = req.query;
    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
    delete allQuery.isPagination;
    delete allQuery.page;
    delete allQuery.limit;
    const count: number = await workingAreaService.count(allQuery);
    const pagination = new Paginate(count, limit, page);

    const docTypes = await workingAreaService.get(isPagination, pagination.limit, pagination.skip, allQuery);

    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data: toCamelKeys(docTypes),
    });
  })
);

router.get(
  "/:samityId",
  validateGetBySamity,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const workingAreaBySamityId = await workingAreaService.workingAreaBySamityId(req.params.samityId);

    res.status(200).send({
      message: "data Serve Sucessfully",
      data: workingAreaBySamityId,
    });
  })
);

router.put(
  "/:id",
  idCheckValidation,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    if (lo.size(req.body) > 0) {
      const result: workingAreaAttrs = await workingAreaService.update(parseInt(req.params.id), {
        ...req.body,
        updatedBy: "User",
        updatedAt: new Date(),
      });
      return res.status(200).json({
        message: "Request Successful",
        data: {
          id: result ?? null,
        },
      });
    }
    next(new BadRequestError("No update field provided"));
  })
);

/**
 * Delete feature by id
 */
router.delete(
  "/:id",
  idCheckValidation,
  validationDelete,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const result: workingAreaAttrs | null = await workingAreaService.delete(parseInt(req.params.id));

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

router.delete(
  "/",
  validatesArray,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const data: any = await workingAreaService.deleteArr(req.body);
    const result = await workingAreaService.deleteArr(data);

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

export default router;
