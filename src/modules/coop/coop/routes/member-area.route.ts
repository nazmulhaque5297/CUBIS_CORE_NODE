import { NextFunction, Request, Response, Router } from "express";
import { toCamelKeys } from "keys-transform";
import lo from "lodash";
import { BadRequestError, validateRequest } from "rdcd-common";
import { Container } from "typedi";
import { getCode } from "../../../../configs/auth.config";
import { wrap } from "../../../../middlewares/wraps.middle";
import { Paginate } from "../../../../utils/pagination-coop.utils";
import { citizenAuth } from "../../citizen/middlewares/citizen-auth.middle";
import { memberAreaAttrs } from "../interfaces/init/init-samity-info.interface";
import { checkSamityId, idCheckValidation } from "../middlewares/member-area.middle";
import { MemberAreaServices } from "../services/member-area.service";
import { validateMemberArea } from "../validators/member-area.validator";

const router: Router = Router();
const MemberAreaService = Container.get(MemberAreaServices);
router.post(
  "/",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  validateMemberArea,
  validateRequest,
  checkSamityId,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dataArray = req.body;
    const finalResult: any = [];
    const createdBy = req.user.userId ? req.user.userId : "Admin";
    for await (const element of dataArray) {
      const cleanElement = await MemberAreaService.clean(element);
      const result: memberAreaAttrs | {} = await MemberAreaService.create({
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
    const count: number = await MemberAreaService.count(allQuery);
    const pagination = new Paginate(count, limit, page);

    const docTypes = await MemberAreaService.get(isPagination, pagination.limit, pagination.skip, allQuery);

    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data: toCamelKeys(docTypes),
    });
  })
);

router.put(
  "/:id",
  idCheckValidation,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    if (lo.size(req.body) > 0) {
      const result: memberAreaAttrs | {} = await MemberAreaService.update(parseInt(req.params.id), {
        ...req.body,
        updatedBy: "User",
        updatedAt: new Date(),
      });
      return res.status(200).json({
        message: "Request Successful",
        data: {
          id: result,
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
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const result: memberAreaAttrs | {} = await MemberAreaService.delete(parseInt(req.params.id));
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

export default router;
