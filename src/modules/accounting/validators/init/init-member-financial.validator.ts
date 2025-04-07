import { body, param, query } from "express-validator";
import { omit } from "lodash";
import { isKeyExist } from "rdcd-common";
import Container from "typedi";
import { MemberFinancialServices } from "../../services/init/init-member-financial.service";
import { InitialMemberInfoServices } from "../../services/init/init-member-info.service";
import { SamityRegistrationServices } from "../../services/init/init-samity-info.service";
import { keysOfTables } from "../../types/keys.type";

const MemberFinancialService = Container.get(MemberFinancialServices);
const SamityRegistrationService = Container.get(SamityRegistrationServices);
const InitialMemberInfoService = Container.get(InitialMemberInfoServices);

export const validateMemberFinancial = [
  body()
    .isArray({ min: 1 })
    .withMessage("Body is not a array")
    .custom((values: any) => {
      return !isKeyExist(keysOfTables.memberFinancialKeys, values) ? Promise.reject() : true;
    })
    .withMessage("Body Req has an Invalid keys")
    .bail()
    .custom(async (value, { req }) => {
      const isSameIds = await MemberFinancialService.sameNameIdCheck(req.body, "samityId");
      if (!isSameIds[1]) {
        return Promise.reject();
      }
    })
    .withMessage("samity ids are not same")

    .custom(async (value, { req }) => {
      const isSameIds = await MemberFinancialService.sameNameIdCheck(req.body, "memberId");
      if (isSameIds[0]) {
        return Promise.reject();
      }
    })
    .withMessage("Member ids can not be same"),

  body("*.memberId")
    .exists()
    .withMessage("Member Id is not exist")
    .notEmpty()
    .withMessage("Member Id is not be null")
    .custom(async (value, { req }) => {
      if (!(await MemberFinancialService.isMemberIdAlginWithSamityId(value, req.body[0].samityId))) {
        return Promise.reject();
      }
    })
    .withMessage("Member id is not align with samity Id ")
    .custom(async (value, { req }) => {
      if (await MemberFinancialService.isMemberIdExistInDb(value, req.body[0].samityId)) {
        return Promise.reject();
      }
    })
    .withMessage("Member Id is already present for this samity")
    .trim()
    .toLowerCase(),

  body("*.samityId", "Samity Id can not be null")
    .exists()
    .notEmpty()
    .trim()
    .toLowerCase()
    .custom(async (value) => {
      if (!(await SamityRegistrationService.samityIdExist(parseInt(value)))) {
        return Promise.reject();
      }
    })
    .withMessage("Samity Id is not found"),

  body("*.noOfShare", "শেয়ার সংখ্যা লিখুন")
    .exists()
    .notEmpty()
    .withMessage("শেয়ার সংখ্যা লিখুন")
    .isInt()
    .isNumeric()
    .withMessage("শেয়ার সংখ্যা নম্বর এ সরবরাহ করুন ")
    .trim()
    .toLowerCase(),

  body("*.savingsAmount", "সঞ্চয় লিখুন")
    .exists()
    .notEmpty()
    .isNumeric()
    .withMessage("সঞ্চয় সংখ্যা নম্বর এ সরবরাহ করুন ")
    .isLength({ min: 1, max: 10 })
    .withMessage("সঞ্চয় সংখ্যা১০ টি অংকের বেশি হবে না ")

    .trim()
    .toLowerCase(),
];

export const validateMemberFinancialUpdate = [
  body()
    .isArray({ min: 1 })
    .withMessage("Body is not a array")
    .custom((values: any) => {
      return !isKeyExist(keysOfTables.memberFinancialKeys, values) ? Promise.reject() : true;
    })
    .withMessage("Body Req has an Invalid keys")
    .bail(),
  body("*.id")
    .exists()
    .withMessage("Member Financial Id is not exist")
    .notEmpty()
    .withMessage("Member Financial Id is not be null")
    .trim()
    .bail(),
  body("*.memberId")
    .exists()
    .withMessage("Member Id is not exist")
    .notEmpty()
    .withMessage("Member Id is not be null")
    .custom(async (value, { req }) => {
      const result = await MemberFinancialService.isMemberIdAlginWithSamityId(value, req.body[0].samityId);
      return result ? true : Promise.reject();
      // return !(await await await await MemberFinancialService.isMemberIdAlginWithSamityId(
      //   value,
      //   req.body[0].samityId
      // ))
      //   ? Promise.reject()
      //   : true;
    })
    .withMessage("Member id is not align with samity Id ")
    .custom(async (value, { req }) => {
      return !(await MemberFinancialService.isMemberIdExistInDb(value, req.body[0].samityId)) ? Promise.reject() : true;
    })
    .withMessage("Member Id is not already present for this samity")
    .trim()
    .toLowerCase()
    .bail(),
  body("*.samityId", "Samity Id can not be null")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      return !(await SamityRegistrationService.samityIdExist(parseInt(value))) ? Promise.reject() : true;
    })
    .withMessage("Samity Id is not found")
    .trim()
    .toLowerCase()
    .bail(),
  body("*.noOfShare", "শেয়ার সংখ্যা লিখুন")
    .exists()
    .notEmpty()
    .withMessage("শেয়ার সংখ্যা লিখুন")
    .isNumeric()
    .withMessage("শেয়ার সংখ্যা নম্বর এ সরবরাহ করুন ")
    .isLength({ min: 1, max: 10 })
    .withMessage("শেয়ার সংখ্যা ১০ টি অংকের বেশি হবে না ")
    .trim()
    .toLowerCase()
    .bail(),
  body("*.savingsAmount", "সঞ্চয় লিখুন")
    .exists()
    .notEmpty()
    .isNumeric()
    .withMessage("সঞ্চয় সংখ্যা নম্বর এ সরবরাহ করুন ")
    .isLength({ min: 0, max: 10 })
    .withMessage("সঞ্চয় সংখ্যা  ১০ টি অংকের বেশি হবে না ")
    .trim()
    .toLowerCase()
    .bail(),
];

export const validateMemberFinancialQuery = [
  query()
    .custom((value: any) => {
      const values = Object.keys(omit(value, ["isPagination", "limit", "page"]));
      return !isKeyExist(keysOfTables.memberFinancialKeys, values) ? Promise.reject() : true;
    })
    .withMessage(`query params invalid`),
];

export const validateMemberFinancialGet = [
  param("samityId")
    .exists()
    .withMessage("Samity Id can not be null")
    .custom(async (value) => {
      return !(await MemberFinancialService.samityIdExist(value)) ? Promise.reject() : true;
    })
    .withMessage("Samity Id is not present "),
];

export const validateMemberFinancialDelete = [param("id").exists().withMessage("Id can not be null")];
