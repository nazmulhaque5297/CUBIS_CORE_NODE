/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-02-08 11:08:51
 * @modify date 2022-02-08 11:08:51
 * @desc [description]
 */

import { NextFunction, Request, Response, Router } from "express";
import { toCamelKeys } from "keys-transform";
import Container from "typedi";
import { wrap } from "../../../../middlewares/wraps.middle";
import { Paginate } from "../../../../utils/pagination-coop.utils";
import { dynamicAuthorization } from "../middlewares/coop/application/application.middle";
import { pageCheck } from "../middlewares/page-check.middle";
import ServiceInfoServices from "../services/service-info.service";

const router = Router();
const ServiceInfoService = Container.get(ServiceInfoServices);

router.get(
  "/",
  dynamicAuthorization,
  pageCheck,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const k: any = req.query.key;
    let key;
    if (k) {
      key = k.split(",");
    }

    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    const allQuery: any = req.query;

    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
    delete allQuery.isPagination;
    delete allQuery.page;
    delete allQuery.limit;
    delete allQuery.key;
    const count: number = await ServiceInfoService.count(allQuery);
    const pagination = new Paginate(count, limit, page);
    const data: any = await ServiceInfoService.get(isPagination, pagination.limit, pagination.skip, allQuery, key);

    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data: toCamelKeys(data),
    });
  })
);

export { router as serviceInfoRoute };
