/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-12-06 10:28:23
 * @modify date 2021-12-06 10:28:23
 * @desc [description]
 */

import { body, param } from "express-validator";

export const createCitizenRoleFeature = [
  body("citizenRoleId").notEmpty().withMessage("citizenRoleId is required"),
  body("featureId").notEmpty().withMessage("featureId is required"),
];

export const deleteCitizenRoleFeature = [
  param("id").notEmpty().withMessage("id is required"),
];

export const updateCitizenRoleFeature = [
  ...createCitizenRoleFeature,
  ...deleteCitizenRoleFeature,
];
