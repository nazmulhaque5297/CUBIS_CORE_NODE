import { body, CustomSanitizer, param, query } from "express-validator";

const toInt: CustomSanitizer = (value) => {
  return value.map((v: any) => {
    return parseInt(v);
  });
};

export const createRole = [
  body("roleName", "রোলের নাম ১-১০০ অক্ষরের মধ্যে হতে হবে")
    .isLength({ min: 1, max: 100 })
    .trim(),
  body("description", "রোলের বর্ণনা ২৫০ অক্ষরের মধ্যে হতে হবে")
    .isLength({ min: 0, max: 250 })
    .trim(),
  body("isActive").isBoolean(),
  body("features").isArray({ min: 1 }).customSanitizer(toInt),
];

export const getRoleWithFilter = [
  query("page", "পেইজের নম্বর সঠিকভাবে উল্লেখ করুন")
    .optional()
    .isInt({ min: 1 }),
  query("limit", "পেইজের লিমিট সঠিকভাবে উল্লেখ করুন")
    .optional()
    .isInt({ min: 1 }),
  query("roleName", "রোলের নাম ১-১০০ অক্ষরের মধ্যে হতে হবে")
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim(),
  query("isActive").optional().isBoolean(),
  query("approveStatus", "রোলের অনুমোদনের অবস্থা সঠিকভাবে উল্লেখ করুন")
    .optional()
    .isIn(["A", "P", "R"]),
  query("officeId").optional().isInt(),
  query("approvedBy", "Name must be in range 1 to 50 characters")
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim(),
  query("createdBy", "Name must be in range 1 to 50 characters")
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim(),
  query("updatedBy", "Name must be in range 1 to 50 characters")
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim(),
  query("user")
    .notEmpty()
    .withMessage("User status is required")
    .isInt()
    .withMessage("User status must be an integer")
    .isIn([0, 1])
    .withMessage("User status must be 0 or 1"),
];

export const getRoleById = [
  param("id", "রোলের সঠিক আইডি উল্লেখ করুন").isInt({ min: 1 }),
];

export const updateRole = [
  param("id", "রোলের সঠিক আইডি উল্লেখ করুন").isInt({ min: 1 }),
  body("roleName", "রোলের নাম ১-১০০ অক্ষরের মধ্যে হতে হবে")
    .optional()
    .isLength({ min: 1, max: 100 })
    .trim(),
  body("description", "রোলের বর্ণনা ২৫০ অক্ষরের মধ্যে হতে হবে")
    .optional()
    .isLength({ min: 0, max: 250 })
    .trim(),
  body("isActive").optional().isBoolean(),
  // body('approveStatus', "Approve status must be in A, P, R")
  //     .optional().isIn(["A", "P", "R"]),
  body("features").optional().isArray({ min: 1 }).customSanitizer(toInt),
];

export const approveRole = [
  param("id", "রোলের সঠিক আইডি উল্লেখ করুন").isInt({ min: 1 }),
  body("approveStatus", "রোলের অনুমোদনের অবস্থা সঠিকভাবে উল্লেখ করুন").isIn([
    "A",
    "P",
    "R",
  ]),
];
