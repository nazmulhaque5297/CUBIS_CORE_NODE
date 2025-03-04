import { NextFunction, Request, Response, Router } from "express";
import { toCamelKeys } from "keys-transform";
import Container from "typedi";
import { wrap } from "../../../../middlewares/wraps.middle";
import { Paginate } from "../../../../utils/pagination-coop.utils";
import { dynamicAuthorization } from "../middlewares/coop/application/application.middle";
import { GlacMasterServices } from "../services/glac-mst.service";
import { pgConnect } from "../../../../db-coop/factory/connection.db";

const router = Router();
const GlacMasterService = Container.get(GlacMasterServices);

router.get(
  "/",
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const doptorId = req.user.doptorId;
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    const allQuery: any = req.query;
    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
    delete allQuery.page;
    delete allQuery.limit;
    delete allQuery.isPagination;

    Object.keys(allQuery).length > 0 ? (allQuery.doptorId = doptorId) : allQuery;

    const count: number = await GlacMasterService.count(allQuery, doptorId);
    const pagination = new Paginate(count, limit, page);

    const docTypes = await GlacMasterService.get(isPagination, pagination.limit, pagination.skip, allQuery, doptorId);

    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data: toCamelKeys(docTypes),
    });
  })
);

router.get(
  "/share_amount-savings_amount/:samity_id",
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityId: any = req.params.samity_id;
    console.log({ samityId });
    const sql =  `SELECT sum(share_amount) as share_amount, sum(savings_amount) as savings_amount FROM coop.member_financial_info where samity_id=$1`
    const data = (await (await pgConnect.getConnection("slave")).query(sql, [samityId])).rows[0]

    res.status(200).send({
      message: "request successful",
      data: toCamelKeys(data),
    });
  })
);

export default router;
