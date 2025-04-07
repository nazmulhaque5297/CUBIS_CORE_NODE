import { NextFunction, Request, Response, Router } from "express";
import { multerUpload, validateRequest } from "rdcd-common";
import Container from "typedi";
import { validates } from "../../../../../../middlewares/express-validation.middle";
import { wrap } from "../../../../../../middlewares/wraps.middle";
import { auth } from "../../../../../../modules/user/middlewares/auth.middle";
import { minioPresignedGet, minioUpload } from "../../../../../../utils/minio.util";
import { ApplicationApprovalServices } from "../../../services/coop/application-approval/application-approval.service";
import {
  applicationApprovalValidator,
  getByApplicationIdValidator,
  validateNeedForCorrection,
} from "../../../validators/coop/application-approval/application-approval.validator";

const router = Router();

router.post(
  "/",
  [auth(["*"])],
  multerUpload.fields([{ name: "attachment", maxCount: 1 }]),
  validates(applicationApprovalValidator, true),
  minioUpload,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
 
    const { userId, officeId, originUnitId } = req.user;
    const { attachmentUrl } = req.body;
    const serviceId = parseInt(req.body.serviceId);
    const createData = {
      applicationId: parseInt(req.body.applicationId),
      remarks: req.body.remarks,
      serviceActionId: parseInt(req.body.serviceActionId),
      attachment: req.body.attachment,
      designationId: req.body.designationId == "null" ? null : parseInt(req.body.designationId),
    };
    const ApplicationApprovalService = Container.get(ApplicationApprovalServices);

    const result = await ApplicationApprovalService.create(
      createData,
      req.user,
      originUnitId,
      officeId,
      serviceId as number
    );
    res.status(201).send({
      message: " সফল ভাবে তৈরী হয়েছে ",
      data: { ...result, attachmentUrl },
    });
  })
);

//application history
router.get(
  "/:applicationId",
  auth(["*"]),
  getByApplicationIdValidator,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const isReportFromArchive: boolean = req.query.isReportFromArchive == "true" ? true : false;

    const { applicationId } = req.params;
    const applicationApprovalService = Container.get(ApplicationApprovalServices);

    const data = await applicationApprovalService.getByApplicationId(Number(applicationId), isReportFromArchive);
    res.status(200).send({
      message: "সফল ভাবে তথ্য সরবরাহ করা হয়েছে",
      data: Array.isArray(data) ? await minioPresignedGet(data, ["attachment"]) : data,
    });
  })
);

//application need for correction (সংশোধনের জন্য প্রেরণ এর লিস্ট )

router.get(
  "/need-for-correction/:applicationId",
  [auth(["*"]), validates(validateNeedForCorrection)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const applicationApprovalService = Container.get(ApplicationApprovalServices);

    const { applicationId } = req.params;
    const user = req.user;
    const data = await applicationApprovalService.getNeedForCorrection(Number(applicationId), user);
    res.status(200).send({
      message: "সফল ভাবে তথ্য সরবরাহ করা হয়েছে",
      data: data,
    });
  })
);

export { router as applicationApprovalRouter };
