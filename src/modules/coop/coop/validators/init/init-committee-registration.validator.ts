/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-16 17:58:28
 * @modify date 2021-11-16 17:58:28
 * @desc [description]
 */

import { body } from "express-validator";
import { BadRequestError } from "rdcd-common";
import { samityId } from "../../../../../validators/index.validator";

const validateCommitteeMembers = [
  body("committeeMembers").isArray({ min: 1 }).withMessage("Invalid body. Only array is required").bail(),
  body("committeeMembers.*.memberId", "কমিটির সদস্যের নাম নির্বাচন করুন")
    .exists()
    .bail()
    .notEmpty()
    .withMessage("কমিটির সদস্যের নাম নির্বাচন করুন ")
    .bail()
    .trim()
    .isInt({ min: 1 }),
  body("committeeMembers.*.committeeRoleId", "কমিটির সদস্যের পদবি নির্বাচন করুন ")
    .exists()
    .notEmpty()
    .withMessage("কমিটির সদস্যের পদবি নির্বাচন করুন ")
    .isInt(),
];

export const ValidateCommitteeRegistrationInput = [
  samityId,
  body("committeeOrganizer", "সংগঠক নির্বাচন করুন")
    .exists()
    .withMessage("committeeOrganizer Key is not exist")
    .bail()
    .notEmpty()
    .withMessage("কমিটির সংগঠক নির্বাচন করুন")
    .bail()
    .trim()
    .isInt({ min: 1 }),
  body("committeeContactPerson", "কমিটির যোগাযোগের ব্যাক্তি নির্বাচন করুন ")
    .exists()
    .withMessage("committeeContactPerson key is not exist")
    .bail()
    .notEmpty()
    .withMessage("কমিটির যোগাযোগের ব্যাক্তি নির্বাচন করুন ")
    .bail()
    .trim()
    .bail()
    .isInt({ min: 1 }),
  body("isMemberOfCentalOrNational", "সমিতিটি কেন্দ্রীয়/জাতীয় সমিতির সদস্য ভুক্ত হবেকিনা যাচাই করুন")
    .exists()
    .bail()
    .notEmpty()
    .bail()
    .custom((value: any, { req }) => {
      if (value) {
        if (req.body.committeeSignatoryPerson) {
          return true;
        } else {
          throw new BadRequestError("কেন্দ্রীয় অথবা জাতীয় স্বাক্ষরের ব্যাক্তি  নির্বাচন করুন ");
        }
      } else if (!value) {
        return true;
      }
    }),
  body("noOfMember", "কমিটির সদস্য সংখ্যা নির্বাচন করুন ")
    .exists()
    .bail()
    .notEmpty()
    .withMessage("কমিটির সদস্য সংখ্যা নির্বাচন করুন ")
    .bail()
    .isInt()
    .bail()
    .isIn([6, 9, 12])
    .withMessage("কমিটির সদস্য সংখ্যা ৬,৯,১২ এর মধ্যে হতে হবে "),

  body("").custom((value) => {
    if (value.committeeMembers.length === value.noOfMember) {
      return true;
    }
    throw new BadRequestError("Invalid body. No of member must be equal to no of committee members");
  }),

  ...validateCommitteeMembers,
];
