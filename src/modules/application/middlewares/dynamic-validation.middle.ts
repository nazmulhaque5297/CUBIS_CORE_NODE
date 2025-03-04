/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-12-28 17:57:16
 * @modify date 2021-12-28 17:57:16
 * @desc [description]
 */

import { NextFunction, Request, Response } from "express";
import { ValidationChain } from "express-validator";
import { validates } from "../../../middlewares/express-validation.middle";
import { applicationTypes } from "../validators/application.validator";

export function dynamicValidates(
  validators: ValidationChain[],
  allowExtraFields: Boolean = true
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const type: string = req.params.type as string;
    return validates(
      [...validators, ...applicationValidation(type)],
      allowExtraFields
    )(req, res, next);
  };
}

const applicationValidation = (s: string): ValidationChain[] => {
  return applicationTypes[s] ? applicationTypes[s] : [];
};
