import { NextFunction, Request, Response, Router } from "express";
import { toCamelKeys } from "keys-transform";
import { Paginate } from "rdcd-common";
import Container from "typedi";
import { wrap } from "../../../../middlewares/wraps.middle";
import { dynamicAuthorization } from "../../../../modules/coop/coop/middlewares/coop/application/application.middle";
import ReportServices from "../services/report.service";

const router = Router();
const ReportService = Container.get(ReportServices);

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

    const count: number = await ReportService.count(allQuery);

    const pagination = new Paginate(count, limit, page);

    let pageInfo: any = await ReportService.get(isPagination, pagination.limit, pagination.skip, allQuery);

    for (const element of pageInfo) {
      element.doptorId = req.user.doptorId;
      element.userName = req.user.name;
    }

    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data: pageInfo ? toCamelKeys(pageInfo) : pageInfo,
    });
  })
);

router.get(
  "/:type",
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const result = await ReportService.getByType(req.params.type, req.query, req.user);

    res.status(200).send({
      message: "data serve successfully",
      data: result,
    });
  })
);

router.get(
  "/by-laws/:id",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const result = await ReportService.getByLaws(req.params.id);
    res.status(200).send({
      message: "data serve successfully",
      data: result,
    });
  })
);

router.get(
  "/by-laws-info/:id",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const result = await ReportService.getByLawsInfo(req.params.id);
    res.status(200).send({
      message: "data serve successfully",
      data: result,
    });
  })
);

export { router as reportRouter };
