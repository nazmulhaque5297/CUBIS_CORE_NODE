import { NextFunction, Request, Response, Router } from "express";
import { validateRequest } from "rdcd-common";
import Container from "typedi";
import { validates } from "../../../../../middlewares/express-validation.middle";
import { wrap } from "../../../../../middlewares/wraps.middle";
import { dynamicAuthorization } from "../../middlewares/coop/application/application.middle";
import { AuditServices } from "../../services/audit.service";

const AuditService = Container.get(AuditServices);
const router = Router();

router.get(
  "/:applicationId",
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const applicationId = req.params.applicationId;

    const auditInfo = await AuditService.getAuditInfoById(parseInt(applicationId));

    res.status(200).send({
      message: "Data Serve Successfully",
      data: auditInfo,
    });
  })
);

export { router as auditInfoRouter };
