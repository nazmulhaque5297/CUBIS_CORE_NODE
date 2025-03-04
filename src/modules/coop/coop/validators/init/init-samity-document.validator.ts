import { body, param } from "express-validator";
import moment from "moment";
import { BadRequestError, isExistsByColumn } from "rdcd-common";
import Container from "typedi";
import { pgConnect } from "../../../../../db-coop/factory/connection.db";
import { MasterDataServices } from "../../../../../modules/master/services/master-data-coop.service";
import { SamityDocumentServices } from "../../services/init/init-samity-document.service";

const commonValidation = [
  body("samityId", "সমিতি আইডি নিষ্ক্রিয়")
    .exists()
    .withMessage("সমিতি নির্বাচন করুন ")
    .bail()
    .notEmpty()
    .withMessage("সমিতি নির্বাচন করুন ")
    .bail()
    .trim()
    .toInt()
    .withMessage("সমিতি নম্বর হতে হবে")
    .bail()
    .isInt({ min: 1 })
    .custom(async (value, { req }) => {
      const isSamityExist: any = await isExistsByColumn(
        "id",
        "temps.samity_info",
        await pgConnect.getConnection("slave"),
        { id: parseInt(value) }
      );
      return isSamityExist ? true : Promise.reject();
    })
    .withMessage("সমিতি আইডিটি ডাটাবেসে উপস্থিত নেই")
    .bail(),
  body("documentNo")
    .isString()
    .isLength({ min: 0, max: 150 })
    .withMessage("ডকুমেন্ট এর নাম ১৫০ অক্ষরের বেশি হতে পারবে না ")
    .optional(),
  body("effectDate", "মেয়াদ শুরুর তারিখ নিষ্ক্রিয়")
    .custom((value) => {
      if (value) {
        const isDateValid = moment(value, "DD/MM/YYYY", true).isValid();
        return isDateValid ? true : false;
      } else {
        return true;
      }
    })
    .withMessage("মেয়াদ শুরুর তারিখ এর ফরম্যাট টি ঠিক নেই ")
    .optional(),
  body("expireDate", "মেয়াদত্তীর্ন তারিখ নিষ্ক্রিয়")
    .custom((value) => {
      if (value) {
        const isDateValid = moment(value, "DD/MM/YYYY", true).isValid();
        return isDateValid ? true : false;
      } else {
        return true;
      }
    })
    .withMessage("মেয়াদত্তীর্ন তারিখ এর ফরম্যাট টি ঠিক নেই ")
    .optional(),
  body("documentName", "ডকুমেন্ট প্রদান করুন"),
];

export const validateSamityDocument = [
  ...commonValidation,
  body("documentId", "ডকুমেন্ট নির্বাচন করুন")
    .exists()
    .withMessage("ডকুমেন্ট নির্বাচন করুন")
    .bail()
    .notEmpty()
    .withMessage("ডকুমেন্ট নির্বাচন করুন")
    .isLength({ min: 1, max: 10 })
    .withMessage("ডকুমেন্ট টাইপ  ১০ অক্ষরের বেশি হতে পারবে না ")
    .custom(async (value) => {
      const isDocumentTypeExist = await isExistsByColumn(
        "id",
        "master.document_type",
        await pgConnect.getConnection("slave"),
        { id: parseInt(value) }
      );
      return isDocumentTypeExist ? true : Promise.reject();
    })
    .custom(async (value, { req }) => {
      const MasterDataService = Container.get(MasterDataServices);

      const isDocumentExist = await isExistsByColumn(
        "id",
        "temps.samity_document",
        await pgConnect.getConnection("slave"),
        { samityId: req.body.samityId, documentId: value }
      );

      const documentName = await MasterDataService.get("document-type", "", 10, 2, { id: value }, false);

      if (isDocumentExist) {
        throw new BadRequestError(`${documentName[0].doc_type_desc} ডকুমেন্ট টি রয়েছে `);
      }
      return true;
    }),
];

export const validateSamityDocumentDel = [
  param("id")
    .custom(async (value) => {
      const isExist = await isExistsByColumn("id", "temps.samity_document", await pgConnect.getConnection("slave"), {
        id: value,
      });
      return isExist ? true : false;
    })
    .withMessage("সমিতি ডকুমেন্ট এর আইডি টি পাওয়া যায়নি ")
    .isNumeric(),
];

export const validateSamityDocumentUpdate = [
  ...commonValidation,
  body("documentId", "ডকুমেন্ট নির্বাচন করুন")
    .exists()
    .withMessage("ডকুমেন্ট টাইপ নির্বাচন করুন")
    .bail()
    .notEmpty()
    .withMessage("ডকুমেন্ট টাইপ নির্বাচন করুন")
    .isLength({ min: 1, max: 10 })
    .withMessage("ডকুমেন্ট টাইপ  ১০ অক্ষরের বেশি হতে পারবে না ")
    .custom(async (value) => {
      const isDocumentTypeExist = await isExistsByColumn(
        "id",
        "master.document_type",
        await pgConnect.getConnection("slave"),
        { id: parseInt(value) }
      );
      return isDocumentTypeExist ? true : Promise.reject();
    })
    .custom(async (value, { req }) => {
      const MasterDataService = Container.get(MasterDataServices);
      const SamityDocumentService = Container.get(SamityDocumentServices);

      const isDocumentValidForUpdate = await SamityDocumentService.isDocumentValidForUpdate(
        req.body.samityId,
        req.params,
        value
      );
      const documentName = await MasterDataService.get("document-type", "", 10, 2, { id: value }, false);

      if (!isDocumentValidForUpdate) {
        throw new BadRequestError(`${documentName[0].doc_type_desc} ডকুমেন্ট টি রয়েছে `);
      }
      return true;
    }),
  ...validateSamityDocumentDel,
];
