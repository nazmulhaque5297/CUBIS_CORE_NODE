import { body } from "express-validator";

export const validateSamityCreate = [
  body("data.basic.flag")
    .notEmpty()
    .withMessage("সমিতির ফ্ল্যাগ দেওয়া আবশ্যক")
    .bail()
    .isIn(["1", "2", "3", "4"])
    .withMessage("সমিতির ফ্ল্যাগ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.address")
    .notEmpty()
    .withMessage("সমিতির ঠিকানা দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("সমিতির ঠিকানা ১-২৫০ অক্ষরের মধ্যে হতে হবে")
    .trim(),
  body("data.basic.foCode")
    .notEmpty()
    .withMessage("মাঠকর্মী দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("মাঠকর্মী সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("projectId")
    .notEmpty()
    .withMessage("প্রকল্প দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রকল্প সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.districtId")
    .notEmpty()
    .withMessage("জেলা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("জেলা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.upaCityId")
    .notEmpty()
    .withMessage("উপজেলা/সিটি কর্পোরেশন দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("উপজেলা/সিটি কর্পোরেশন সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.upaCityType")
    .notEmpty()
    .withMessage("উপজেলা/ সিটি কর্পোরেশনের ধরণ দেওয়া আবশ্যক")
    .bail()
    .isIn(["UPA", "CITY"])
    .withMessage("উপজেলা/ সিটি কর্পোরেশনের ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.uniThanaPawId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("ইউনিয়ন/থানা/পৌরসভা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.uniThanaPawType")
    .optional({ nullable: true })
    .isIn(["UNI", "THANA", "PAW"])
    .withMessage("ইউনিয়ন/থানা/পৌরসভার ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.samityName")
    .notEmpty()
    .withMessage("সমিতির নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("সমিতির নাম ১-২৫০ অক্ষরের মধ্যে হতে হবে")
    .trim(),
  body("data.basic.workPlaceLat")
    .optional({ nullable: true })
    .isString()
    .withMessage("Please enter a valid lattitude")
    .trim(),
  body("data.basic.workPlaceLong")
    .optional({ nullable: true })
    .isString()
    .withMessage("Please enter a valid longitude")
    .trim(),
  body("data.basic.meetingType")
    .notEmpty()
    .withMessage("সমিতির মিটিং এর ধরণ দেওয়া আবশ্যক")
    .isIn(["M", "W"])
    .withMessage("সমিতির মিটিং এর ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.weekPosition")
    .optional({ nullable: true })
    .isIn([1, 2, 3, 4])
    .withMessage("সমিতির মিটিং এর সপ্তাহের পজিশন সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.meetingDay")
    .notEmpty()
    .withMessage("সমিতির মিটিং এর দিন দেওয়া আবশ্যক")
    .isInt({ min: 1 })
    .withMessage("সমিতির মিটিং এর দিন সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("data.basic.workAreaRadius")
    .optional({ nullable: true })
    .isInt({ max: 50 })
    .withMessage("Working area radius must be less than 50 meter")
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
];
