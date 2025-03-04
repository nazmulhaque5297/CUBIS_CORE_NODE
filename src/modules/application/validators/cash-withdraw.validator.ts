import { body } from "express-validator";

export const validateCashWithdraw = [
  body("projectId")
    .notEmpty()
    .withMessage("প্রকল্পের নাম আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রকল্পের নাম সঠিকভাবে উল্লেখ করুন"),
  body("samityId")
    .notEmpty()
    .withMessage("সমিতির নাম দেওয়া আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সমিতির নাম সঠিকভাবে উল্লেখ করুন"),
  body("nextAppDesignationId")
    .notEmpty()
    .withMessage("অনুমোদনকারী/পর্যবেক্ষকের নাম দেওয়া আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("অনুমোদনকারী/পর্যবেক্ষকের নাম সঠিকভাবে উল্লেখ করুন"),
  body("remarks")
    .notEmpty()
    .withMessage("মন্তব্য দেওয়া আবশ্যক")
    .bail()
    .isString()
    .withMessage("মন্তব্য সঠিকভাবে উল্লেখ করুন"),
  body("data.projectId")
    .notEmpty()
    .withMessage("প্রকল্পের নাম আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রকল্পের নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.samityId")
    .notEmpty()
    .withMessage("সমিতির নাম দেওয়া আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সমিতির নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.customerId")
    .notEmpty()
    .withMessage("সদস্যের নাম দেওয়া আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.accountId")
    .notEmpty()
    .withMessage("সদস্যের অ্যাকাউন্ট দেওয়া আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের অ্যাকাউন্ট সঠিকভাবে উল্লেখ করুন"),
  body("data.withdrawAmount")
    .notEmpty()
    .withMessage("নগদ উত্তোলনের পরিমাণ দেওয়া আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("নগদ উত্তোলনের পরিমাণ সঠিকভাবে উল্লেখ করুন"),
  body("data.remarks")
    .notEmpty()
    .withMessage("মন্তব্য দেওয়া আবশ্যক")
    .bail()
    .isString()
    .withMessage("মন্তব্য সঠিকভাবে উল্লেখ করুন"),
];
