import { NextFunction, Request, Response, Router } from "express";
import Container from "typedi";
import { wrap } from "../../../..//middlewares/wraps.middle";
import { dynamicAuthorization } from "../../coop/middlewares/coop/application/application.middle";
import { MemberFinancialInfoService } from "../services/memberfinance.service";

const router = Router();

router.get(
  "/member-financial-info/:id",
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const memberfinancedata: MemberFinancialInfoService = Container.get(MemberFinancialInfoService);
    let samityId = Number(req.params.id);
    const result = await memberfinancedata.getmemberfinancedata(samityId);

    res.status(200).send({
      message: "সফলভাবে তৈরি হয়েছে",
      data: result,
    });
  })
);

router.post(
  "/member-financial-info",
  dynamicAuthorization,
  // validates(samityCorrectionData),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const memberfinancedata: MemberFinancialInfoService = Container.get(MemberFinancialInfoService);

    const response = await memberfinancedata.postData(req.body, req.user);

    res.status(201).send({
      message: response?.message,
      data: response?.result,
    });
  })
);

export { router as coopRouter };
