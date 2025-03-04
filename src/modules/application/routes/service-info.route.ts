/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-02-08 11:08:51
 * @modify date 2022-02-08 11:08:51
 * @desc [description]
 */

import { NextFunction, Request, Response, Router } from "express";
import { Paginate } from "rdcd-common";
import Container from "typedi";
import { getComponentId } from "../../../configs/app.config";
import { ComponentType } from "../../../interfaces/component.interface";
import { wrap } from "../../../middlewares/wraps.middle";
import { auth } from "../../../modules/user/middlewares/auth.middle";
import { pageCheck } from "../middlewares/page-check.middle";
import ServiceInfoServices from "../services/service-info.service";

const router = Router();
const ServiceInfoService = Container.get(ServiceInfoServices);

router.get(
  "/:component",
  [auth(["*"])],
  pageCheck,
  wrap(async (req: Request<{ component: ComponentType }>, res: Response, next: NextFunction) => {
    const componentId = getComponentId(req.params.component);

    // if (req.query.id == undefined) {
    //   throw new BadRequestError("Id is undefined");
    // }
    const deskId: number = Number(req.user.designationId);
    const createdBy: number = Number(req.user.userId);
    const status = req.query.status;
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    const allQuery: any = req.query;
    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
    delete allQuery.isPagination;
    delete allQuery.page;
    delete allQuery.limit;
    delete allQuery.status;
    const count: number = await ServiceInfoService.count({ ...allQuery, componentId });
    const pagination = new Paginate(count, limit, page);
    let data;
    if (status == "user") {
      data = await ServiceInfoService.get(null, createdBy, isPagination, pagination.limit, pagination.skip, {
        ...allQuery,
        componentId,
      });
    } else {
      data = await ServiceInfoService.get(deskId, null, isPagination, pagination.limit, pagination.skip, {
        ...allQuery,
        componentId,
      });
    }

    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data: data,
    });
  })
);

export { router as serviceInfoRoute };
