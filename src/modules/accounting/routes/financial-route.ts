import { NextFunction, Request, Response, Router } from "express";
import { toCamelKeys } from "keys-transform";
import Container from "typedi";
import { wrap } from "../../../../middlewares/wraps.middle";
import { Paginate } from "../../../../utils/pagination-coop.utils";
import { FinancialYearServices } from "../services/financial-year.service";
const router = Router();
const FinancialYearService = Container.get(FinancialYearServices);

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
    const count: number = await FinancialYearService.count(allQuery);
    const pagination = new Paginate(count, limit, page);

    const docTypes = await FinancialYearService.get(isPagination, pagination.limit, pagination.skip, allQuery);

    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data: toCamelKeys(docTypes),
    });
  })
);

export default router;
