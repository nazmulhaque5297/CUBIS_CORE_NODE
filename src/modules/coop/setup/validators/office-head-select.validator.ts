import { body } from "express-validator";

export const validateOfficeHead = [
  body("officeOriginId").exists().notEmpty().withMessage("অফিসের ধরন নির্বাচন করুন"),
  body("officeInfoId").exists().notEmpty().withMessage("অফিস নির্বাচন করুন"),
  body("designationId").exists().notEmpty().withMessage("পদবী নির্বাচন করুন"),
];
