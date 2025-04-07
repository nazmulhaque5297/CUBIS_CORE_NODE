/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-12-01 12:02:02
 * @modify date 2021-12-01 12:02:02
 * @desc [description]
 */

import { body } from "express-validator";

export const validateSamityAuthorizedPerson = [
  body("samityId").not().isEmpty().withMessage("Samity Id is required"),
  body("userId").not().isEmpty().withMessage("Citizen Id is required"),
  body("effectDate").not().isEmpty().withMessage("Effect Date is required"),
];
