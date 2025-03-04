/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-12-27 15:06:09
 * @modify date 2021-12-27 15:06:09
 * @desc [description]
 */

import { body, CustomValidator } from "express-validator";

export const samityId = body("samityId")
  .exists()
  .withMessage("Samity Id is required")
  .bail()
  .trim()
  .notEmpty()
  .withMessage("Samity Id cannot be empty")
  .bail()
  .isInt()
  .withMessage("Samity Id must be integer");

export const customMobileNumber: CustomValidator = (value, { req }) => {};
