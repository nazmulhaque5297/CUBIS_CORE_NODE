import { NextFunction, Request, Response, Router } from "express";
import { validateRequest } from "rdcd-common";
import Container from "typedi";
import { getCode } from "../../../../../configs/auth.config";
import { wrap } from "../../../../../middlewares/wraps.middle";
import { citizenAuth } from "../../../citizen/middlewares/citizen-auth.middle";
import { memberFinancialAttrs, memberFinancialInputAttrs } from "../../interfaces/init/init-member-financial.interface";
import { MemberFinancialServices } from "../../services/init/init-member-financial.service";
import { SamityRegistrationServices } from "../../services/init/init-samity-info.service";
import {
  validateMemberFinancial,
  validateMemberFinancialGet,
  validateMemberFinancialUpdate,
} from "../../validators/init/init-member-financial.validator";

const router = Router();
const MemberFinancialService = Container.get(MemberFinancialServices);

router.post(
  "/",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  validateMemberFinancial,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const SamityRegistrationService = Container.get(SamityRegistrationServices);
    const doptorId = await SamityRegistrationService.samityDoptorId(req.body.samityId);
    const createdBy = req.user.userId;
    const dataArray: memberFinancialInputAttrs[] = req.body;

    const totalResult = [];
    for await (const element of dataArray) {
      const result: memberFinancialAttrs | {} = await MemberFinancialService.create({
        ...element,
        doptorId,
        createdBy,
        createdAt: new Date(),
      });
      totalResult.push(result);
    }
    res.status(201).json({
      message: "সফল ভাবে তৈরী হয়েছে",
      data: totalResult,
    });
  })
);

router.get(
  "/:samityId",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  validateMemberFinancialGet,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityId = parseInt(req.params.samityId);
    const query = req.query;
    const memberIdOfSameSamity = await MemberFinancialService.getValue(samityId, query);
    res.status(200).send({
      message: "request successful",
      // ...(isPagination ? pagination : []),
      data: memberIdOfSameSamity,
    });
  })
);

router.put(
  "/",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  validateMemberFinancialUpdate,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityId = req.body[0].samityId;
    const SamityRegistrationService = Container.get(SamityRegistrationServices);
    const doptorId = await SamityRegistrationService.samityDoptorId(samityId);
    const updatedBy = req.user.type == "citizen" ? req.user.userId : req.user.userId;
    const dataArray = req.body;
    const totalResult = [];

    for await (const element of dataArray) {
      const memberFinancialId = parseInt(element.id);
      const samityId = parseInt(element.samityId);
      const result: memberFinancialAttrs | undefined = await MemberFinancialService.update(
        memberFinancialId,
        samityId,
        {
          ...element,
          doptorId,
          updatedBy,
          updatedAt: new Date(),
        }
      );
      totalResult.push(result);
    }

    return res.status(200).json({
      message: "হালনাগাদ সম্পন্ন হয়েছে",
      data: totalResult,
    });
  })
);

/**
 * Delete feature by id
 */
// router.delete(
//   "/:id",
//   [citizenAuth([getCode("DELETE_MEMBER_FINANCIAL")])],
//   validateMemberFinancialDelete,
//   validateRequest,
//   wrap(async (req: Request, res: Response, next: NextFunction) => {
//     const result: memberFinancialAttrs = await MemberFinancialService.delete(
//       parseInt(req.params.id)
//     );
//     return res.status(200).json({
//       message: "Request Successful",
//       data: result.memberFinancialId ?? null,
//     });
//   })
// );

export default router;
