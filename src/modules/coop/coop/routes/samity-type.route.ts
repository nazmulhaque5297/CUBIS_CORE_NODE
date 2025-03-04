import express, { NextFunction, Request, Response, Router } from "express";
import { toCamelKeys } from "keys-transform";
import { Container } from "typedi";
import { wrap } from "../../../../middlewares/wraps.middle";
import { Paginate } from "../../../../utils/pagination-coop.utils";
import { dynamicAuthorization } from "../middlewares/coop/application/application.middle";
import { pageCheck } from "../middlewares/page-check.middle";
import SamityTypeServices from "../services/samity-type.service";

const router: Router = express.Router();
const SamityTypeService = Container.get(SamityTypeServices);

//get method with dynamic sql build and pagination

router.get(
  "/",
  pageCheck,
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const doptorId = req.user.doptorId;
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    const allQuery: any = req.query;
    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
    delete allQuery.isPagination;
    delete allQuery.page;
    delete allQuery.limit;

    if (Object.keys(allQuery).length > 0) {
      allQuery.doptorId = doptorId;
    }

    const count: number = await SamityTypeService.count(allQuery, doptorId);
    const pagination = new Paginate(count, limit, page);

    const data = await SamityTypeService.get(isPagination, pagination.limit, pagination.skip, allQuery, doptorId);

    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data: toCamelKeys(data),
    });
  })
);

export { router as samityTypeRouter };
