import { NextFunction, Request, Response, Router } from "express";
import { BadRequestError, validateRequest } from "rdcd-common";
import Container from "typedi";
import { validates } from "../../../../../middlewares/express-validation.middle";
import { wrap } from "../../../../../middlewares/wraps.middle";
import { dynamicAuthorization } from "../../middlewares/coop/application/application.middle";
import { CommitteeInfoServices } from "../../services/coop/committee-info.service";
import {
  addCommitteeMemberValidation,
  committeeMemberListValidation,
} from "../../validators/coop/committee-info.validator";

const router = Router();
const CommitteeInfoService = Container.get(CommitteeInfoServices);

router.get(
  "/members",
  dynamicAuthorization,
  validates(committeeMemberListValidation),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { samityId } = req.query;
      const memberList: any = await CommitteeInfoService.memberListBySamityId(parseInt(samityId as string));
      res.status(200).send({
        message: "তথ্য সফলভাবে প্রেরণ করা হয়েছে ",
        data: memberList,
      });
    } catch (ex: any) {
      throw new BadRequestError(ex);
    }
  })
);

router.patch(
  "/member-deactivation/:id",
  dynamicAuthorization,
  // ValidMemberDeactivation,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const CommitteeInfoService = Container.get(CommitteeInfoServices);
    const committeeMemberId: number = parseInt(req.params.id);
    const committeeMemberDeactiveResult = await CommitteeInfoService.committeeMemberDeactivation(committeeMemberId);
    res.status(200).send({
      message: "data update successfully",
      data: committeeMemberDeactiveResult,
    });
  })
);

router.post(
  "/add-member",
  dynamicAuthorization,
  addCommitteeMemberValidation,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const CommitteeInfoService = Container.get(CommitteeInfoServices);
    const addMember = await CommitteeInfoService.addMember(req.body, req.user);
    res.status(201).send({
      message: "কমিটিতে নতুন সদস্য যোগ করা হয়েছে ",
      data: addMember,
    });
  })
);

export { router as committeeInfoRouter };
