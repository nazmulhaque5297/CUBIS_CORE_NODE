import { NextFunction, Request, Response, Router } from "express";

import Container from "typedi";
import { wrap } from "../../../../middlewares/wraps.middle";

import { dynamicAuthorization } from "../../../../modules/coop/coop/middlewares/coop/application/application.middle";
import { EmployeeInformationServices } from "../../employee-management/services/employee-information.service";
import { EmployeeDesignationService } from "../services/employee-designation-service";
const employeeDesignationService = Container.get(EmployeeDesignationService);
const employeeInformationService = Container.get(EmployeeInformationServices);

const router = Router();

router.get(
  "/:id",
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityId = req.params.id;
    const result = await employeeInformationService.getEmployeeInfoBySamityId(parseInt(samityId));
    res.status(200).send({
      message: "data serve sucessfully",
      data: result,
    });
  })
);

export { router as employeeInformationRouter };
