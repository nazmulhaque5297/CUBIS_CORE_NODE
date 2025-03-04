import { NextFunction, Request, Response, Router } from "express";
import { validateRequest } from "rdcd-common";
import Container from "typedi";
import { wrap } from "../../../../middlewares/wraps.middle";
import { dynamicAuthorization } from "../../coop/middlewares/coop/application/application.middle";
import { EmployeeSalaryService } from "../services/employee-salary-service.service";
import { employeeSalaryGetValidator } from "../validators/employee-salary-get.validator";
import { employeeSalaryValidator } from "../validators/employee-salary.validator";

const employeeSalaryService = Container.get(EmployeeSalaryService);

const router = Router();
router.post(
  "/",
  dynamicAuthorization,
  employeeSalaryValidator,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const requsetBody = req.body;

    requsetBody.createdAt = new Date();
    requsetBody.createdBy = req.user.type == "user" ? req.user.userId : req.user.userId;
    const result = await employeeSalaryService.create(requsetBody);
    res.status(201).send({
      message: "সফল ভাবে তৈরী হয়েছে",
      data: result,
    });
  })
);

router.get(
  "/:yearMonth",
  employeeSalaryGetValidator,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const yearMonth = req.params.yearMonth;
    const result = await employeeSalaryService.getSalaryByYearmont(parseInt(yearMonth));
    res.status(200).send({
      message: "সফল হয়েছে",
      data: result,
    });
  })
);
export { router as salaryRoute };
