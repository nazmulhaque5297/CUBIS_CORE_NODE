import { body, param, query } from "express-validator";
import { isExistsByColumn } from "rdcd-common";
import Container from "typedi";
import { pgConnect } from "../../../../../../db-coop/factory/connection.db";
import { NameClearanceServices } from "../../../../../../modules/coop/coop/services/coop/name-clearance.service";
import { PendingApprovalServices } from "../../../services/coop/application/application-query.service";

const PendingApprovalService = Container.get(PendingApprovalServices);
const NameClearanceService = Container.get(NameClearanceServices);

const nameClearanceValidation = [
  body("data.samityLevel")
    .exists()
    .withMessage("সমিতির টাইপ (প্রাথমিক/কেন্দ্রীয়/জাতীয় ) নির্বাচন করুন ")
    .notEmpty()
    .withMessage("সমিতির টাইপ (প্রাথমিক/কেন্দ্রীয়/জাতীয় ) নির্বাচন করুন ")
    .isIn(["P", "C", "N"])
    .withMessage("Samity Level Must be P,C,N"),
  body("data.divisionId", "বিভাগ নির্বাচন করুন")
    .exists()
    .withMessage("divisionId is required")
    .notEmpty()
    .withMessage("বিভাগ নির্বাচন করুন")
    .custom(async (value) => {
      const isDivisionIdExist = await isExistsByColumn(
        "id",
        "master.division_info",
        await pgConnect.getConnection("slave"),
        { id: value }
      );

      return isDivisionIdExist ? true : Promise.reject();
    }),
  body("data.districtId", "জেলা নির্বাচন করুন")
    .exists()
    .withMessage("districtId is required")
    .notEmpty()
    .withMessage("জেলা নির্বাচন করুন")
    .custom(async (value) => {
      const isDistrictIdExist = await isExistsByColumn(
        "id",
        "master.district_info",
        await pgConnect.getConnection("slave"),
        { id: value }
      );

      return isDistrictIdExist ? true : Promise.reject();
    }),
  body("data.officeId")
    .exists()
    .withMessage("officeId is required")
    .notEmpty()
    .withMessage("অফিস নির্বাচন করুন")
    .custom(async (value) => {
      const isOfficeExist = await isExistsByColumn("id", "master.office_info", await pgConnect.getConnection("slave"), {
        id: value,
      });

      return isOfficeExist ? true : Promise.reject();
    })
    .withMessage("অফিস নির্বাচন করুন"),

  body("data.samityTypeId")
    .exists()
    .withMessage("samityTypeId is required")
    .notEmpty()
    .withMessage("সমিতি ক্যাটাগরি নির্বাচন করুন ")
    .custom(async (value) => {
      const isSamityTypeIdExist = await isExistsByColumn(
        "id",
        "coop.samity_type",
        await pgConnect.getConnection("slave"),
        { id: value }
      );
      return isSamityTypeIdExist ? true : Promise.reject();
    })
    .withMessage("সমিতি ক্যাটাগরি নির্বাচন করুন"),
  body("data.status").exists().withMessage("status is required").notEmpty().withMessage("status is required"),
];

export const nameClearanceRequest = [
  ...nameClearanceValidation,
  body("data.samityName")
    .exists()
    .withMessage("samityName is required")
    .notEmpty()
    .withMessage("সমিতি নাম লিখুন")
    .trim()
    .isString()
    .withMessage("সমিতির নাম স্ট্রিং হতে হবে ")
    .isLength({ min: 1, max: 200 })
    .withMessage("সমিতির নাম ১ থেকে ২০০ অক্ষরের মধ্যে হতে হবে ")
    .custom(async (value, { req }) => {
      const isSamityNameExist = await NameClearanceService.isSamityNameExist(
        value,
        req.body.data.officeId,
        req.body.data.samityTypeId
      );
      return isSamityNameExist ? Promise.reject() : true;
    })
    .withMessage("সমিতির নাম বিদ্যমান রয়েছে "),
];

export const nameClearanceUpdate = [
  param("id")
    .notEmpty()
    .withMessage("Id is not present")
    .custom(async (value, { req }) => {
      const isExistInApprovalTable = await isExistsByColumn(
        "id",
        "coop.application_approval",
        await pgConnect.getConnection("slave"),
        { application_id: value }
      );
      if (isExistInApprovalTable) {
        const isDataSame = await PendingApprovalService.queryBasedOnData("*", [
          { officeId: req.body.data.officeId },
          { divisionId: req.body.data.divisionId },
          { districtId: req.body.data.districtId },
        ]);

        return isDataSame ? true : Promise.reject();
      }

      return true;
    })

    .withMessage("This Application can not be updated because of some action is already done for this application"),
  ...nameClearanceValidation,
  body("data.samityName")
    .exists()
    .withMessage("samityName is required")
    .notEmpty()
    .withMessage("সমিতি নাম লিখুন")
    .trim()
    .isString()
    .withMessage("সমিতির নাম স্ট্রিং হতে হবে ")
    .isLength({ min: 1, max: 200 })
    .withMessage("সমিতির নাম ১ থেকে ২০০ অক্ষরের মধ্যে হতে হবে ")
    .custom(async (value, { req }) => {
      const isSamityNameExist = await NameClearanceService.isSamityNameExistUpdate(
        value,
        req.body.data.officeId,
        req.body.data.samityTypeId,
        req.param.id
      );
      return isSamityNameExist ? Promise.reject() : true;
    })
    .withMessage("সমিতির নাম বিদ্যমান রয়েছে "),
];

export const nameClearanceGet = [
  query("officeId")
    .exists()
    .withMessage("অফিস নির্বাচন করুন ")
    .notEmpty()
    .withMessage("অফিস নির্বাচন করুন ")
    .isNumeric()
    .withMessage("অফিস আইডি নম্বর হতে হবে")
    .custom(async (value) => {
      const isOfficeIdExist = await isExistsByColumn(
        "id",
        "master.office_info",
        await pgConnect.getConnection("slave"),
        { id: value }
      );
      return isOfficeIdExist ? true : Promise.reject();
    })
    .withMessage("অফিস আইডি ডাটাবেইজ এ পাওয়া যায় নি"),
  query("samityTypeId", "সমিতির ক্যাটাগরি নির্বাচন করুন ")
    .exists()
    .withMessage("পেলোড এ সমিতি ক্যাটাগরি নেই ")
    .notEmpty()
    .withMessage("সমিতির ক্যাটাগরি নির্বাচন করুন")
    .isNumeric()
    .withMessage("samity Type Id MustBe a number")
    .custom(async (value) => {
      const isSamityTypeIdExist = await isExistsByColumn(
        "id",
        "coop.samity_type",
        await pgConnect.getConnection("slave"),
        { id: value }
      );
      return isSamityTypeIdExist ? true : Promise.reject();
    })
    .withMessage("সমিতির ক্যাটাগরি ডাটাবেইজ এ পাওয়া যায় নি"),
];
