/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-05-23 10:03:38
 * @modify date 2022-05-23 10:03:38
 * @desc [description]
 */

import { query } from "express-validator";

export const validateSamityCertificate = [query("samityId").exists().bail().notEmpty()];
