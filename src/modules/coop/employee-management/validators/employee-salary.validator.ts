import { body } from "express-validator";
export const employeeSalaryValidator = [
  body("salaries")
    .exists()
    .withMessage("salaries not exist in the payload")
    .notEmpty()
    .withMessage("salaries can not be null"),

  //   body("salaries.*.employee_info_id").custom((value: any) => {
  //     console.log(value);
  //   }),
  body("salary_month_year")
    .exists()
    .withMessage("salary month year not exist in the payload")
    .notEmpty()
    .withMessage("salary month year can not be null")
    .custom((value) => {
      if (value.length !== 6) {
        return false;
      } else {
        return true;
      }
    })
    .withMessage("salary month year must be 6 digit"),
];
