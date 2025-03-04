import { NextFunction, Request, Response, Router } from "express";
import { validateRequest } from "rdcd-common";
import Container from "typedi";
import { validates } from "../../../../../middlewares/express-validation.middle";
import { wrap } from "../../../../../middlewares/wraps.middle";
import { dynamicAuthorization } from "../../middlewares/coop/application/application.middle";
import { MemberInfoServices } from "../../services/coop/member-info.service";
import { ValidMemberDeactivation } from "../../validators/coop/memberInfo-validator";
import { validateCoopSamityId } from "../../validators/coop/samity-info.validator";

const MemberInfoService = Container.get(MemberInfoServices);
const router = Router();

router.get(
  "/:samityId",
  validates(validateCoopSamityId),
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityId = req.params.samityId;
    const doptorId = req.user.doptorId;
    const memberInfo = await MemberInfoService.getBySamityId(parseInt(samityId), doptorId);
    res.status(200).send({
      message: "Data Serve Successfully",
      data: memberInfo,
    });
  })
);

router.get(
  "/addable-members/:samityId",
  dynamicAuthorization,
  validateCoopSamityId,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityId = parseInt(req.params.samityId);
    const doptorId = req.user.doptorId;
    const addAbleMemberList = await MemberInfoService.addAbleMemberListForCentralOrNational(samityId);
    res.status(200).send({
      message: "data sucessfully served",
      data: addAbleMemberList,
    });
  })
);

router.patch(
  "/member-deactivation/:id",
  dynamicAuthorization,
  ValidMemberDeactivation,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const MemberInfoService = Container.get(MemberInfoServices);
    const memberId: number = parseInt(req.params.id);
    const memberDeactiveResult = await MemberInfoService.memberDeactivation(memberId);
    res.status(200).send({
      message: "data update successfully",
      data: memberDeactiveResult,
    });
  })
);

router.get(
  "/required-document/:samityId",
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityId = parseInt(req.params.samityId);
    const data = await MemberInfoService.getRequiredDocument(samityId);
    res.status(200).send({
      message: "তথ্য সফলভাবে প্রেরণ করা হয়েছে",
      data,
    });
  })
);

export { router as MemberInfoRouter };
