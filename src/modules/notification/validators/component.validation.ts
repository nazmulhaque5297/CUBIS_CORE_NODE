/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-06-19 15:03:10
 * @modify date 2022-06-19 15:03:10
 * @desc [description]
 */

import { param, query } from "express-validator";

export const componentValidation = [query("readStatus").optional().isBoolean()];

export const componentValidationRead = [param("id").isInt({ min: 1 }).withMessage("id must be a number")];
