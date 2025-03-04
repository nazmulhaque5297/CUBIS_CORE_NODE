import { body, param } from "express-validator";
import { BadRequestError } from "rdcd-common";
import { Container } from "typedi";
import ServiceInfoServices from "../services/service-info.service";

export const applicationApprovalValidator = [
  body("serviceId")
    .notEmpty()
    .withMessage("সেবার আইডি দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সেবার আইডি সঠিক নয়"),
  body("applicationId")
    .notEmpty()
    .withMessage("আবেদনের আইডি দেওয়া আবশ্যক")
    .bail()
    .isInt()
    .withMessage("আবেদনের আইডি সঠিক নয়"),
  body("remarks").optional().isString().withMessage("মন্তব্য সঠিক নয়"),
  body("serviceActionId")
    .notEmpty()
    .withMessage("সেবার কার্যক্রম দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সেবার কার্যক্রম সঠিক নয়"),
  body("nextAppDesignationId").custom(async (value, { req }) => {
    const ServiceInfoService = Container.get(ServiceInfoServices);
    const serviceAction = await ServiceInfoService.getServiceActionById(req.body.serviceId, req.body.serviceActionId);
    if (serviceAction.applicationStatus === "O" || serviceAction.applicationStatus === "C") {
      return true;
    }
    if (!serviceAction.isFinal && (!value || isNaN(value)))
      throw new BadRequestError(`অনুমোদন ব্যতীত সকল কর্মকান্ডের জন্য কর্মকর্তার নাম দেওয়া আবশ্যক`);
    else return true;
  }),
  body("projectId")
    .notEmpty()
    .withMessage("প্রকল্পের নাম দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 0 })
    .withMessage("প্রকল্পের নাম সঠিক নয়"),
  body("attachment").optional(),
  body("payload").notEmpty().withMessage("পেলোড বিদ্যমান নেই").optional(),
];

export const getByApplicationIdValidator = [
  param("applicationId").isNumeric().withMessage("আবেদনের আইডি অবশ্যই নম্বর হতে হবে"),
];
