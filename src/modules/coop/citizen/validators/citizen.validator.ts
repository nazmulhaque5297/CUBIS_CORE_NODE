/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-28 16:18:08
 * @modify date 2021-11-28 16:18:08
 * @desc [description]
 */

import { query } from "express-validator";

export const getCitizenWithFilter = [
  query("page", "Invalid page number provided").isInt({ min: 1 }),
  query("limit", "Invalid page number provided").optional().isInt({ min: 1 }),
  query("id", "Invalid id provided").optional().isInt({ min: 1 }),
  query("mobile", "Invalid mobile provided")
    .optional()
    .isLength({ min: 1, max: 11 }),
  query("email", "Invalid email provided")
    .optional()
    .isEmail()
    .isLength({ min: 1, max: 50 }),
  query("nid", "Invalid nid provided").optional().isLength({ min: 1, max: 20 }),
  query("name", "Invalid name provided")
    .optional()
    .isLength({ min: 1, max: 100 }),
  query("nameBangla", "Invalid nameBangla provided")
    .optional()
    .isLength({ min: 1, max: 120 }),
  query("dob", "Invalid Date of Birth provided").optional(),
  query("occupation", "Invalid Occupation provided")
    .optional()
    .isString()
    .isLength({ min: 1, max: 30 }),
  query("religion", "Invalid Religion provided")
    .optional()
    .isString()
    .isLength({ min: 1, max: 15 }),
  query("type", "Invalid Type provided")
    .optional()
    .isString()
    .isLength({ min: 1, max: 20 }),
  query("createdAt", "Invalid createdAt provided").optional(),
  query("updatedAt", "Invalid updatedAt provided").optional(),
  query("createdBy", "Invalid createdBy provided")
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 }),
  query("updatedBy", "Invalid updatedBy provided")
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 }),
];
