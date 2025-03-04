/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2023-01-30 11:37:55
 * @modify date 2023-01-30 11:37:55
 * @desc [description]
 */

import { query } from "express-validator";

export const validateJasper = [query("id").exists().withMessage("সঠিক আইডি প্রদান করুন")];
