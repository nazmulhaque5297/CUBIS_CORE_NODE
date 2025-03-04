import { NextFunction, Request, Response, Router } from "express";
import { validateRequest } from "rdcd-common";
import Container from "typedi";
import { wrap } from "../../../../middlewares/wraps.middle";
import { dynamicAuthorization } from "../../../../modules/coop/coop/middlewares/coop/application/application.middle";
import { EmployeeDesignationService } from "../services/employee-designation-service";
import { ValidateEmployeeDesignation } from "../validators/employee-designation.validation";

const employeeDesignationService = Container.get(EmployeeDesignationService);

const router = Router();
router.post(
  "/",
  dynamicAuthorization,
  ValidateEmployeeDesignation,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const requsetBody = req.body;
    requsetBody.createdAt = new Date();
    requsetBody.createdBy = req.user.type == "user" ? req.user.userId : req.user.userId;
    const result = await employeeDesignationService.create(requsetBody);
    res.status(201).send({
      message: "সফল ভাবে তৈরী হয়েছে",
      data: result,
    });
  })
);
router.put(
  "/:id",
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const requsetBody = req.body;
    requsetBody.updatedAt = new Date();
    requsetBody.updatedBy = req.user.type == "user" ? req.user.userId : req.user.userId;
    const result = await employeeDesignationService.update(requsetBody, parseInt(req.params.id));
    res.status(201).send({
      message: "হালনাগাদ সম্পন্ন হয়েছে",
      data: result,
    });
  })
);

router.get(
  "/",
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    // const samityId = req.params.id;
    const result = await employeeDesignationService.get();
    res.status(200).send({
      message: "data serve sucessfully",
      data: result,
    });
  })
);
export { router as designationRouter };
