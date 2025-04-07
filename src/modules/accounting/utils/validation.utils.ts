import { body } from "express-validator";

export const validationExistAndNotEmpty = (memberValidationArray: any) => {
  return body(memberValidationArray.key)
    .exists()
    .withMessage(memberValidationArray.existmessage)
    .bail()
    .notEmpty()
    .withMessage(memberValidationArray.emptyMessage)
    .bail();
};
