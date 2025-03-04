import { body, CustomSanitizer, param, query } from "express-validator";

const toInt: CustomSanitizer = (value) => {
  return value.map((v: any) => {
    return parseInt(v);
  });
};

export const createRole = [
  body("roleName", "Name must be in range 1 to 50 characters")
    .isLength({ min: 1, max: 50 })
    .trim(),
  body("description", "Name must be in range 1 to 50 characters")
    .isLength({ min: 1, max: 500 })
    .trim(),
  body("isActive").isBoolean(),
  body("features").isArray({ min: 0 }).customSanitizer(toInt),
];

export const getRoleWithFilter = [
  query("page", "Invalid page number provided").isInt({ min: 1 }),
  query("limit", "Invalid page number provided").optional().isInt({ min: 1 }),
  query("roleName", "Name must be in range 1 to 50 characters")
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim(),
  query("isActive").optional().isBoolean(),
  query("approveStatus", "Approve status must be in A, P, R")
    .optional()
    .isIn(["A", "P", "R"]),
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
];

export const getRoleById = [
  param("id", "Invalid id number provided").isInt({ min: 1 }),
];

export const updateRole = [
  param("id", "Invalid id number provided").isInt({ min: 1 }),
  body("roleName", "Name must be in range 1 to 50 characters")
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim(),
  body("description", "Name must be in range 1 to 50 characters")
    .optional()
    .isLength({ min: 1, max: 500 })
    .trim(),
  body("isActive").optional().isBoolean(),
  // body('approveStatus', "Approve status must be in A, P, R")
  //     .optional().isIn(["A", "P", "R"]),
  body("features").optional().isArray({ min: 1 }).customSanitizer(toInt),
];

export const approveRole = [
  param("id", "Invalid id number provided").isInt({ min: 1 }),
  body("approveStatus", "Approve status must be in A, P").isIn(["A", "P", "R"]),
];
