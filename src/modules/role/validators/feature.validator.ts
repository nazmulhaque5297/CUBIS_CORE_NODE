import { body, param, query } from "express-validator";

export const createFeature = [
  body("featureName")
    .notEmpty()
    .withMessage("ফিচারের ইংরেজি নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 100 })
    .withMessage("ফিচারের ইংরেজি নাম ১-১০০ অক্ষরের মধ্যে হতে হবে")
    .trim(),
  body("featureNameBan")
    .notEmpty()
    .withMessage("ফিচারের বাংলা নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 100 })
    .withMessage("ফিচারের বাংলা নাম ১-১০০ অক্ষরের মধ্যে হতে হবে")
    .trim(),
  body("url")
    .notEmpty()
    .withMessage("পেইজের ইউআরএল দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 3 })
    .withMessage("পেইজের ইউআরএল দেওয়া আবশ্যক")
    .trim(),
  body("isRoot")
    .notEmpty()
    .withMessage("ফিচারের রুটের অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isBoolean()
    .withMessage("ফিচারের রুটের অবস্থা বুলিয়ান হতে হবে"),
  body("type")
    .notEmpty()
    .withMessage("ফিচারের ধরণ(প্যারেন্ট/চাইল্ড) দেওয়া আবশ্যক")
    .bail()
    .isIn(["P", "C"])
    .withMessage("ফিচারের ধরণ(প্যারেন্ট/চাইল্ড) সঠিকভাবে উল্লেখ করুন"),
  body("position")
    .notEmpty()
    .withMessage("ফিচারের পজিশন দেওয়া আবশ্যক")
    .bail()
    .isIn(["SIDE", "NAV", "CONT"])
    .withMessage("ফিচারের পজিশন সঠিকভাবে উল্লেখ করুন"),
  body("iconId").notEmpty().withMessage("ফিচারের আইকন আইডি দেওয়া আবশ্যক").trim(),
  body("parentId").isInt({ min: 1 }).optional({ nullable: true }),
  body("isActive")
    .notEmpty()
    .withMessage("ফিচারের একটিভ স্ট্যাটাস দেওয়া আবশ্যক")
    .bail()
    .isBoolean()
    .withMessage("ফিচারের একটিভ স্ট্যাটাস বুলিয়ানে হতে হবে"),
  body("serialNo").notEmpty().withMessage("ডিসপ্লে সিরিয়াল নং দেওয়া আবশ্যক").bail().trim(),
];

export const updateFeature = [
  param("id", "ফিচারের সঠিক আইডি উল্লেখ করুন").isInt({ min: 1 }),
  body("featureName")
    .notEmpty()
    .withMessage("ফিচারের ইংরেজি নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 100 })
    .withMessage("ফিচারের ইংরেজি নাম ১-১০০ অক্ষরের মধ্যে হতে হবে")
    .trim(),
  body("featureNameBan")
    .notEmpty()
    .withMessage("ফিচারের বাংলা নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 100 })
    .withMessage("ফিচারের বাংলা নাম ১-১০০ অক্ষরের মধ্যে হতে হবে")
    .trim(),
  body("url")
    .notEmpty()
    .withMessage("পেইজের ইউআরএল দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 3 })
    .withMessage("পেইজের ইউআরএল দেওয়া আবশ্যক")
    .trim(),
  body("isRoot")
    .notEmpty()
    .withMessage("ফিচারের রুটের অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isBoolean()
    .withMessage("ফিচারের রুটের অবস্থা বুলিয়ান হতে হবে"),
  body("type")
    .notEmpty()
    .withMessage("ফিচারের ধরণ(প্যারেন্ট/চাইল্ড) দেওয়া আবশ্যক")
    .bail()
    .isIn(["P", "C"])
    .withMessage("ফিচারের ধরণ(প্যারেন্ট/চাইল্ড) সঠিকভাবে উল্লেখ করুন"),
  body("position")
    .notEmpty()
    .withMessage("ফিচারের পজিশন দেওয়া আবশ্যক")
    .bail()
    .isIn(["SIDE", "NAV", "CONT"])
    .withMessage("ফিচারের পজিশন সঠিকভাবে উল্লেখ করুন"),
  body("iconId").notEmpty().withMessage("ফিচারের আইকন আইডি দেওয়া আবশ্যক").trim(),
  body("parentId").isInt({ min: 1 }).optional({ nullable: true }),
  body("isActive")
    .notEmpty()
    .withMessage("ফিচারের একটিভ স্ট্যাটাস দেওয়া আবশ্যক")
    .bail()
    .isBoolean()
    .withMessage("ফিচারের একটিভ স্ট্যাটাস বুলিয়ানে হতে হবে"),
    body("serialNo").notEmpty().withMessage("ডিসপ্লে সিরিয়াল নং দেওয়া আবশ্যক").bail().trim(),
];

export const getFeatureWithFilter = [
  query("page", "পেইজের নম্বর সঠিকভাবে উল্লেখ করুন").optional().isInt({ min: 1 }),
  query("limit", "পেইজের লিমিট সঠিকভাবে উল্লেখ করুন").optional().isInt({ min: 1 }),
  query("getAll", "Input as boolean").optional().isBoolean(),
  query("id", "ফিচারের সঠিক আইডি উল্লেখ করুন").optional().isInt({ min: 1 }),
  query("featureName", "ফিচারের ইংরেজি নাম ১-১০০ অক্ষরের মধ্যে হতে হবে")
    .optional()
    .isLength({ min: 1, max: 100 })
    .trim(),
  query("serialNo", "serialNo must be min 1 character").optional().isLength({ min: 1 }).trim(),
  query("url", "URL must be min 3 character").optional().isLength({ min: 3 }).trim().optional(),
  query("isRoot", "ফিচারের রুটের অবস্থা বুলিয়ান হতে হবে").optional().isBoolean(),
  query("type", "ফিচারের ধরণ(প্যারেন্ট(P)/চাইল্ড(C)) উল্লেখ করুন").optional().isIn(["P", "C"]).optional(),
  query("position", "Allowed position SIDE, NAV, CONT").optional().isIn(["SIDE", "NAV", "CONT"]).optional(),
  query("parentId").optional().isInt({ min: 1 }).optional({ nullable: true }),
  query("isActive").optional().isBoolean().optional(),
];

export const deleteFeatrue = [param("id", "ফিচারের সঠিক আইডি উল্লেখ করুন").isInt({ min: 1 })];
