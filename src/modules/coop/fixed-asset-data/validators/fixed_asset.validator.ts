import { body } from "express-validator";

export const fixedAssetData = [
  body("id").optional().isInt().withMessage("সঠিক আইডি প্রদান করুন"),
  body("itemName").isString().withMessage("সঠিক নাম প্রদান করুন").notEmpty().withMessage("আইটেম নাম প্রদান করুন"),
  body("itemCode").isString().withMessage("সঠিক কোড প্রদান করুন").notEmpty().withMessage("আইটেম কোড প্রদান করুন"),
  body("isActive").isBoolean().withMessage("সঠিক স্টাটাস প্রদান করুন").notEmpty().withMessage("স্টাটাস প্রদান করুন"),
  body("categoryId")
    .optional()
    .isInt()
    .withMessage("সঠিক ক্যাটাগরি প্রদান করুন")
    .notEmpty()
    .withMessage("ক্যাটাগরি প্রদান করুন"),
  body("description").optional(),
];

export const purchaseFixedAssetData = [
  body("purchaseDetails.itemId")
    .isInt({ min: 1 })
    .withMessage("সঠিক আইটেম আইডি প্রদান করুন")
    .notEmpty()
    .withMessage("আইটেম আইডি প্রদান করুন"),
  body("purchaseDetails.itemQuantity")
    .isInt({ min: 1 })
    .withMessage("সঠিক সংখ্যা প্রদান করুন")
    .notEmpty()
    .withMessage("আইটেম সংখ্যা প্রদান করুন"),
  body("purchaseDetails.itemUnitPrice")
    .isInt({ min: 1 })
    .withMessage("সঠিক দাম প্রদান করুন")
    .notEmpty()
    .withMessage("আইটেমের দাম  প্রদান করুন"),
  body("purchaseDetails.purchasedBy")
    .isString()
    .withMessage("ক্রেতার সঠিক নাম প্রদান করুন")
    .notEmpty()
    .withMessage("ক্রেতার নাম প্রদান করুন"),
  body("purchaseDetails.purchaseDate").notEmpty().withMessage("ক্রয় করার তারিখ প্রদান করুন"),
  body("purchaseDetails.samityId").notEmpty().withMessage("সমিতি আইডি অনুপস্থিত"),
  body("purchaseDetails.description").optional(),
  body("assetDetails").optional(),
  body("isdelete").optional(),
];

export const assetinfo = [body("status").notEmpty().withMessage("স্ট্যাটাস প্রদান করুন")];
