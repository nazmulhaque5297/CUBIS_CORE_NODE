import { body, param } from "express-validator";

export const validateDocType = [
  body("name").exists().notEmpty().trim().toLowerCase(),
  body("isActive").exists().notEmpty().trim().toLowerCase().isIn(["i", "a"]), //i=inactive,a=active
];

export const validateDocTypeDel = [param("id").isNumeric()];

export const validateDocTypeUpdate = [...validateDocType, ...validateDocTypeDel];
