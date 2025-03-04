import { body } from "express-validator";

export const createDisburse = [
  body("data.samityId")
    .notEmpty()
    .withMessage("সমিতি দেওয়া আবশ্যক")
    .bail()
    .isInt()
    .withMessage("সমিতি সঠিকভাবে উল্লেখ করুন"),
  body("data.productId")
    .notEmpty()
    .withMessage("প্রোডাক্ট দেওয়া আবশ্যক")
    .bail()
    .isInt()
    .withMessage("প্রোডাক্ট সঠিকভাবে উল্লেখ করুন"),
  body("data.projectId")
    .notEmpty()
    .withMessage("প্রকল্প দেওয়া আবশ্যক")
    .bail()
    .isInt()
    .withMessage("প্রকল্প সঠিকভাবে উল্লেখ করুন"),
  body("data.customerId")
    .notEmpty()
    .withMessage("সদস্য দেওয়া আবশ্যক")
    .bail()
    .isInt()
    .withMessage("সদস্য সঠিকভাবে উল্লেখ করুন"),
  body("data.transaction.type")
    .notEmpty()
    .withMessage("লেনদেনের ধরণ দেওয়া আবশ্যক")
    .bail()
    .isIn(["cash", "cheque"])
    .withMessage("লেনদেনের ধরণ সঠিকভাবে উল্লেখ করুন"),
  body("data.transaction.narration")
    .notEmpty()
    .withMessage("লেনদেনের বিবরণ দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("লেনদেনের বিবরণ ১-২৫০ অক্ষরের মধ্যে হতে হবে"),
];
