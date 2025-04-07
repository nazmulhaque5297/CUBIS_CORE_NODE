/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-10-24 12:49:57
 * @modify date 2021-10-24 12:49:57
 * @desc samity registration APIs' route
 */
import { NextFunction, Request, Response, Router } from "express";
import { toCamelKeys } from "keys-transform";
import { validateRequest } from "rdcd-common";
import Container from "typedi";
import { getCode } from "../../../../../configs/auth.config";
import { wrap } from "../../../../../middlewares/wraps.middle";
import { Paginate } from "../../../../../utils/pagination-coop.utils";
import { citizenAuth } from "../../../citizen/middlewares/citizen-auth.middle";
import { SamityInputAttrs } from "../../interfaces/init/init-samity-info.interface";
import { SamityRegistrationServices } from "../../services/init/init-samity-info.service";
import {
  updateByLaw,
  updateCertificateGetBy,
  updateRegistrationFee,
  validateSamity,
  validateSamityId,
  validateSamityUpdate,
} from "../../validators/init/init-samity-info.validator";

const router = Router();
const SamityRegistrationService = Container.get(SamityRegistrationServices);

router.get(
  "/",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const createdBy = req.user.userId ? req.user.userId : "Admin";

    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;

    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    const allQuery: any = req.query;
    allQuery.createdBy = createdBy;
    delete allQuery.isPagination;
    delete allQuery.page;
    delete allQuery.limit;

    const count: number = await SamityRegistrationService.count(allQuery);
    const pagination = new Paginate(count, limit, page);

    const docTypes = await SamityRegistrationService.get(
      createdBy,
      isPagination,
      pagination.limit,
      pagination.skip,
      allQuery
    );

    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data: toCamelKeys(docTypes),
    });
  })
);

router.get(
  "/reg-samity",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const getSamityRegData = await SamityRegistrationService.getRegisteredSamityData();
    res.status(200).send({
      message: "request successful",
      data: getSamityRegData,
    });
  })
);

router.get(
  "/:samityId",
  validateSamityId,
  validateRequest,
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityId = parseInt(req.params.samityId);
    const getSamityRegData = await SamityRegistrationService.getSamityRegData(samityId);
    res.status(200).send({
      message: "request successful",
      data: getSamityRegData,
    });
  })
);

router.get(
  "/samity-registration-report/:id",
  // [citizenAuth([getCode("SAMITY_APPLICATION")])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const isReportFromArchive: boolean = req.query.isReportFromArchive == "true" ? true : false;
    const samityReport = await SamityRegistrationService.getSamityReport(Number(req.params.id), isReportFromArchive);

    res.status(200).send({
      message: "request successful",
      data: toCamelKeys(samityReport),
    });
  })
);

router.post(
  "/",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  validateSamity,
  validateRequest,
  wrap(async (req: Request<unknown, unknown, SamityInputAttrs>, res: Response, next: NextFunction) => {
    const organizerId = req.user.userId;
    const doptorId = req.user.doptorId;
    const samity: any = await SamityRegistrationService.create(
      {
        ...req.body,
        organizerId,
        doptorId,
      },
      req.user.userId
    );

    res.status(201).send({
      message: "সফল ভাবে তৈরী হয়েছে ",
      data: samity ? samity : {},
    });
  })
);

router.patch(
  "/:id/by_law",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  updateByLaw,
  validateRequest,
  // samityExist,
  wrap(async (req: Request, res: Response) => {
    const updateBylaw = await SamityRegistrationService.updateByLaw(
      parseInt(req.params.id),
      { createdBy: req.user.userId },
      req.body.byLaw,
      req.user
    );
    return res.status(200).send({
      message: "লক্ষ্য এবং উদ্দেশ্য সফল ভাবে সংযুক্ত করা হয়েছে ",
      data: updateBylaw ? toCamelKeys(updateBylaw) : {},
    });
  })
);
router.patch(
  "/certificate-get-by/:id",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  updateCertificateGetBy,
  validateRequest,
  // samityExist,
  wrap(async (req: Request, res: Response) => {
    const updateBylaw = await SamityRegistrationService.updateCertificateGetBy(
      parseInt(req.params.id),
      { createdBy: req.user.userId },
      req.body.certificateGetBy,
      req.body.declaration as boolean
    );
    return res.status(200).send({
      message: "হালনাগাদ সম্পূর্ণ হয়েছে",
      data: updateBylaw ? toCamelKeys(updateBylaw) : {},
    });
  })
);

router.patch(
  "/registration-fee/:id",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  updateRegistrationFee,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;

    const result = await SamityRegistrationService.registrationFeeUpdate(req.body, parseInt(id));
    res.status(201).send({
      message: "data update sucessfully",
      data: result,
    });
  })
);

router.put(
  "/:id",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  validateSamityUpdate,
  validateRequest,

  // isMemberAreaIdExist,
  // isWorkingAreaIdExist,
  wrap(async (req: Request, res: Response) => {
    const samityId = parseInt(req.params.id);
    const doptorId = req.user.doptorId;
    const updatedBy = req.user.userId;
    const updatedAt = new Date();
    const samity: any = await SamityRegistrationService.update(
      samityId,
      {
        ...req.body,
        doptorId,
        updatedBy,
        updatedAt,
        samityId,
      },
      { createdBy: req.user.userId }
    );
    res.status(201).send({
      message: "সফলভাবে হালনাগাদ হয়েছে ",
      data: samity,
    });
  })
);
router.delete(
  "/",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  wrap(async (req: Request, res: Response) => {})
);

export { router as initSamityRegistrationRouter };
