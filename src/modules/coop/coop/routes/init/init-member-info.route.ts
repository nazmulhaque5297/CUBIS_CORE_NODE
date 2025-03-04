/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-10-27 14:42:19
 * @modify date 2021-10-27 14:42:19
 * @desc [description]
 */

import { NextFunction, Request, Response, Router } from "express";
import { validateRequest } from "rdcd-common";
import Container from "typedi";
import { getCode } from "../../../../../configs/auth.config";
import { validates } from "../../../../../middlewares/express-validation.middle";
import { wrap } from "../../../../../middlewares/wraps.middle";
import { Paginate } from "../../../../../utils/pagination-coop.utils";
import { citizenAuth } from "../../../citizen/middlewares/citizen-auth.middle";
import { InitialMemberInfoInputAttrs, MemberInfoOutput } from "../../interfaces/init/init-member-info-interface";
import { UpdateMemberDesignationAttrs } from "../../interfaces/member-info.interface";
import { dynamicAuthorization } from "../../middlewares/coop/application/application.middle";
import { isMemberExistsCommitteeDesignation, memberExists } from "../../middlewares/init/init-member-info-middle";
import { InitialMemberInfoServices } from "../../services/init/init-member-info.service";
import { SamityRegistrationServices } from "../../services/init/init-samity-info.service";
import {
  validateInitialMemberInfo,
  validateMemberCommitteeDesignation,
  validateMemberInfoForCentralAndNation,
  validateMemberInfoParam,
  validateMemberInfoQuery,
  validateUpdateInitialMemberInfo,
  validateUpdateMemberInfoForCentralAndNation,
} from "../../validators/init/init-member-info-validator";

const router = Router();
const InitialMemberInfoService = Container.get(InitialMemberInfoServices);

router.get(
  "/",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  validateMemberInfoQuery,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    const allQuery: any = req.query;
    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
    delete allQuery.page;
    delete allQuery.limit;
    delete allQuery.isPagination;

    if (allQuery.length > 0) {
      allQuery.isActive = true;
    }

    const count: number = await InitialMemberInfoService.count(allQuery);

    const pagination = new Paginate(count, limit, page);

    const members = await InitialMemberInfoService.get(isPagination, pagination.limit, pagination.skip, allQuery);

    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data: members,
    });
  })
);

router.get(
  "/:id",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  validateMemberInfoParam,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityId = parseInt(req.params.id);
    const query = req.query;
    const memberInformation: any = await InitialMemberInfoService.getBySamityId(samityId, query);

    res.status(200).send({
      message: "Request successfully Served",
      data: memberInformation,
    });
  })
);

router.post(
  "/",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  validateInitialMemberInfo,
  validateRequest,
  wrap(async (req: Request<any, any, InitialMemberInfoInputAttrs>, res: Response, next: NextFunction) => {
    const createdBy = req.user.userId ? req.user.userId : "Admin";
    const SamityRegistrationService = Container.get(SamityRegistrationServices);
    const doptorId = await SamityRegistrationService.samityDoptorId(req.body.samityId);
    const member: MemberInfoOutput = await InitialMemberInfoService.create(
      { ...req.body, doptorId, isActive: true },
      createdBy
    );

    res.status(201).send({
      message: "সফল ভাবে তৈরী হয়েছে ",
      data: member,
    });
  })
);

router.post(
  "/:type",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  validates(validateMemberInfoForCentralAndNation, true),

  wrap(async (req: Request<any, any, InitialMemberInfoInputAttrs>, res: Response, next: NextFunction) => {
    const createdBy = req.user.userId ? req.user.userId : "Admin";
    const doptorId = req.user.doptorId;
    const isActive = true;
    const member: any = await InitialMemberInfoService.createMemberOFCentralNationalSamity(
      { ...req.body, doptorId, isActive },
      createdBy
    );

    res.status(201).send({
      message: "সফল ভাবে তৈরী হয়েছে ",
      data: member,
    });
  })
);

router.patch(
  "/committee-designation",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  validateMemberCommitteeDesignation,
  validateRequest,
  isMemberExistsCommitteeDesignation,
  wrap(async (req: Request<any, any, UpdateMemberDesignationAttrs>, res: Response, next: NextFunction) => {
    await InitialMemberInfoService.updateCommitteeDesignations(req.body);

    res.status(200).send({
      message: "হালনাগাদ সম্পন্ন হয়েছে ",
    });
  })
);

router.put(
  "/:id",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  validateUpdateInitialMemberInfo,
  validateRequest,

  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const SamityRegistrationService = Container.get(SamityRegistrationServices);
    const doptorId = await SamityRegistrationService.samityDoptorId(req.body.samityId);
    const updatedBy = req.user.userId ? req.user.userId : "Admin";
    const memberId = parseInt(req.params.id);
    const member: MemberInfoOutput = await InitialMemberInfoService.update(
      { ...req.body, doptorId },
      updatedBy,
      memberId
    );

    res.status(201).send({
      message: "হালনাগাদ সম্পন্ন হয়েছে",
      data: member,
    });
  })
);

router.put(
  "/:type/:id",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  validateUpdateMemberInfoForCentralAndNation,
  validateRequest,
  // memberExists,
  // nidExistUpdate,
  // addressIdExists,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const updatedBy = req.user.userId ? req.user.userId : "Admin";
    const memberId = parseInt(req.params.id);
    const { memberPhotoUrl, memberSignUrl, memberTestimonialUrl } = req.body;
    const member: any = await InitialMemberInfoService.updateMemberOFCentralNationalSamity(
      req.body,
      updatedBy,
      memberId
    );

    res.status(201).send({
      message: "হালনাগাদ সম্পন্ন হয়েছে",
      data: member,
    });
  })
);

router.delete(
  "/:id",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  memberExists,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const memberId = await InitialMemberInfoService.delete(Number(req.params.id));

    res.status(200).send({
      message: "deleted successfully",
      data: { memberId },
    });
  })
);

router.get(
  "/type/:type",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const query = req.query;
    const type: any = req.params.type;
    const result = await InitialMemberInfoService.getByType(type, query);
    res.status(200).send({
      message: "Data Serve Successfully",
      data: result,
    });
  })
);

router.get(
  "/isRequiredMemberPass/:samityId",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityId = req.params.samityId;
    const result = await InitialMemberInfoService.isRequiredMemberPass(parseInt(samityId));

    res.status(200).send({
      message: "data serve successfully",
      data: result,
    });
  })
);

router.get(
  "/required-document/:samityId",
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityId = parseInt(req.params.samityId);
    const data = await InitialMemberInfoService.getRequiredDocument(samityId);
    res.status(200).send({
      message: "তথ্য সফলভাবে প্রেরণ করা হয়েছে",
      data,
    });
  })
);

export { router as initMemberInfoRouter };
