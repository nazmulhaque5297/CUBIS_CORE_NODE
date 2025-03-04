import { body } from "express-validator";

export const validateAssignFieldOfficerApplication = [
  body("data.fieldOfficerData.*.designationId")
    .exists()
    .withMessage("কর্মকর্তা/ কর্মচারীর পদবি উল্লেখ করুন")
    .notEmpty()
    .withMessage("কর্মকর্তা/ কর্মচারীর পদবি দেওয়া আবশ্যক"),
  body("data.fieldOfficerData.*.designationBn")
    .exists()
    .withMessage("কর্মকর্তা/ কর্মচারীর পদবির নাম উল্লেখ করুন")
    .notEmpty()
    .withMessage("কর্মকর্তা/ কর্মচারীর পদবির নাম দেওয়া আবশ্যক"),
  body("data.fieldOfficerData.*.employeeId")
    .exists()
    .withMessage("কর্মকর্তা/ কর্মচারী উল্লেখ করুন")
    .notEmpty()
    .withMessage("কর্মকর্তা/ কর্মচারী দেওয়া আবশ্যক"),
  body("data.fieldOfficerData.*.employeeName")
    .exists()
    .withMessage("কর্মকর্তা/ কর্মচারীর নাম উল্লেখ করুন")
    .notEmpty()
    .withMessage("কর্মকর্তা/ কর্মচারীর নাম দেওয়া আবশ্যক")
    .optional(),
];
