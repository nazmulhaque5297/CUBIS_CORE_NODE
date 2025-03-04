import { Response, Request, NextFunction } from "express";
import { ValidationChain, validationResult } from "express-validator";
import BadRequestError from "../errors/bad-request.error";
import { RequestValidationError } from "../errors/request-validation.error";
import lo from "lodash";

export function validates(
  validators: ValidationChain[],
  allowExtraFields: Boolean = false
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!allowExtraFields) {
        // check for extra field exists or not
        const { isExtraFieldExists, allowedFields } = extraFieldCheck(
          validators,
          req
        );
        if (isExtraFieldExists)
          next(
            new BadRequestError(
              "Only whitelisted keys are allowed",
              allowedFields
            )
          );
      }

      await Promise.all(validators.map((v) => v.run(req)));
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        next(new RequestValidationError(errors.array()));
      }

      next();
    } catch (ex: any) {
      next(new BadRequestError(ex.toString()));
    }
  };
}

function extraFieldCheck(
  validators: ValidationChain[],
  req: Request
): {
  isExtraFieldExists: boolean;
  allowedFields: string[];
} {
  // allowrd fields extractions from validators
  const allowedFields: string[] = validators
    .reduce((fields: any, rule: any) => {
      return [...fields, ...rule.builder.fields];
    }, [])
    .sort()
    .map((f: string) => f.split(".")[0]);

  // requested fields in body, query, params
  const requestFields: string[] = Object.keys({
    ...req.body,
    ...req.params,
    ...req.query,
  }).sort();  

  const intersection: string[] = lo.intersection(allowedFields, requestFields);

  if (intersection.length === requestFields.length) {
    return {
      isExtraFieldExists: false,
      allowedFields: allowedFields,
    };
  }

  return {
    isExtraFieldExists: true,
    allowedFields: allowedFields,
  };
}
