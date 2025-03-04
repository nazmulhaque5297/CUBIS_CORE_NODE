import { body, param, query } from "express-validator";
import { isExistsByColumn } from "rdcd-common";
// import { db } from "../../../db/factory/connection.db";
import db from "../../../../db/connection.db";

export const createFeature = [
  body("featureName")
    .custom(async (value: string) => {
      const isFeatureNameExist: Boolean = await isExistsByColumn(
        "id",
        "users.feature",
        await db.getConnection("slave"),
        { featureName: value }
      );
      return isFeatureNameExist ? Promise.reject() : true;
    })
    .withMessage("ফিচার এর ইংলিশ নাম টি বিদ্যমান রয়েছে ")
    .isLength({ min: 1, max: 50 })
    .withMessage("ফিচার এর ইংলিশ নাম ১-৫০ অক্ষরের মধ্যে হতে হবে ")
    .trim(),
  body("featureNameBan", "Name must be in range 1 to 50 characters")
    .custom(async (value: string) => {
      const isFeatureNameExist: Boolean = await isExistsByColumn(
        "id",
        "users.feature",
        await db.getConnection("slave"),
        { featureNameBan: value }
      );
      return isFeatureNameExist ? Promise.reject() : true;
    })
    .withMessage("ফিচার এর বাংলা নাম টি বিদ্যমান রয়েছে ")
    .isLength({ min: 1, max: 50 })
    .withMessage("ফিচার এর বাংলা নাম ১-৫০ অক্ষরের মধ্যে হতে হবে ")
    .trim(),
  body("featureCode")
    .isLength({ min: 1 })
    .withMessage("ফিচার কোড কমপক্ষে ১ ক্যারেক্টার এর হতে হবে")
    .trim(),
  body("url")
    .isLength({ min: 3 })
    .withMessage("url কমপক্ষে ৩ ক্যারেক্টার এর হতে হবে")
    .trim(),
  body("isRoot", "isRoot must be an boolean value").isBoolean(),
  body("type", "Allowed type P, C").isIn(["P", "C"]),
  body("position", "Allowed position SIDE, NAV, CONT").isIn([
    "SIDE",
    "NAV",
    "CONT",
  ]),
  body("iconId", "Icon Id must be min 1 character").isLength({ min: 1 }).trim(),
  body("parentId").isInt({ min: 1 }).optional({ nullable: true }),
  body("isActive").isBoolean(),
];

export const getFeatureWithFilter = [
  query("page", "Invalid page number provided").isInt({ min: 1 }),
  query("limit", "Invalid page number provided").optional().isInt({ min: 1 }),
  query("id", "Invalid id number provided").optional().isInt({ min: 1 }),
  query("featureName", "Name must be in range 1 to 50 characters")
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim(),
  query("featureCode", "Code must be min 1 character")
    .optional()
    .isLength({ min: 1 })
    .trim(),
  query("url", "URL must be min 3 character")
    .optional()
    .isLength({ min: 3 })
    .trim()
    .optional(),
  query("isRoot", "isRoot must be an boolean value").optional().isBoolean(),
  query("type", "Allowed type P, C").optional().isIn(["P", "C"]).optional(),
  query("position", "Allowed position SIDE, NAV, CONT")
    .optional()
    .isIn(["SIDE", "NAV", "CONT"])
    .optional(),
  query("parentId").optional().isInt({ min: 1 }).optional({ nullable: true }),
  query("isActive").optional().isBoolean().optional(),
];

// {
//     "featureCode": "6.0",
//     "featureName": "SAMITY_REGISTRATION",
//     "featureNameBan": "সমিতি ব্যবস্থাপনা",
//     "iconId": "6.0",
//     "isActive": true,
//     "isRoot": true,
//     "parentId": null,
//     "position": "SIDE",
//     "type": "P",
//     "url": "/samity-management/"
//   }

export const updateFeature = [
  param("id", "Invalid id number provided").isInt({ min: 1 }),
  body("featureName", "Name must be in range 1 to 50 characters")
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim(),
  body("featureNameBan", "Name must be in range 1 to 50 characters")
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim(),
  body("featureCode", "Code must be min 1 character")
    .optional()
    .isLength({ min: 1 })
    .trim(),
  body("url", "URL must be min 3 character")
    .optional()
    .isLength({ min: 3 })
    .trim(),
  body("isRoot", "isRoot must be an boolean value").optional().isBoolean(),
  body("type", "Allowed type P, C").optional().isIn(["P", "C"]),
  body("position", "Allowed position SIDE, NAV, CONT")
    .optional()
    .isIn(["SIDE", "NAV", "CONT"]),
  body("iconId", "Icon Id must be min 1 character")
    .optional()
    .isLength({ min: 1 })
    .trim(),
  body("parentId").optional().isInt({ min: 1 }).optional({ nullable: true }),
  body("isActive").optional().isBoolean(),
];

export const deleteFeatrue = [
  param("id", "Invalid id number provided").isInt({ min: 1 }),
];
