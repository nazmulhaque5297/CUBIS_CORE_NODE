import { body, param, query, check } from "express-validator";

export const getSamityNameWithFlag = [
  query("districtId")
    .notEmpty()
    .withMessage("জেলা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("জেলা ভুল ফরম্যাটে আছে"),
  query("upazilaId")
    .notEmpty()
    .withMessage("উপজেলা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("উপজেলা ভুল ফরম্যাটে আছে"),
  query("projectId")
    .notEmpty()
    .withMessage("প্রকল্প দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রকল্প ভুল ফরম্যাটে আছে"),
  query("flag")
    .notEmpty()
    .withMessage("Flag is required")
    .bail()
    .isIn([1, 2, 3])
    .withMessage("Flag must be 1, 2 or 3"),
  query("value")
    .notEmpty()
    .withMessage("Value is required")
    .bail()
    .isIn([1, 2])
    .withMessage("Value must be 1 or 2"),
];

export const getSamityNameWithoutFlag = [
  query("districtId")
    .notEmpty()
    .withMessage("জেলা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("জেলা ভুল ফরম্যাটে আছে"),
  query("upazilaId")
    .notEmpty()
    .withMessage("উপজেলা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("উপজেলা ভুল ফরম্যাটে আছে"),
  query("upaCityType")
    .notEmpty()
    .withMessage("Upazila/City Corporation type is required")
    .bail()
    .isIn(["UPA", "CITY"])
    .withMessage("Upazila/City Corporation type must be in UPA/CITY"),
  query("projectId", "Project id must be a number")
    .notEmpty()
    .withMessage("প্রকল্প দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রকল্প ভুল ফরম্যাটে আছে"),
  query("value")
    .notEmpty()
    .withMessage("Value is required")
    .bail()
    .isIn([1, 2])
    .withMessage("Value must be 1 or 2"),
];

export const getSamityNameByOfficeId = [
  query("officeId")
    .notEmpty()
    .withMessage("অফিস দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("অফিস ভুল ফরম্যাটে আছে"),
  query("projectId")
    .notEmpty()
    .withMessage("প্রকল্প দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রকল্প ভুল ফরম্যাটে আছে"),
];

export const getSamityNameByOffice = [
  query("officeId")
    .notEmpty()
    .withMessage("অফিস দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("অফিস ভুল ফরম্যাটে আছে"),
  query("projectId")
    .notEmpty()
    .withMessage("প্রকল্প দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রকল্প ভুল ফরম্যাটে আছে"),
  query("value")
    .notEmpty()
    .withMessage("Value is required")
    .bail()
    .isIn([1, 2])
    .withMessage("Value must be 1 or 2"),
];

export const getMemberReport = [
  query("page")
    .notEmpty()
    .withMessage("Page is required")
    .bail()
    .isInt({ min: 1 })
    .withMessage("Page must be a number"),
  query("limit")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Limit must be a number"),
  query("officeId")
    .notEmpty()
    .withMessage("অফিস দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("অফিস ভুল ফরম্যাটে আছে"),
  query("id")
    .notEmpty()
    .withMessage("সমিতি দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সমিতি ভুল ফরম্যাটে আছে"),
];

export const generateMemberReport = [
  query("officeId")
    .notEmpty()
    .withMessage("অফিস দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("অফিস ভুল ফরম্যাটে আছে"),
  query("id")
    .notEmpty()
    .withMessage("সমিতি দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সমিতি ভুল ফরম্যাটে আছে"),
];
