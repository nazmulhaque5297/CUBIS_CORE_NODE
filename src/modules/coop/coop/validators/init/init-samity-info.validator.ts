import { body, param } from "express-validator";
import { isExistsByColumn, isKeyExist } from "rdcd-common";
import Container from "typedi";
import { pgConnect } from "../../../../../db-coop/factory/connection.db";
import { isDateFormateValid } from "../../../../../validators/checkDateFormate.validator";
import { SamityRegistrationServices } from "../../services/init/init-samity-info.service";
import { keysOfTables } from "../../types/keys.type";
import { validationExistAndNotEmpty } from "../../utils/validation.utils";
import { samityRegArr } from "./validationArray/init-samity-registration.validator.array";

const SamityRegistrationService = Container.get(SamityRegistrationServices);
const samityCommonValidation = [
  body()
    .custom((values) => {
      const data = [values];

      return isKeyExist(keysOfTables.samityRegistrationKeys, data);
    })
    .withMessage("Body Req has an Invalid keys")
    .bail(),
  // p = primary, n=national, c=central
  validationExistAndNotEmpty(samityRegArr.samityLevel).isIn(["C", "N", "P"]).isLength({ max: 1 }),
  validationExistAndNotEmpty(samityRegArr.samityName)
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage("সমিতির নাম ১ থেকে ২০০ অক্ষরের মধ্যে হতে হবে "),

  validationExistAndNotEmpty(samityRegArr.officeDivisionId).isInt({ min: 1 }),
  validationExistAndNotEmpty(samityRegArr.officeDistrictId).isInt({ min: 1 }),
  validationExistAndNotEmpty(samityRegArr.samityUpaCityId),
  validationExistAndNotEmpty(samityRegArr.samityUpaCityType)
    .isIn(["UPA", "CITY"])
    .withMessage("samityUpaCityType must be UPA or CITY")
    .isLength({ min: 1, max: 5 })
    .withMessage("samityUpaCityType length is greater than 5 or less than 1"),
  validationExistAndNotEmpty(samityRegArr.samityUniThanaPawId),
  validationExistAndNotEmpty(samityRegArr.samityUniThanaPawType)
    .isIn(["UNI", "THANA", "PAW"])
    .withMessage("samityUniThanaPawType must be UNI, THANA,PAW")
    .isLength({ min: 1, max: 5 })
    .withMessage("samityUniThanaPawType length is greater than 5 or less than 1"),
  body("samityDetailsAddress")
    .exists()
    .withMessage("সমিতির বিস্তারিতই ঠিকানা দিন")
    .isString()
    .withMessage("সমিতির বিস্তারিতই ঠিকানা স্ট্রিং হতে হবে ")
    .isLength({ min: 0, max: 256 })
    .withMessage("সমিতির বিস্তারিতই ঠিকানা ১ থেকে ২৫৬ অক্ষরের মধ্যে হতে হবে ")
    .optional(),
  validationExistAndNotEmpty(samityRegArr.memberAreaType).isInt({ min: 0 }),
  validationExistAndNotEmpty(samityRegArr.workingAreaType).isInt({ min: 0 }),
  validationExistAndNotEmpty(samityRegArr.memberArea)
    .isArray({ min: 1 })
    .withMessage("Body is not a array")
    .custom((values: any) => {
      return isKeyExist(keysOfTables.memberArea, values);
    })
    .withMessage("Member Area, Body Req has an Invalid keys"),

  validationExistAndNotEmpty(samityRegArr.memberArea_status).trim().toLowerCase(),
  validationExistAndNotEmpty(samityRegArr.memberArea_divisionId).optional().trim().toLowerCase(),
  validationExistAndNotEmpty(samityRegArr.memberArea_upaCityId).optional(),
  validationExistAndNotEmpty(samityRegArr.memberArea_upaCityType)
    .optional()
    .isIn(["UPA", "CITY"])
    .withMessage("UpaCityType must be UPA or CITY")
    .isLength({ min: 1, max: 5 })
    .withMessage("UpaCityType ১ থেকে ৫ অক্ষরের মধ্যে হতে হবে "),
  validationExistAndNotEmpty(samityRegArr.memberArea_uniThanaPawId).optional(),
  validationExistAndNotEmpty(samityRegArr.memberArea_uniThanaPawType)
    .optional()
    .isIn(["UNI", "THANA", "PAW"])
    .withMessage("UniThanaPawType must be UNI, THANA,PAW")
    .isLength({ min: 1, max: 5 })
    .withMessage("UniThanaPawType ১ থেকে ৫ অক্ষরের মধ্যে হতে হবে "),
  body("memberArea.*.detailsAddress")
    .exists()
    .withMessage("সদস্য নির্বাচনী এলাকা , ঠিকানা দিন")
    .isString()
    .withMessage("সদস্য নির্বাচনী এলাকা , ঠিকানা স্ট্রিং হতে হবে ")
    .isLength({ min: 0, max: 256 })
    .withMessage("সদস্য নির্বাচনী এলাকা , ঠিকানা ১ থেকে ২৫৬ অক্ষরের মধ্যে হতে হবে ")
    .optional(),

  validationExistAndNotEmpty(samityRegArr.workingArea)
    .isArray()
    .withMessage("Body is not a array")
    .custom((values: any) => {
      return isKeyExist(keysOfTables.workingArea, values);
    })
    .withMessage("Body Req has an Invalid keys"),
  validationExistAndNotEmpty(samityRegArr.workingArea_status),
  validationExistAndNotEmpty(samityRegArr.workingArea_divisionId),
  validationExistAndNotEmpty(samityRegArr.workingArea_upaCityId).optional(),
  validationExistAndNotEmpty(samityRegArr.workingArea_upaCityType)
    .optional()
    .isIn(["UPA", "CITY"])
    .withMessage("UpaCityType must be UPA or CITY")
    .isLength({ min: 1, max: 5 })
    .withMessage("UpaCityType length is greater than 5 or less than 1"),
  validationExistAndNotEmpty(samityRegArr.workingArea_uniThanaPawId).optional(),
  validationExistAndNotEmpty(samityRegArr.workingArea_uniThanaPawType)
    .optional()
    .isIn(["UNI", "THANA", "PAW"])
    .withMessage("UniThanaPawType must be UNI, THANA,PAW")
    .isLength({ min: 1, max: 5 })
    .withMessage("UniThanaPawType length is greater than 5 or less than 1"),
  body("workingArea.*.detailsAddress")
    .exists()
    .withMessage(" কর্ম এলাকা, ঠিকানা দিন")
    .isString()
    .withMessage(" কর্ম এলাকা, ঠিকানা স্ট্রিং হতে হবে ")
    .isLength({ min: 0, max: 256 })
    .withMessage("কর্ম এলাকা, ঠিকানা ১ থেকে ২৫৬ অক্ষরের মধ্যে হতে হবে ")
    .optional(),
  validationExistAndNotEmpty(samityRegArr.memberAreaType).isInt({ min: 0 }),
  validationExistAndNotEmpty(samityRegArr.workingAreaType).isInt({ min: 0 }),
  validationExistAndNotEmpty(samityRegArr.samityFormationDate)
    .custom((value) => {
      return isDateFormateValid(value);
    })
    .withMessage("সমিতি গঠনের দিন নির্বাচন করুন"),
  validationExistAndNotEmpty(samityRegArr.memberAdmissionFee)
    .isInt()
    .withMessage("Member Admission Fee must be integer number"),

  validationExistAndNotEmpty(samityRegArr.noOfShare).isInt({ min: 1 }),
  validationExistAndNotEmpty(samityRegArr.sharePrice).isInt({ min: 1 }),
  validationExistAndNotEmpty(samityRegArr.soldShare).isInt({ min: 0 }),
  // validationExistAndNotEmpty(samityRegArr.declaration).isBoolean(),
  body("enterprisingId")
    .exists()
    .withMessage("enterprisingId is not present in payload")
    .notEmpty()
    .withMessage("উদ্যোগী সংস্থা নির্বাচন করুন")
    .isInt()
    .withMessage("উদ্যোগী সংস্থা নির্বাচন করুন")
    .custom(async (value) => {
      const isEnterPrisingIdExit = await isExistsByColumn(
        "id",
        "master.enterprising_org",
        await pgConnect.getConnection("slave"),
        { id: parseInt(value) }
      );

      return isEnterPrisingIdExit ? true : Promise.reject();
    })
    .withMessage("উদ্যোগী সংস্থা টি ডাটাবেস নেই "),

  body("email").isLength({ min: 0, max: 70 }).withMessage("ইমেইল আইডি ১ থেকে ৭০ অক্ষরের মধ্যে হতে হবে").optional(),
  body("mobile")
    .exists()
    .withMessage("মোবাইল নম্বর দিন ")
    .notEmpty()
    .withMessage("মোবাইল নম্বর দিন ")
    .isLength({ min: 0, max: 15 })
    .withMessage("মোবাইল নম্বর  ১ থেকে ১৫ অক্ষরের মধ্যে হতে হবে"),
  body("phone").isLength({ min: 0, max: 15 }).withMessage("ফোন নম্বর ১ থেকে ১৫ অক্ষরের মধ্যে হতে হবে").optional(),
];

export const validateSamity = [
  ...samityCommonValidation,
  validationExistAndNotEmpty(samityRegArr.applicationId)
    .isInt({ min: 1 })
    .withMessage("applicationId must be interger"),
];

export const updateByLaw = [body("byLaw", "byLaw is not null and must be String").exists().isString()];
export const updateCertificateGetBy = [
  param("id")
    .exists()
    .withMessage("id is required")
    .isNumeric()
    .withMessage("id must be numeric")
    .custom(async (value) => {
      const isSamityExist = await SamityRegistrationService.samityIdExist(value);
      return isSamityExist ? true : Promise.reject();
    })
    .withMessage("id is not exist"),
  // validationExistAndNotEmpty(samityRegArr.declaration).isBoolean(),
  body("declaration")
    .isBoolean()
    .withMessage("আমি স্বীকার করিতেছি যে, উপরোক্ত সকল তথ্য জানিয়া ও বুঝিয়া স্বজ্ঞানে প্রদান করিয়াছি টিক দিন")
    .bail()
    .custom((value) => {
      return value;
    })
    .withMessage("আমি স্বীকার করিতেছি যে, উপরোক্ত সকল তথ্য জানিয়া ও বুঝিয়া স্বজ্ঞানে প্রদান করিয়াছি টিক দিন"),

  body("certificateGetBy", "সনদপত্র পাওয়ার মাধ্যম নির্বাচন করুন")
    .exists()
    .withMessage("সনদপত্র পাওয়ার মাধ্যম নির্বাচন করুন")
    .notEmpty()
    .withMessage("সনদপত্র পাওয়ার মাধ্যম নির্বাচন করুন")
    .isString()
    .withMessage("certificateGetBy field must be String"),
];

export const updateRegistrationFee = [
  param("id")
    .exists()
    .withMessage("id is required")
    .isNumeric()
    .withMessage("id must be numeric")
    .custom(async (value) => {
      const isSamityExist = await SamityRegistrationService.samityIdExist(value);
      return isSamityExist ? true : Promise.reject();
    })
    .withMessage("id is not exist"),

  body("registrationFee")
    .exists()
    .withMessage("registration Fee is not present in payload")
    .notEmpty()
    .withMessage("নিবন্ধন ফি শুন্য হতে পারবে না")
    .isInt({ min: 1 })
    .withMessage("registration fee must be a number")
    .custom(async (value, { req }) => {
      const SamityRegistrationService = Container.get(SamityRegistrationServices);
      const isMatch = await SamityRegistrationService.checkRegistrationFee("registrationFee", req.params, value);

      return isMatch ? true : Promise.reject();
    })
    .withMessage("Registration fee is not same"),

  body("registrationFeeVat")
    .exists()
    .withMessage("registration vat is not present in payload")
    .notEmpty()
    .withMessage("নিবন্ধন ভ্যাট শুন্য হতে পারবে না")
    .isInt({ min: 1 })
    .withMessage("registration vat must be a number")
    .custom(async (value, { req }) => {
      const SamityRegistrationService = Container.get(SamityRegistrationServices);
      const isMatch = await SamityRegistrationService.checkRegistrationFee("registrationVat", req.params, value);

      return isMatch ? true : Promise.reject();
    })
    .withMessage("Registration vat is not same"),
];

export const validateSamityUpdate = [
  param("id", "অকার্যকর সমিতি আইডি দেয়া হয়েছে")
    .exists()
    .custom(async (value) => {
      if (!(await SamityRegistrationService.samityIdExist(parseInt(value)))) {
        return Promise.reject();
      }
    })
    .withMessage("অকার্যকর সমিতি আইডি দেয়া হয়েছে")
    .isInt({ min: 1 }),
  ...samityCommonValidation,
];

export const validateSamityId = [
  param("samityId", "অকার্যকর সমিতি আইডি দেয়া হয়েছে")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      if (!(await SamityRegistrationService.samityIdExist(parseInt(value)))) {
        return Promise.reject();
      }
    })
    .withMessage("অকার্যকর সমিতি আইডি দেয়া হয়েছে")
    .isInt({ min: 1 }),
];
