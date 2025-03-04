import { NextFunction, Request, Response, Router } from "express";
import { toCamelKeys } from "keys-transform";
import { Paginate } from "rdcd-common";
import Container from "typedi";
import { wrap } from "../../../../middlewares/wraps.middle";
import { dynamicAuthorization } from "../../coop/middlewares/coop/application/application.middle";
import { PageInfoServices } from "../services/page-info.service";

const router = Router();
const PageInfoService = Container.get(PageInfoServices);

// router.get(
//   "/",
//   wrap(async (req: Request, res: Response, next: NextFunction) => {
//     const result = await PageInfoService.get();
//     res.status(200).send({
//       message: "Data Serve Successfully",
//       data: result ? result : {},
//     });
//   })
// );

router.get(
  "/",
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    const allQuery: any = req.query;
    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
    delete allQuery.page;
    delete allQuery.limit;
    delete allQuery.isPagination;

    const count: number = await PageInfoService.count(allQuery);

    const pagination = new Paginate(count, limit, page);

    const pageInfo: any = await PageInfoService.get(isPagination, pagination.limit, pagination.skip, allQuery);

    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data: pageInfo ? toCamelKeys(pageInfo) : pageInfo,
    });
  })
);

export { router as pageInfoRouter };
