import { NextFunction, Request, Response, Router } from "express";
import { toCamelKeys } from "keys-transform";
import { Paginate } from "rdcd-common";
import Container from "typedi";
import { wrap } from "../../../../middlewares/wraps.middle";
import { dynamicAuthorization } from "../../coop/middlewares/coop/application/application.middle";
import ProcessServices from "../services/process.service";

const router = Router();
const ProcessService = Container.get(ProcessServices);

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

    const count: number = await ProcessService.count(allQuery);

    const pagination = new Paginate(count, limit, page);

    let pageInfo: any = await ProcessService.get(isPagination, pagination.limit, pagination.skip, allQuery);

    for (const element of pageInfo) {
      element.doptorId = req.user.doptorId;
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
    const result = await ProcessService.getByType(req.params.type, req.query, req.user);
    res.status(200).send({
      message: "data serve successfully",
      data: result,
    });
  })
);

router.post(
  "/:type",
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    console.log("typetype", req.params.type);
    const ProcessService = Container.get(ProcessServices);
    const newQuery = { ...req.query, doptorId: req?.user?.doptorId };
    const userId = req.user.userId;
    const processCreate = await ProcessService.processCreate(req.params.type, userId, newQuery);

    res.status(201).send({
      message: processCreate ? "প্রক্রিয়াটি সঠিকভাবে সম্পন্ন হয়েছে" : "প্রক্রিয়াটি সঠিকভাবে সম্পন্ন হয়নি",
    });
  })
);

export { router as processRouter };
