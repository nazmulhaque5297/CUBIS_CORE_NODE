import { body, Meta, param, query } from "express-validator";
import { get, omit } from "lodash";
import { BadRequestError, isExistsByColumn, isKeyExist } from "rdcd-common";
import Container from "typedi";
import { pgConnect } from "../../../../../db-coop/factory/connection.db";
import { isDateFormateValid } from "../../../../../validators/checkDateFormate.validator";
import { MemberAddress } from "../../interfaces/init/init-member-info-interface";
import { InitialMemberInfoServices } from "../../services/init/init-member-info.service";
import { SamityRegistrationServices } from "../../services/init/init-samity-info.service";
import { keysOfTables } from "../../types/keys.type";
import { validationExistAndNotEmpty } from "../../utils/validation.utils";
import { memberValidationArray } from "./validationArray/initMemberReg.validation.array";

const InitialMemberInfoService = Container.get(InitialMemberInfoServices);
const SamityRegistrationService = Container.get(SamityRegistrationServices);

const initMemberInfoCommonValidation = [];

export const validateInitialMemberInfo = [
  body()
    .custom((value) => {
      const dataArray = [value];
      const result: boolean = isKeyExist(keysOfTables.memberRegistrationInfo, dataArray);
      return result;
    })
    .withMessage("Request body has a invalid field")
    .bail(),
  validationExistAndNotEmpty(memberValidationArray.nid)
    .trim()
    .toInt()
    .isInt()
    .custom(async (value, { req }) => {
      if (await InitialMemberInfoService.nidExist(value, req.body.samityId)) {
        return Promise.reject();
      }
    })
    .withMessage("এন আইডি নম্বরটি ব্যবহৃত হচ্ছে")
    .custom((value) => {
      const length = value.toString().length;
      if (length === 10 || length === 17) {
        return true;
      }
      return false;
    })
    .withMessage("এন আইডি নম্বর ১০ অথবা ১৭ সংখ্যার হতে হবে। ")
    .isLength({ min: 1, max: 20 })
    .withMessage(" এন আইডি নম্বর   ১ থেকে ২০ অক্ষরের মধ্যে হতে হবে ")
    .optional()
    .bail(),
  body("brn")
    .notEmpty()
    .withMessage("জন্ম নিবন্ধন নম্বর প্রদান করুন ")
    .custom(async (value, { req }) => {
      const isBrnExist: any = await isExistsByColumn(
        "id",
        "temps.member_info",
        await pgConnect.getConnection("slave"),
        {
          brn: value,
          samityId: parseInt(req.body.samityId),
        }
      );

      return isBrnExist ? Promise.reject() : true;
    })
    .withMessage("জন্ম নিবন্ধন নম্বরটি ব্যবহৃত হচ্ছে")
    .custom((value) => {
      const length = value.toString().length;
      if (length === 17) {
        return true;
      }
      return false;
    })
    .withMessage("জন্ম নিবন্ধন নম্বর  ১৭ সংখ্যার হতে হবে। ")
    .isLength({ min: 1, max: 20 })
    .withMessage(" জন্ম নিবন্ধন নম্বর   ১ থেকে ২০ অক্ষরের মধ্যে হতে হবে ")
    .optional()
    .bail(),

  validationExistAndNotEmpty(memberValidationArray.dob)
    .custom((value) => {
      return isDateFormateValid(value);
    })
    .withMessage("জন্মতারিখের ফরম্যাট ঠিক নেই"),
  validationExistAndNotEmpty(memberValidationArray.memberName)
    .isLength({ min: 1, max: 50 })
    .withMessage(" সদস্যের নাম ১ থেকে ৫০ অক্ষরের মধ্যে হতে হবে ")
    .trim(),
  body("memberNameBangla")
    .exists()
    .withMessage("সদস্যের বাংলা নাম লিখুন")
    .notEmpty()
    .withMessage("সদস্যের বাংলা নাম লিখুন ")
    .isLength({ min: 1, max: 50 })
    .withMessage(" সদস্যের বাংলা নাম  ১ থেকে ৫০ অক্ষরের মধ্যে হতে হবে ")
    .trim(),
  validationExistAndNotEmpty(memberValidationArray.fatherName)
    .isLength({ min: 1, max: 50 })
    .withMessage(" পিতার নাম ১ থেকে ৫০ অক্ষরের মধ্যে হতে হবে ")
    .trim(),
  validationExistAndNotEmpty(memberValidationArray.motherName)
    .isLength({ min: 1, max: 50 })
    .withMessage(" মাতার নাম ১ থেকে ৫০ অক্ষরের মধ্যে হতে হবে ")
    .trim(),
  validationExistAndNotEmpty(memberValidationArray.mobile)
    .isLength({ min: 1, max: 15 })
    .withMessage(" মোবাইল নম্বর ১ থেকে ১৫ অক্ষরের মধ্যে হতে হবে ")
    .bail(),
  body("memberAdmissionDate", "সদস্যভুক্তির তারিখ নির্বাচন করুন ")
    .exists()
    .notEmpty()
    .custom((value) => {
      return isDateFormateValid(value);
    }),

  validationExistAndNotEmpty(memberValidationArray.genderId).bail(),
  validationExistAndNotEmpty(memberValidationArray.educationLevelId)
    .bail()
    .custom(async (value, { req }) => {
      const isEducationLevelExist: any = await isExistsByColumn(
        "id",
        "master.code_master",
        await pgConnect.getConnection("slave"),
        { id: value, code_type: "EDT" }
      );

      return isEducationLevelExist ? true : Promise.reject();
    })
    .withMessage("শিক্ষগত যোগ্যতা নির্বাচন করুন")
    .bail(),
  body("religionId")
    .exists()
    .notEmpty()
    .isInt()
    .custom(async (value, { req }) => {
      const isReligionIdExist: any = await isExistsByColumn(
        "id",
        "master.code_master",
        await pgConnect.getConnection("slave"),
        { id: value, code_type: "REL" }
      );

      return isReligionIdExist ? true : Promise.reject();
    })
    .withMessage("ধর্ম নির্বাচন করুন"),
  validationExistAndNotEmpty(memberValidationArray.maritalStatusId)
    .withMessage("বৈবাহিক অবস্থা নির্বাচন করুন ")
    .isInt({ min: 1 })
    .withMessage("বৈবাহিক অবস্থা নির্বাচন করুন ")
    .bail(),
  validationExistAndNotEmpty(memberValidationArray.occupationId)
    .bail()
    .toInt()
    .isInt()
    .custom(async (value, { req }) => {
      const isOccupationIdExist: any = await isExistsByColumn(
        "id",
        "master.code_master",
        await pgConnect.getConnection("slave"),
        { id: value, code_type: "OCC" }
      );

      return isOccupationIdExist ? true : Promise.reject();
    })
    .withMessage("পেশা নির্বাচন করুন ")
    .bail(),

  validationExistAndNotEmpty(memberValidationArray.samityId)
    .custom(async (value) => {
      if (!(await SamityRegistrationService.samityIdExist(parseInt(value)))) {
        return Promise.reject();
      }
    })
    .withMessage("Samity id does not exist in Database")
    .trim()
    .toInt()
    .isInt({ min: 1 })
    .bail(),

  body("permanentAddress", "Invalid Present Adress").exists().notEmpty(),
  body("permanentAddress.addressType", "invalid Adress type").exists().notEmpty().isIn(["PER"]),
  body("permanentAddress.districtId", "স্থায়ী ঠিকানার জেলা নির্বাচন করুন  ")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      const isDistrictIdExist = await isExistsByColumn(
        "id",
        "master.district_info",
        await pgConnect.getConnection("slave"),
        { id: value }
      );
      return isDistrictIdExist ? true : Promise.reject();
    }),
  body("permanentAddress.upaCityId", "স্থায়ী ঠিকানার উপজেলা/সিটি কর্পোরেশন নির্বাচন করুন")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      const isUpaCityIdExist = await isExistsByColumn(
        "upa_city_id",
        "master.mv_upazila_city_info",
        await pgConnect.getConnection("slave"),
        { upaCityId: value }
      );
      return isUpaCityIdExist ? true : Promise.reject();
    }),
  body("permanentAddress.upaCityType", "invalid upaCityType").exists().notEmpty().isIn(["UPA", "CITY"]),

  body("permanentAddress.uniThanaPawId", "স্থায়ী ঠিকানার ইউনিয়ন/থানা/পৌরসভা নির্বাচন করুন")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      const isUniThanaPawIdExist = await isExistsByColumn(
        "uni_thana_paw_id",
        "master.mv_union_thana_paurasabha_info",
        await pgConnect.getConnection("slave"),
        { uniThanaPawId: value }
      );
      return isUniThanaPawIdExist ? true : Promise.reject();
    })
    .optional(),

  body("permanentAddress.uniThanaPawType", "invalid uniThanaPawType")
    .exists()
    .notEmpty()
    .isIn(["UNI", "THANA", "PAW"])
    .optional(),

  body("permanentAddress.detailsAddress", "invalid DetailsAddress")
    .exists()
    .isLength({ min: 0, max: 256 })
    .withMessage(" স্থায়ী ঠিকানার বিস্তারিত ঠিকানা ১ থেকে ২৫৬  অক্ষরের মধ্যে হতে হবে ")
    .optional(),

  body("presentAddress", "Invalid present Adress").exists().notEmpty(),
  body("presentAddress.addressType", "invalid Adress type").exists().notEmpty().isIn(["PRE"]),
  body("presentAddress.districtId", "বর্তমান ঠিকানার জেলা নির্বাচন করুন")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      const isDistrictIdExist = await isExistsByColumn(
        "id",
        "master.district_info",
        await pgConnect.getConnection("slave"),
        { id: value }
      );
      return isDistrictIdExist ? true : Promise.reject();
    }),
  body("presentAddress.upaCityId", "বর্তমান ঠিকানার উপজেলা/সিটি কর্পোরেশন নির্বাচন করুন")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      const isUpaCityIdExist = await isExistsByColumn(
        "upa_city_id",
        "master.mv_upazila_city_info",
        await pgConnect.getConnection("slave"),
        { upaCityId: value }
      );
      return isUpaCityIdExist ? true : Promise.reject();
    }),
  body("presentAddress.upaCityType", "invalid upaCityType").exists().notEmpty().isIn(["UPA", "CITY"]),

  body("presentAddress.uniThanaPawId", "বর্তমান ঠিকানার ইউনিয়ন/থানা/পৌরসভা নির্বাচন করুন")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      const isUniThanaPawIdExist = await isExistsByColumn(
        "uni_thana_paw_id",
        "master.mv_union_thana_paurasabha_info",
        await pgConnect.getConnection("slave"),
        { uniThanaPawId: value }
      );
      return isUniThanaPawIdExist ? true : Promise.reject();
    })

    .optional(),

  body("presentAddress.uniThanaPawType", "invalid uniThanaPawType")
    .exists()
    .notEmpty()
    .isIn(["UNI", "THANA", "PAW"])
    .optional(),

  body("presentAddress.detailsAddress", "invalid DetailsAddress")
    .exists()
    .isLength({ min: 0, max: 256 })
    .withMessage(" বর্তমান ঠিকানার বিস্তারিত ঠিকানা ১ থেকে ২৫৬  অক্ষরের মধ্যে হতে হবে ")
    .optional(),

  body("documents")
    .exists()
    .isArray()
    .withMessage("documents must be an array")
    .custom(async (value, { req }) => {
      const idsOfDocuments = value.map((element: any) => {
        return element.docId;
      });
      const { message, returnValue } = await InitialMemberInfoService.isDocumentValid(
        req.body.samityId,
        idsOfDocuments
      );

      if (!returnValue) {
        throw new BadRequestError(message);
      }
    }),
  body("documents.*.docId")
    .exists()
    .withMessage("documents docId Is not present")
    .notEmpty()
    .withMessage("documents docId can not be empty"),
  body("documents.*.docTypeDesc")
    .exists()
    .withMessage("documents docTypeDesc Is not present")
    .notEmpty()
    .withMessage("documents docTypeDesc can not be empty"),
  body("documents.*.docType")
    .exists()
    .withMessage("documents docType Is not present")
    .notEmpty()
    .withMessage("documents docType can not be empty"),

  body("documents.*.name", "ডকুমেন্ট এর নাম প্রদান করুন ")
    .exists()

    .notEmpty(),

  body("documents.*.base64Image")
    .exists()
    .withMessage(" base64Image Is not present")
    .notEmpty()
    .withMessage(" base64Image can not be empty")
    .isBase64()
    .withMessage("ছবির ফরমেট ঠিক নেই "),
];

const commonValidationForCentralAndNational = [
  param("type")
    .exists()
    .withMessage("Type is not present on the route")
    .isIn(["central"])
    .withMessage("Type must be central"),
  body("samityId")
    .exists()
    .withMessage("samityId is not present on the body")
    .notEmpty()
    .withMessage("সমিতি আইডি দিন ")
    .isInt({ min: 1 })
    .withMessage("samity id must be a number")
    .custom(async (value) => {
      const isSamityExist = await isExistsByColumn("id", "temps.samity_info", await pgConnect.getConnection("slave"), {
        id: value,
      });
      return isSamityExist ? true : Promise.reject();
    })
    .withMessage("সমিতি আইডিটি ডাটাবেস এ নেই"),
  body("memberAdmissionDate", "সদস্যভুক্তির তারিখ নির্বাচন করুন ")
    .exists()
    .notEmpty()
    .custom((value) => {
      return isDateFormateValid(value);
    }),

  body("documents")
    .exists()
    .isArray()
    .withMessage("documents must be an array")
    .custom(async (value, { req }) => {
      const idsOfDocuments = value.map((element: any) => {
        return element.docId;
      });
      const { message, returnValue } = await InitialMemberInfoService.isDocumentValid(
        req.body.samityId,
        idsOfDocuments
      );

      if (!returnValue) {
        throw new BadRequestError(message);
      }
    }),
  body("documents.*.docId")
    .exists()
    .withMessage("documents docId Is not present")
    .notEmpty()
    .withMessage("documents docId can not be empty"),
  body("documents.*.docTypeDesc")
    .exists()
    .withMessage("documents docTypeDesc Is not present")
    .notEmpty()
    .withMessage("documents docTypeDesc can not be empty"),
  body("documents.*.docType")
    .exists()
    .withMessage("documents docType Is not present")
    .notEmpty()
    .withMessage("documents docType can not be empty"),

  body("documents.*.name")
    .exists()
    .withMessage("documents name Is not present")
    .custom((value, { req, path }: Meta) => {
      if ((value = "" || !value)) {
        const index = path.split(".")[0];

        const nameOfTheDocument = get(req.body, `${index}.docTypeDesc`);

        throw new BadRequestError(`${nameOfTheDocument} ডকুমেন্ট নির্বাচন করুন `);
      } else {
        return true;
      }
    })
    .notEmpty()
    .withMessage("documents name can not be empty"),
  body("documents.*.base64Image")
    .exists()
    .withMessage(" base64Image Is not present")
    .custom((value, { req, path }: Meta) => {
      if ((value = "" || !value)) {
        const index = path.split(".")[0];
        const nameOfTheDocument = get(req.body, `${index}.docTypeDesc`);

        throw new BadRequestError(`${nameOfTheDocument} ডকুমেন্ট নির্বাচন করুন `);
      } else {
        return true;
      }
    })
    .isBase64()
    .withMessage("ছবির ফরমেট ঠিক নেই "),
];
export const validateMemberInfoForCentralAndNation = [
  ...commonValidationForCentralAndNational,
  body("refSamityId")
    .exists()
    .withMessage("refSamityId is not present on the body")
    .notEmpty()
    .withMessage("রেফারেন্স সমিতি আইডি দিন")
    .custom(async (value, { req }) => {
      const isRefIdExist = await isExistsByColumn("id", "temps.member_info", await pgConnect.getConnection("slave"), {
        refSamityId: value,
        samityId: req.body.samityId,
      });

      return isRefIdExist ? Promise.reject() : true;
    })
    .withMessage("সমিতি টি সদস্য হিসেবে রয়েছে ")
    .custom(async (value) => {
      const isRefIdExist = await isExistsByColumn("id", "coop.samity_info", await pgConnect.getConnection("slave"), {
        id: value,
      });

      return isRefIdExist ? true : Promise.reject();
    })
    .withMessage("রেফারেন্স সমিতি আইডিটি ডাটাবেস এ নেই"),
];

export const validateUpdateMemberInfoForCentralAndNation = [
  param("id")
    .exists()
    .withMessage("Param Id is not present")
    .notEmpty()
    .withMessage("Param Id can not be empty")
    .custom(async (value) => {
      if (!(await InitialMemberInfoService.memberIdExist(parseInt(value)))) {
        return Promise.reject();
      }
    })
    .withMessage("member id does not exist in database"),
  ...commonValidationForCentralAndNational,
  body("refSamityId")
    .exists()
    .withMessage("refSamityId is not present on the body")
    .notEmpty()
    .withMessage("রেফারেন্স সমিতি আইডি দিন")
    .custom(async (value) => {
      const isRefIdExist = await isExistsByColumn("id", "coop.samity_info", await pgConnect.getConnection("slave"), {
        id: value,
      });

      return isRefIdExist ? true : Promise.reject();
    })
    .withMessage("রেফারেন্স সমিতি আইডিটি ডাটাবেস এ নেই"),
];

export const validateUpdateInitialMemberInfo = [
  param("id")
    .exists()
    .withMessage("Param Id is not present")
    .notEmpty()
    .withMessage("Param Id can not be empty")
    .custom(async (value) => {
      if (!(await InitialMemberInfoService.memberIdExist(parseInt(value)))) {
        return Promise.reject();
      }
    })
    .withMessage("member id does not exist in database"),
  validationExistAndNotEmpty(memberValidationArray.nid)
    .custom((value) => {
      const length = value.toString().length;
      if (length === 10 || length === 17) {
        return true;
      }
      return false;
    })
    .withMessage("এন আইডি নম্বর ১০ অথবা ১৭ সংখ্যার হতে হবে। ")
    .custom(async (value, { req }) => {
      const nid = value;
      const memberId = req.params ? parseInt(req.params.id) : null;
      const samityId = parseInt(req.body.samityId);

      const returnValue = memberId
        ? (await InitialMemberInfoService.nidOrBrnExistUpdate(nid, memberId, samityId, "nid"))
          ? Promise.reject()
          : true
        : Promise.reject();
      return returnValue;
    })
    .withMessage("এন আইডি টি ব্যবহৃত হচ্ছে ")
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage(" এন আইডি নম্বর   ১ থেকে ২০ অক্ষরের মধ্যে হতে হবে ")
    .optional(),
  body("brn")
    .notEmpty()
    .withMessage("জন্ম নিবন্ধন নম্বর প্রদান করুন ")
    .custom(async (value, { req }) => {
      const brn = value;
      const memberId = req.params ? parseInt(req.params.id) : null;
      const samityId = parseInt(req.body.samityId);

      const returnValue = memberId
        ? (await InitialMemberInfoService.nidOrBrnExistUpdate(brn, memberId, samityId, "brn"))
          ? Promise.reject()
          : true
        : Promise.reject();
      return returnValue;
    })
    .withMessage("জন্ম নিবন্ধন নম্বরটি ব্যবহৃত হচ্ছে")
    .custom((value) => {
      const length = value.toString().length;
      if (length === 17) {
        return true;
      }
      return false;
    })
    .withMessage("জন্ম নিবন্ধন নম্বর  ১৭ সংখ্যার হতে হবে। ")
    .isLength({ min: 1, max: 20 })
    .withMessage(" জন্ম নিবন্ধন নম্বর   ১ থেকে ২০ অক্ষরের মধ্যে হতে হবে ")
    .optional()
    .bail(),
  validationExistAndNotEmpty(memberValidationArray.dob)
    .custom((value) => {
      return isDateFormateValid(value);
    })
    .withMessage("জন্মতারিখের ফরম্যাট ঠিক নেই"),
  validationExistAndNotEmpty(memberValidationArray.memberName)
    .isLength({ min: 1, max: 50 })
    .withMessage(" সদস্যের নাম ১ থেকে ৫০ অক্ষরের মধ্যে হতে হবে ")
    .trim(),
  body("memberNameBangla")
    .exists()
    .withMessage("সদস্যের বাংলা নাম লিখুন")
    .notEmpty()
    .withMessage("সদস্যের বাংলা নাম লিখুন ")
    .isLength({ min: 1, max: 50 })
    .withMessage(" সদস্যের বাংলা নাম  ১ থেকে ৫০ অক্ষরের মধ্যে হতে হবে ")
    .trim(),
  validationExistAndNotEmpty(memberValidationArray.fatherName)
    .isLength({ min: 1, max: 50 })
    .withMessage(" পিতার নাম ১ থেকে ৫০ অক্ষরের মধ্যে হতে হবে ")
    .trim(),
  validationExistAndNotEmpty(memberValidationArray.motherName)
    .isLength({ min: 1, max: 50 })
    .withMessage(" মাতার নাম ১ থেকে ৫০ অক্ষরের মধ্যে হতে হবে ")
    .trim(),
  body("religionId")
    .exists()
    .notEmpty()
    .isInt()
    .custom(async (value, { req }) => {
      const isReligionIdExist: any = await isExistsByColumn(
        "id",
        "master.code_master",
        await pgConnect.getConnection("slave"),
        { id: value, code_type: "REL" }
      );

      return isReligionIdExist ? true : Promise.reject();
    })
    .withMessage("ধর্ম নির্বাচন করুন"),
  validationExistAndNotEmpty(memberValidationArray.maritalStatusId)
    .withMessage("বৈবাহিক অবস্থা নির্বাচন করুন ")
    .isInt({ min: 1 })
    .withMessage("বৈবাহিক অবস্থা নির্বাচন করুন ")
    .bail(),
  validationExistAndNotEmpty(memberValidationArray.occupationId)
    .toInt()
    .isInt()
    .custom(async (value, { req }) => {
      const isOccupationIdExist: any = await isExistsByColumn(
        "id",
        "master.code_master",
        await pgConnect.getConnection("slave"),
        { id: value, code_type: "OCC" }
      );

      return isOccupationIdExist ? true : Promise.reject();
    })
    .withMessage("পেশা নির্বাচন করুন "),
  validationExistAndNotEmpty(memberValidationArray.mobile)
    .matches(/(^(\+88|0088)?(01){1}[3456789]{1}(\d){8})$/)
    .withMessage("মোবাইল নম্বর এর ফরমেট ঠিক নেই ")
    .isLength({ min: 1, max: 15 })
    .withMessage(" মোবাইল নম্বর ১ থেকে ১৫ অক্ষরের মধ্যে হতে হবে "),
  validationExistAndNotEmpty(memberValidationArray.educationLevelId)
    .bail()
    .custom(async (value, { req }) => {
      const isEducationLevelExist: any = await isExistsByColumn(
        "id",
        "master.code_master",
        await pgConnect.getConnection("slave"),
        { id: value, code_type: "EDT" }
      );

      return isEducationLevelExist ? true : Promise.reject();
    })
    .withMessage("শিক্ষগত যোগ্যতা নির্বাচন করুন")
    .bail(),
  validationExistAndNotEmpty(memberValidationArray.samityId)
    .trim()
    .toInt()
    .isInt({ min: 1 })
    .custom(async (value) => {
      if (!(await SamityRegistrationService.samityIdExist(parseInt(value)))) {
        return Promise.reject();
      }
    })
    .withMessage("Samity id does not exist"),
  body("permanentAddress", "Invalid Present Adress").exists().notEmpty(),
  body("permanentAddress.id", "invalid permanentAddress id ")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      const isPermanentAddressIdExist = await isExistsByColumn(
        "id",
        "temps.member_address_info",
        await pgConnect.getConnection("slave"),
        { id: value }
      );
      return isPermanentAddressIdExist ? true : Promise.reject();
    })
    .withMessage("permanentAddress Id is not present in database"),

  body("permanentAddress.addressType", "invalid Adress type").exists().notEmpty().isIn(["PER"]),
  body("permanentAddress.districtId", "স্থায়ী ঠিকানার জেলা নির্বাচন করুন ")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      const isDistrictIdExist = await isExistsByColumn(
        "id",
        "master.district_info",
        await pgConnect.getConnection("slave"),
        { id: value }
      );
      return isDistrictIdExist ? true : Promise.reject();
    })
    .withMessage("District Id is not present in database"),
  body("permanentAddress.upaCityId", "স্থায়ী ঠিকানার উপজেলা/সিটি কর্পোরেশন নির্বাচন করুন")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      const isUpaCityIdExist = await isExistsByColumn(
        "upa_city_id",
        "master.mv_upazila_city_info",
        await pgConnect.getConnection("slave"),
        { upaCityId: value }
      );
      return isUpaCityIdExist ? true : Promise.reject();
    })
    .withMessage("Upacity Id is not present in database"),
  body("permanentAddress.upaCityType", "invalid upaCityType").exists().notEmpty().isIn(["UPA", "CITY"]),

  body("permanentAddress.uniThanaPawId", "স্থায়ী ঠিকানার ইউনিয়ন/থানা/পৌরসভা নির্বাচন করুন")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      const isUniThanaPawIdExist = await isExistsByColumn(
        "uni_thana_paw_id",
        "master.mv_union_thana_paurasabha_info",
        await pgConnect.getConnection("slave"),
        { uniThanaPawId: value }
      );
      return isUniThanaPawIdExist ? true : Promise.reject();
    })
    .withMessage("uniThanaPaw Id is not present in database")
    .optional(),

  body("permanentAddress.uniThanaPawType", "invalid uniThanaPawType")
    .exists()
    .notEmpty()
    .isIn(["UNI", "THANA", "PAW"])
    .optional(),

  body("permanentAddress.detailsAddress", "invalid DetailsAddress")
    .exists()
    .isLength({ min: 0, max: 256 })
    .withMessage(" স্থায়ী ঠিকানার বিস্তারিত ঠিকানা ১ থেকে ২৫৬  অক্ষরের মধ্যে হতে হবে ")
    .optional(),

  body("presentAddress", "Invalid present Adress").exists().notEmpty(),
  body("presentAddress.id", "invalid presentAddress id ")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      const isPresentAddressIdExist = await isExistsByColumn(
        "id",
        "temps.member_address_info",
        await pgConnect.getConnection("slave"),
        { id: value }
      );
      return isPresentAddressIdExist ? true : Promise.reject();
    })
    .withMessage("presentAddress Id is not present in database"),
  body("presentAddress.addressType", "invalid Adress type").exists().notEmpty().isIn(["PRE"]),
  body("presentAddress.districtId", "বর্তমান ঠিকানার জেলা নির্বাচন করুন")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      const isDistrictIdExist = await isExistsByColumn(
        "id",
        "master.district_info",
        await pgConnect.getConnection("slave"),
        { id: value }
      );
      return isDistrictIdExist ? true : Promise.reject();
    })
    .withMessage("District Id is not present in database"),
  body("presentAddress.upaCityId", "বর্তমান ঠিকানার উপজেলা/সিটি কর্পোরেশন নির্বাচন করুন")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      const isUpaCityIdExist = await isExistsByColumn(
        "upa_city_id",
        "master.mv_upazila_city_info",
        await pgConnect.getConnection("slave"),
        { upaCityId: value }
      );
      return isUpaCityIdExist ? true : Promise.reject();
    })
    .withMessage("Upacity Id is not present in database"),
  body("presentAddress.upaCityType", "invalid upaCityType").exists().notEmpty().isIn(["UPA", "CITY"]),

  body("presentAddress.uniThanaPawId", "বর্তমান ঠিকানার ইউনিয়ন/থানা/পৌরসভা নির্বাচন করুন")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      const isUniThanaPawIdExist = await isExistsByColumn(
        "uni_thana_paw_id",
        "master.mv_union_thana_paurasabha_info",
        await pgConnect.getConnection("slave"),
        { uniThanaPawId: value }
      );
      return isUniThanaPawIdExist ? true : Promise.reject();
    })
    .withMessage("uniThanaPaw Id is not present in database")
    .optional(),

  body("presentAddress.uniThanaPawType", "invalid uniThanaPawType")
    .exists()
    .notEmpty()
    .isIn(["UNI", "THANA", "PAW"])
    .optional(),

  body("presentAddress.detailsAddress", "invalid DetailsAddress")
    .exists()
    .isLength({ min: 0, max: 256 })
    .withMessage(" বর্তমান ঠিকানার বিস্তারিত ঠিকানা ১ থেকে ২৫৬  অক্ষরের মধ্যে হতে হবে ")
    .optional(),
];

export const validateMemberInfoParam = [
  param("id")
    .exists()
    .withMessage("Param Id is not present")
    .notEmpty()
    .withMessage("Param Id can not be empty")
    .custom(async (value) => {
      if (!(await SamityRegistrationService.samityIdExist(parseInt(value)))) {
        return Promise.reject();
      }
    })
    .withMessage("Samity id does not exist in database"),
];

export const validateMemberCommitteeDesignation = [
  body("committeeOrganizer", "Invalid Committee Organizer Id").exists().notEmpty().isInt({ min: 1 }),
  body("committeeContactPerson", "Invalid Committee Contact Person Id").exists().notEmpty().isInt({ min: 1 }),
  body("committeeSignatoryPerson", "Invalid Committee Signatory Person Id").exists().notEmpty().isInt({ min: 1 }),
];

export const validateMemberInfoQuery = [
  query()
    .custom((value: any) => {
      const values = [];
      values.push(Object(omit(value, ["isPagination", "limit", "page"])));
      return isKeyExist(keysOfTables.memberRegistrationInfo, values);
    })
    .withMessage("query params invalid"),
];

function isExistField(value: any, type: string) {
  const addressKey = Object.keys(value);

  const inputField = [
    "addressType",
    "districtId",
    "upaCityId",
    "upaCityType",
    "uniThanaPawId",
    "uniThanaPawType",
    "detailsAddress",
  ];

  const updateField = [
    "id",
    "samityId",
    "memberId",
    "addressType",
    "districtId",
    "upaCityId",
    "upaCityType",
    "uniThanaPawId",
    "uniThanaPawType",
    "detailsAdress",
    "detailsAddress",
  ];
  if (type === "post") {
    for (const element of addressKey) {
      if (!inputField.includes(element)) {
        return false;
      }
    }

    return true;
  } else if (type === "update") {
    for (const element of addressKey) {
      if (!updateField.includes(element)) {
        return false;
      }
    }
    return true;
  } else {
    return true;
  }
}

function checkJson(value: string) {
  const jsonAddress = JSON.parse(value);
  if (jsonAddress) {
    return true;
  } else return false;
}

function checkAddressType(value: string, type: string) {
  const jsonAddress = JSON.parse(value);
  if (type == "permanent" && jsonAddress.addressType == "PER") {
    return true;
  } else if (type == "present" && jsonAddress.addressType == "PRE") {
    return true;
  } else false;
}

function nullCheckOfAddress(values: string, type: string) {
  if (type === "permanent") {
    const jsonpPrmanentAddress: MemberAddress = JSON.parse(values);
    if (
      !Number.isInteger(jsonpPrmanentAddress.districtId) ||
      jsonpPrmanentAddress.districtId == null ||
      jsonpPrmanentAddress.districtId == undefined
    ) {
      throw new BadRequestError("স্থায়ী ঠিকানা- জেলা নির্বাচন করুন");
    } else if (
      !Number.isInteger(jsonpPrmanentAddress.upaCityId) ||
      jsonpPrmanentAddress.upaCityId == null ||
      jsonpPrmanentAddress.upaCityId == undefined
    ) {
      throw new BadRequestError("স্থায়ী ঠিকানা - উপজেলা/সিটি কর্পোরেশন নির্বাচন করুন ");
    } else if (
      !Number.isInteger(jsonpPrmanentAddress.uniThanaPawId) ||
      jsonpPrmanentAddress.uniThanaPawId == null ||
      jsonpPrmanentAddress.uniThanaPawId == undefined
    ) {
      throw new BadRequestError(" স্থায়ী ঠিকানা - ইউনিয়ন,থানা,পৌরসভা নির্বাচন করুন  ");
    } else {
      return true;
    }
  } else if (type === "present") {
    const jsonPresentAddress: MemberAddress = JSON.parse(values);
    if (
      !Number.isInteger(jsonPresentAddress.districtId) ||
      jsonPresentAddress.districtId == null ||
      jsonPresentAddress.districtId == undefined
    ) {
      throw new BadRequestError("বর্তমান ঠিকানা - জেলা নির্বাচন করুন");
    } else if (
      !Number.isInteger(jsonPresentAddress.upaCityId) ||
      jsonPresentAddress.upaCityId == null ||
      jsonPresentAddress.upaCityId == undefined
    ) {
      throw new BadRequestError(" বর্তমান ঠিকানা  - উপজেলা/সিটি কর্পোরেশন নির্বাচন করুন  ");
    } else if (
      !Number.isInteger(jsonPresentAddress.uniThanaPawId) ||
      jsonPresentAddress.uniThanaPawId == null ||
      jsonPresentAddress.uniThanaPawId == undefined
    ) {
      throw new BadRequestError(" বর্তমান ঠিকানা  - ইউনিয়ন,থানা,পৌরসভা নির্বাচন করুন  ");
    } else {
      return true;
    }
  }
}
