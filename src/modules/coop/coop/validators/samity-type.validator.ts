import { body } from "express-validator";

export const validateSamityType = [
  body("samityTypeName", "samityTypeName is null").exists().notEmpty().trim().toLowerCase(),
  body("description", "Description is null").exists().notEmpty().trim().toLowerCase(),
  body("operationDate", "OperationDate is null").exists().notEmpty().trim().toLowerCase(),
];
