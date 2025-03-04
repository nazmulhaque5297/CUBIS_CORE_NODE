import { body } from "express-validator";

export const validateMemberArea = [
  body().isArray({ min: 1 }).withMessage("body is not an array"),
  body("*.samityId", "Samity Id can not be null").exists().notEmpty().trim(),

  body("*.status", "Status can not be null").exists().notEmpty().trim(),
  body("*.divisionId", "বিভাগ নির্বাচন করুন ").exists().trim().notEmpty(),
  body("*.districtId", " districtId Key dose not exits").exists().trim().optional(),
  body("*.upaCityId", " upaCityId Key dose not exits").exists().trim().optional(),
  body("*.upaCityType", "upaCityType Key dose not exits").exists().trim().optional(),
  body("*.uniThanaPawId", "uniThanaPawId Key dose not exits").exists().trim().optional(),
  body("*.uniThanaPawType", "uniThanaPawType Key dose not exits").exists().trim().optional(),
  body("*.detailsAddress", "detailsAddress Key dose not exits").exists().trim().optional(),
];
