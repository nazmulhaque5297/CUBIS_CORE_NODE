import { body, param, query } from "express-validator";
import { isExistsByColumn } from "rdcd-common";
import Container from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { employeeInformationEntryRequestValidator } from "../../employee-management/validators/employee-information-entry.validator";
import { ApplicationServices } from "../services/application.service";
import ServiceInfoServices from "../services/service-info.service";
import { committeeRequest, committeeRequestUpdate } from "./coop/application/committee-request.validator";
import { abasayanRequest, abasayanRequestUpdate } from "./coop/application/abasayan.validator";
import {
  manualSamityMigrationRequest,
  samityMigrationUpdate,
} from "./coop/application/manual-samity-migration.validator";
import {
  nameClearanceGet,
  nameClearanceRequest,
  nameClearanceUpdate,
} from "./coop/application/name-clearance-request.validator";

import { memberInfomationCorrectionRequest } from "./coop/application/member-information-correction-request.validate";

import { byLawsAmendment } from "./coop/application/bylaws-amendment.validator";
import { auditAccouts } from "./coop/application/audit-accouts.validator";
import { investmentRequest, investmentRequestUpdate } from "./coop/application/investment.validator";
import { auditRequest, auditRequestUpdate } from "./coop/application/audit.validator";
import { object } from "underscore";
import { samityCorrectionOutBylaws } from "./coop/application/samity-correction-out-by-laws.validator";
import { feeCollectionRequest } from "./coop/application/feeCollection.validator";

export const applicationTypes: any = {
  "committee-request": committeeRequest,
  abasayan: abasayanRequest,
  investment: investmentRequest,
  audit: auditRequest,
  feeCollection: feeCollectionRequest,
  "name-clearance": nameClearanceRequest,
  "samity-migration": manualSamityMigrationRequest,
  "employee-information": employeeInformationEntryRequestValidator,
  "member-information-correction": memberInfomationCorrectionRequest,
  "bylaws-amendment": byLawsAmendment,
  "audit-accounts": auditAccouts,
  "samity-correction-out-bylaws": samityCorrectionOutBylaws,
};

export const applicationTypesUpdate: any = {
  "name-clearance": nameClearanceUpdate,
  "samity-migration": samityMigrationUpdate,
  "member-information-correction": memberInfomationCorrectionRequest,
  "committee-request": committeeRequestUpdate,
  "abasayan": abasayanRequestUpdate,
  "audit": auditRequestUpdate,
  "investment": investmentRequestUpdate,
  "bylaws-amendment": byLawsAmendment,
  "audit-accounts": auditAccouts,
  "samity-correction-out-bylaws": samityCorrectionOutBylaws,
};

export const applicationTypesGet: any = {
  "name-clearance": nameClearanceGet,
};

export const ServiceInfoService = Container.get(ServiceInfoServices);
export const ApplicationService = Container.get(ApplicationServices);

export const validateApplication = [
  param("type").isIn(Object.keys(applicationTypes)).withMessage("Invalid application type"),
  body("samityId").optional(),
  body("serviceName")
    .exists()
    .withMessage("সেবার নাম আবশ্যিক")
    .bail()
    .notEmpty()
    .withMessage("সেবার নাম নির্বাচন করুন")
    .bail()
    .isString()
    .withMessage("সেবার নাম অক্ষরে প্রদান করুন")
    .bail()
    .custom(async (value: any) => {
      const id = await isExistsByColumn("id", "coop.service_info", await pgConnect.getConnection("slave"), {
        service_name_english: value,
      });
    })
    .withMessage("সেবার নাম ডাটাবেসে উপস্থিত নেই"),

  body("nextAppDesignationId")
    .exists()
    .withMessage("nextAppDesignation is not present")
    .notEmpty()
    .withMessage("Next App Designation Id can not be null")
    .optional(),

  body("data")
    .exists()
    .withMessage("Data is required")
    .bail()
    .notEmpty()
    .withMessage("Data cannot be empty")
    .bail()
    .custom((value) => {
      if (typeof value == "object" || Array.isArray(value)) {
        return true;
      }
      return false;
    })
    .withMessage("Data must be object or array"),
];

export const validateApplicationUpdate = [
  param("type").isIn(Object.keys(applicationTypesUpdate)).withMessage("Invalid application type"),
  param("id")
    .exists()
    .withMessage("Id is required")
    .bail()
    .isInt({ min: 1 })
    .withMessage("Id must be integer")
    .custom(async (value) => {
      const isIdExist = await isExistsByColumn("id", "coop.application", await pgConnect.getConnection("slave"), {
        id: value,
      });
      return isIdExist ? true : Promise.reject();
    })
    .withMessage("Invalid application id")
    .bail(),
  body("samityId").optional(),
  body("serviceName")
    .exists()
    .withMessage("Service Name is required")
    .bail()
    .notEmpty()
    .withMessage("Service Name cannot be empty")
    .bail()
    .isString()
    .withMessage("Service Name must be string")
    .custom(async (value: any) => {
      const id = await isExistsByColumn("id", "coop.service_info", await pgConnect.getConnection("slave"), {
        service_name_english: value,
      });
      return id ? true : Promise.reject();
    })
    .withMessage("Service Name is not present in database"),
  body("nextAppDesignationId")
    .exists()
    .withMessage("nextAppDesignation is not present")
    .notEmpty()
    .withMessage("Next App Designation Id can not be null")
    .optional(),
  body("data")
    .exists()
    .withMessage("Data is required")
    .bail()
    .notEmpty()
    .withMessage("Data cannot be empty")
    .bail()
    .isObject()
    .withMessage("Data must be object"),
];

export const applicationIdValidates = [
  param("id")
    .isNumeric()
    .withMessage("Id must be a number")
    .custom(async (value) => {
      const isIdExist = await isExistsByColumn("id", "coop.application", await pgConnect.getConnection("slave"), {
        id: value,
      });

      return isIdExist ? true : Promise.reject();
    })
    .withMessage("Id is not present in database")
    .custom(async (value) => {
      const isApplicationApprove: boolean = await ApplicationService.isApplicationApprove(parseInt(value));

      return isApplicationApprove ? Promise.reject() : true;
    })
    .withMessage("আবেদনটি অনুমোদিত হয়েছে। বাতিল গ্রহণযোগ্য নয়"),
];

export const applicationDeleteValidates = [
  param("id")
    .isNumeric()
    .withMessage("Id must be a number")
    .custom(async (value) => {
      const isIdExist = await isExistsByColumn("id", "coop.application", await pgConnect.getConnection("slave"), {
        id: value,
      });

      return isIdExist ? true : Promise.reject();
    })
    .withMessage("Id is not present in database")
    .custom(async (value) => {
      const isDeleteationValid: boolean = await ApplicationService.isApplicationValidForDelete(parseInt(value));

      return isDeleteationValid ? true : Promise.reject();
    })
    .withMessage("আবেদনটির  সাপেক্ষে কার্য সম্পন্ন হয়েছে। বাতিল গ্রহণযোগ্য নয় "),
];

export const validateApplicationGet = [query().notEmpty().withMessage("query param can not be null")];
