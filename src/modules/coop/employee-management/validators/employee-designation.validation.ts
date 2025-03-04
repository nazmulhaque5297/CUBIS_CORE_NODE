import { body } from "express-validator";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { isExistsByColumn } from "../../../../utils/service.utils";

export const ValidateEmployeeDesignation = [
  // body("samityId", "সমিতির নাম নির্বাচন করুন")
  //   .exists()
  //   .notEmpty()
  //   .bail()
  //   .custom(async (value) => {
  //     const isSamityExist = await isExistsByColumn("id", "coop.samity_info", await pgConnect.getConnection("slave"), {
  //       id: value,
  //     });
  //     return isSamityExist ? true : Promise.reject();
  //   })
  //   .withMessage("সমিতির নামটি ডাটাবেস এ মজুদ নেই"),

  body("designationName", "পদবীর নাম লিখুন")
    .exists()
    .notEmpty()
    .trim()
    .custom(async (value, { req }) => {
      const isDesignationNameExist = await isExistsByColumn(
        "id",
        "coop.employee_designation",
        await pgConnect.getConnection("slave"),
        { designation_name: value }
      );

      return isDesignationNameExist ? Promise.reject() : true;
    })
    .withMessage("পদবীটি বিদ্যমান রয়েছে "),

  body("rank", "র‍্যাংক লিখুন ").exists().notEmpty().isInt({ min: 1 }).withMessage("rank must be number"),
  body("status", "সক্রিয় অথবা নিষ্ক্রিয় নির্বাচন করুন ")
    .exists()
    .notEmpty()
    .bail()
    .isBoolean()
    .withMessage("status must be true or false"),
];
