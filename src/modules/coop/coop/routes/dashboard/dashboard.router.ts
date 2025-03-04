import { NextFunction, Request, Response, Router } from "express";
import Container from "typedi";
import { wrap } from "../../../../../middlewares/wraps.middle";
import { dynamicAuthorization } from "../../middlewares/coop/application/application.middle";
import { dashboardDatas } from "../../services/dashboard/dashboard.service";

const router = Router();
const dashboardData = Container.get(dashboardDatas);

router.get(
  "/",
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const data =await dashboardData.getDashboardData(parseInt(req.user.officeId));
    res.status(200).send({
      message: "data Serve Sucessfully",
      data,
    });
  })
);
export { router as dashBoardRouter };
