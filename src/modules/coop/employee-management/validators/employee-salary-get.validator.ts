import { param } from "express-validator";

export const employeeSalaryGetValidator = [
  param("yearMonth")
    .exists()
    .withMessage("yearmont doesnot exist in the param")
    .notEmpty()
    .withMessage("salary year month can not be null"),
];
