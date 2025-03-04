/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-12-05 12:32:50
 * @modify date 2021-12-05 12:32:50
 * @desc [description]
 */

import { body, param, query } from "express-validator";

export const createCitizenRole = [
  body("roleName", "Name must be in range 1 to 50 characters")
    .isLength({ min: 1, max: 50 })
    .trim(),
  body("description", "Name must be in range 1 to 500 characters")
    .isLength({ min: 1, max: 500 })
    .trim(),
  body("isActive").isBoolean(),
];

export const getCitizenRoleWithFilter = [
  query("page", "Invalid page number provided").optional().isInt({ min: 1 }),
  query("limit", "Invalid page number provided").optional().isInt({ min: 1 }),
  query("roleName", "Name must be in range 1 to 50 characters")
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim(),
  query("isActive").optional().isBoolean(),
  query("createdBy", "Name must be in range 1 to 50 characters")
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim(),
  query("updatedBy", "Name must be in range 1 to 50 characters")
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim(),
];

export const updateCitizenRole = [
  param("id", "Invalid id number provided").isInt({ min: 1 }),
  ...createCitizenRole,
];

export const deleteCitizenRole = [
  param("id", "Invalid id number provided").isInt({ min: 1 }),
];
