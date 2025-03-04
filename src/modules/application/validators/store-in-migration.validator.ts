import { body } from "express-validator";
export const storeInMigrationValidator = [
  body("data")
    .exists()
    .withMessage("মাইগ্রেশন এর ডাটা প্রদান করুন")
    .notEmpty()
    .withMessage("মাইগ্রেশন এর ডাটা প্রদান করুন")
    .isObject()
    .withMessage("মাইগ্রেশন এর ডাটা প্রদান করুন"),
  body("data.itemData")
    .notEmpty()
    .withMessage("মাইগ্রেশন এর ডাটা প্রদান করুন")
    .exists()
    .withMessage("মাইগ্রেশন এর ডাটা প্রদান করুন")
    .isArray({ min: 1 })
    .withMessage("মাইগ্রেশন এর ডাটা প্রদান করুন"),
  body("data.itemData.*.itemId")
    .notEmpty()
    .withMessage("আইটেমের নাম প্রদান করুন")
    .exists()
    .withMessage("আইটেমের নাম প্রদান করুন")
    .isInt()
    .withMessage("আইটেমের নাম প্রদান করুন"),
  body("data.itemData.*.storeId")
    .notEmpty()
    .withMessage("স্টোরের নাম প্রদান করুন")
    .exists()
    .withMessage("স্টোরের নাম প্রদান করুন")
    .isInt()
    .withMessage("স্টোরের নাম প্রদান করুন"),
  body("data.itemData.*.quantity")
    .notEmpty()
    .withMessage("আইটেমের পরিমাণ প্রদান করুন")
    .exists()
    .withMessage("আইটেমের পরিমাণ প্রদান করুন")
    .isInt()
    .withMessage("আইটেমের পরিমাণ প্রদান করুন"),
  body("nextAppDesignationId")
    .exists()
    .withMessage("অনুমোদনকারীর নাম প্রদান করুন")
    .notEmpty()
    .withMessage("অনুমোদনকারীর নাম প্রদান করুন")
    .isInt()
    .withMessage("অনুমোদনকারীর নাম প্রদান করুন"),
];
