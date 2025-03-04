import { NextFunction, Request, Response, Router } from "express";
import { toCamelKeys } from "keys-transform";
import { Paginate, validateRequest } from "rdcd-common";
import Container from "typedi";
import { getCode } from "../../../../../../configs/auth.config";
import { wrap } from "../../../../../../middlewares/wraps.middle";
import { citizenAuth } from "../../../../../../modules/coop/citizen/middlewares/citizen-auth.middle";
import { dynamicAuthorization } from "../../../../../../modules/coop/coop/middlewares/coop/application/application.middle";
import { SamityInfoServices } from "../../../../../../modules/coop/coop/services/coop/samityInfo/samity-Info.service";
import { validateCoopSamityId } from "../../../../../../modules/coop/coop/validators/coop/samity-info.validator";
import { auth } from "../../../../../../modules/user/middlewares/auth.middle";

const SamityInfoService = Container.get(SamityInfoServices);
const router = Router();

router.get(
  "/",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityInfo = await SamityInfoService.get(req.query);
    res.status(200).send({
      message: "সফল ভাবে তথ্য সরবরাহ করা হয়েছে",
      data: samityInfo,
    });
  })
);

router.get(
  "/getSamityByAudit",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityByAuditInfo = await SamityInfoService.getSamityByAudit(Number(req.query.officeId));
    res.status(200).send({
      message: "সফল ভাবে তথ্য সরবরাহ করা হয়েছে",
      data: samityByAuditInfo,
    });
  })
);

router.get(
  "/getAllSamityByAudit",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityByAuditInfo = await SamityInfoService.getAllSamityByAudit(Number(req.query.officeId));
    res.status(200).send({
      message: "সফল ভাবে তথ্য সরবরাহ করা হয়েছে",
      data: samityByAuditInfo,
    });
  })
);

router.get(
  "/getAuditBySamity",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityByAuditInfo = await SamityInfoService.getAuditBySamity(Number(req.query.samityId));
    res.status(200).send({
      message: "সফল ভাবে তথ্য সরবরাহ করা হয়েছে",
      data: samityByAuditInfo,
    });
  })
);

router.get(
  "/userOffice",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const { samityLevel, samityTypeId } = req.query;
    const samityInfo = await SamityInfoService.getByUser(user, samityLevel, samityTypeId);
    res.status(200).send({
      message: "সফল ভাবে তথ্য সরবরাহ করা হয়েছে",
      data: samityInfo,
    });
  })
);

router.get(
  "/userOfficeAudit",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const { samityLevel, samityTypeId } = req.query;
    const samityInfo = await SamityInfoService.getByUserAudit(user, samityLevel, samityTypeId);
    res.status(200).send({
      message: "সফল ভাবে তথ্য সরবরাহ করা হয়েছে",
      data: samityInfo,
    });
  })
);

router.get(
  "/authorized-person-samity",
  [citizenAuth([getCode("COMMITTEE_SETUP")])], //auth change to authorized person -- need to work extensively
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const userId: number = req.user.userId;
    const samityInfo = await SamityInfoService.getAuthorizedPersonSamity(userId);
    res.status(200).send({
      message: "সফল ভাবে তথ্য সরবরাহ করা হয়েছে",
      data: samityInfo,
    });
  })
);

router.get(
  "/samity-registration-report/:id",
  [dynamicAuthorization],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityReport = await SamityInfoService.getSamityReport(Number(req.params.id));
    res.status(200).send({
      message: "সফল ভাবে তথ্য সরবরাহ করা হয়েছে",
      data: toCamelKeys(samityReport),
    });
  })
);

router.get(
  "/filter",
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    const dataFrom: any = req.query.dataFrom ? req.query.dataFrom : "all";
    const allQuery: any = req.query;
    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
    delete allQuery.page;
    delete allQuery.limit;
    delete allQuery.isPagination;
    delete allQuery.dataFrom;

    const count: number = await SamityInfoService.count(allQuery, dataFrom);

    const pagination = new Paginate(count, limit, page);

    const pageInfo: any = await SamityInfoService.getDataFromMainOrTemp(
      isPagination,
      pagination.limit,
      pagination.skip,
      allQuery,
      dataFrom
    );

    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data: pageInfo ? toCamelKeys(pageInfo) : pageInfo,
    });
  })
);

router.get(
  "/:samityId",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityId = req.params.samityId;

    const samityInfo = await SamityInfoService.getBySamityId(parseInt(samityId));
    res.status(200).send({
      message: "সফল ভাবে তথ্য সরবরাহ করা হয়েছে",
      data: samityInfo,
    });
  })
);

router.patch(
  "/used-for-loan/:samityId",
  dynamicAuthorization,
  validateCoopSamityId,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const usedForLoan = await SamityInfoService.usedForLoan(parseInt(req.params.samityId));
    res.status(200).send({
      message: "হালনাগাদ সম্পন্ন হয়েছে ",
      data: usedForLoan,
    });
  })
);

export { router as samityInfoRouter };
