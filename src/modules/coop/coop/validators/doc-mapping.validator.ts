/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-01-20 13:50:23
 * @modify date 2022-01-20 13:50:23
 * @desc [description]
 */

import { param } from "express-validator";
import Container from "typedi";
import SamityTypeServices from "../services/samity-type.service";

export const validateGetDocMapping = [
  param("samityTypeId")
    .isInt()
    .withMessage("Samity type id must be an integer")
    .bail()
    .custom(async (value, { req }) => {
      const SamityTypeService = Container.get(SamityTypeServices);
      const samityTypeId = Number(value);
      if (!(await SamityTypeService.idCheck(samityTypeId))) {
        return Promise.reject();
      }
    })
    .withMessage("Samity type id does not exist"),
];
