import { body } from "express-validator";

export const validateSamityUpdate = [
  body("projectId")
    .notEmpty()
    .withMessage("প্রকল্প দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রকল্প সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.instituteCode")
    .optional({ nullable: true })
    .isLength({ max: 50 })
    .withMessage("মাধ্যমিক বিদ্যালয়ের কোড সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.instituteName")
    .optional({ nullable: true })
    .isLength({ max: 250 })
    .withMessage("মাধ্যমিক বিদ্যালয়ের নাম ২৫০ অক্ষরের মধ্যে হতে হবে")
    .trim(),
  body("data.basic.instituteAddress", "Invalid institute address")
    .optional({ nullable: true })
    .isLength({ max: 100 })
    .withMessage("মাধ্যমিক বিদ্যালয়ের ঠিকানা ১০০ অক্ষরের মধ্যে হতে হবে")
    .trim(),
  body("data.basic.coopRegNumber", "Invalid coopRegNumber")
    .optional({ nullable: true })
    .isLength({ max: 250 })
    .withMessage("সমবায় সমিতির নিবন্ধন নম্বর সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.isSme")
    .optional({ nullable: true })
    .isIn(["true", "false"])
    .withMessage("সিস্টেমের প্রয়োজনে সমিতির অবস্থা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.samityType")
    .optional({ nullable: true })
    .isIn(["S", "G"])
    .withMessage("সমিতির ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.setup.memberMinAge")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সমিতির সদস্যের সর্বনিম্ন বয়স সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.setup.memberMaxAge")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সমিতির সদস্যের সর্বোচ্চ বয়স সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.setup.samityMinMember")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সমিতির সর্বনিম্ন সদস্যের সংখ্যা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.setup.samityMaxMember")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সমিতির সর্বোচ্চ সদস্যের সংখ্যা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.setup.groupMinMember")
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage("সমিতির দলের সর্বনিম্ন সদস্যের সংখ্যা সঠিকভাবে উল্লেখ করুন")
    .trim(),

  body("data.setup.groupMaxMember")
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage("সমিতির দলের সর্বোচ্চ সদস্যের সংখ্যা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.setup.shareAmount", "Invalid share amount is provided")
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage("সমিতির শেয়ার সংখ্যা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.setup.samityMemberType", "Invalid samityMemberType is provided")
    .optional({ nullable: true })
    .isIn(["MAL", "FML", "OTH"])
    .withMessage("সমিতির সদস্যের ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("nextAppDesignationId")
    .notEmpty()
    .withMessage("অনুমোদনকারী/পর্যবেক্ষকের আইডি আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("অনুমোদনকারী/পর্যবেক্ষকের আইডি সঠিকভাবে উল্লেখ করুন"),
];
