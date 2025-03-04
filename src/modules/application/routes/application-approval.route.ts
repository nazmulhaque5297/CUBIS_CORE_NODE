import { NextFunction, Request, Response, Router } from "express";
import Container from "typedi";
import { validates } from "../../../middlewares/express-validation.middle";
import { uploadFile } from "../../../middlewares/multer.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { auth } from "../../../modules/user/middlewares/auth.middle";
import { uploadObject } from "../../../utils/minio.util";
import { ApplicationApprovalServices } from "../services/application-approval.service";
import {
  applicationApprovalValidator,
  getByApplicationIdValidator,
} from "../validators/application-approval.validator";

const router = Router();

router.post(
  "/",
  auth(["*"]),
  [uploadFile.single("attachment")],
  validates(applicationApprovalValidator),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const { userId, officeId, doptorId, employeeId, designationId } = req.user;

    const { serviceId, applicationId, remarks, serviceActionId, nextAppDesignationId, projectId, payload } = req.body;

    const ApplicationApprovalService = Container.get(ApplicationApprovalServices);
    let attachment;

    if (req.file) {
      const file = req.file;
      const fileName = `${new Date().getTime()}-${file.originalname}`;
      const mRes = await uploadObject({
        fileName: fileName,
        buffer: file.buffer,
      });
      if (mRes) {
        attachment = {
          fileName: fileName,
          date: new Date(),
        } as any;
      }
    }

    const result = (await ApplicationApprovalService.create(
      {
        applicationId,
        remarks,
        serviceActionId,
        attachment: attachment ? attachment : {},
        nextAppDesignationId,
        doptorId,
        projectId,
        payload,
      },
      userId,
      employeeId,
      officeId,
      serviceId as number,
      designationId as number
    )) as any;

    res.status(201).send({
      message: result?.message ?? null,
      data: result?.data ?? null,
    });
  })
);

//application history
router.get(
  "/:applicationId",
  [auth(["*"]), validates(getByApplicationIdValidator)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const { applicationId } = req.params;
    const applicationApprovalService = Container.get(ApplicationApprovalServices);

    const data = await applicationApprovalService.getByApplicationId(Number(applicationId));

    res.status(200).send({
      message: "Request successfully",
      data,
    });
  })
);

export { router as applicationApprovalRouter };
