import { body, CustomSanitizer, param, query } from "express-validator";
import { BadRequestError, isExistsByColumn } from "rdcd-common";
import Container from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { MasterDataServices } from "../../../../modules/master/services/master-data-coop.service";

const toInt: CustomSanitizer = (value) => {
  return value.map((v: any) => {
    return parseInt(v);
  });
};

export const createRole = [
  body("roleName", "Name must be in range 1 to 50 characters").isLength({ min: 1, max: 50 }).trim(),
  body("description", "Name must be in range 1 to 50 characters").isLength({ min: 1, max: 500 }).trim(),
  body("isActive").isBoolean(),
  body("features").isArray({ min: 0 }).customSanitizer(toInt),
];

export const getRoleWithFilter = [
  query("page", "Invalid page number provided").isInt({ min: 1 }),
  query("limit", "Invalid page number provided").optional().isInt({ min: 1 }),
  query("roleName", "Name must be in range 1 to 50 characters").optional().isLength({ min: 1, max: 50 }).trim(),
  query("isActive").optional().isBoolean(),
  query("approveStatus", "Approve status must be in A, P, R").optional().isIn(["A", "P", "R"]),
  query("approvedBy", "Name must be in range 1 to 50 characters").optional().isLength({ min: 1, max: 50 }).trim(),
  query("createdBy", "Name must be in range 1 to 50 characters").optional().isLength({ min: 1, max: 50 }).trim(),
  query("updatedBy", "Name must be in range 1 to 50 characters").optional().isLength({ min: 1, max: 50 }).trim(),
];

export const getRoleById = [param("id", "Invalid id number provided").isInt({ min: 1 })];

const commonValidator = [
  body("samityTypeInfo", "samityTypeInfo is invalid").exists().notEmpty(),

  body("samityTypeInfo.goal", "সমিতির লক্ষ্য ও উদ্দেশ্য লিখুন").exists().notEmpty(),
  body("samityTypeInfo.goal.*.goal", "সমিতির লক্ষ্য ও উদ্দেশ্য লিখুন").exists().notEmpty(),
  body("samityTypeInfo.goal.*.samityLevel", "samity level is not valid").exists().notEmpty().isIn(["P", "C", "N"]),
  body("docMappingInfo", "docMappingInfo is invalid")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      const primaryDocIds = findDuplicateDocIds(value, "P");
      if (primaryDocIds.length > 0) {
        const docName = await duplicateDocName(primaryDocIds);
        throw new BadRequestError(`প্রাইমারি সমিতির ক্ষেত্রে ${docName} ডকুমেন্ট একাধিকবার রয়েছে`);
      } else if (primaryDocIds.length == 0) {
        const centralDocIds = findDuplicateDocIds(value, "C");
        if (centralDocIds.length > 0) {
          const docName = await duplicateDocName(centralDocIds);
          throw new BadRequestError(`কেন্দ্রীয় সমিতির ক্ষেত্রে ${docName} ডকুমেন্ট একাধিকবার রয়েছে`);
        } else if (centralDocIds.length == 0) {
          const nationalDocIds = findDuplicateDocIds(value, "N");
          if (nationalDocIds.length > 0) {
            const docName = await duplicateDocName(nationalDocIds);
            throw new BadRequestError(`জাতীয় সমিতির ক্ষেত্রে ${docName} ডকুমেন্ট একাধিকবার রয়েছে`);
          }
        }
      }
    }),
  body("docMappingInfo.*.type", "ডকুমেন্ট এর ব্যবহার নির্বাচন করুন ").exists().notEmpty().isIn(["M", "S"]),
  body("docMappingInfo.*.docTypeId", "ডকুমেন্ট এর ধরণ নির্বাচন করুন ")
    .exists()
    .notEmpty()
    .custom(async (value, { req }) => {
      const isDoctypeExist: any = await isExistsByColumn(
        "id",
        "master.document_type",
        await pgConnect.getConnection("slave"),
        { id: value }
      );

      return isDoctypeExist ? true : Promise.reject();
    })
    .withMessage("doc type is not valid in database"),
  body("docMappingInfo.*.isMandatory", "বাধ্যতামূলক অথবা ঐচ্ছিক নির্বাচন করুন ").exists().notEmpty().isIn(["Y", "N"]),
];

export const updateDocMapping = [
  body("id", "invalid doc mapping id is provided")
    .exists()
    .notEmpty()
    .isInt({ min: 1 })
    .custom(async (value) => {
      const isDocMappingIdExist = await isExistsByColumn(
        "id",
        "coop.samity_doc_mapping",
        await pgConnect.getConnection("slave"),
        { id: value }
      );
      return isDocMappingIdExist ? true : Promise.reject();
    }),
  body("samityTypeId", "invalid samity type id is provided")
    .exists()
    .notEmpty()
    .isInt({ min: 1 })
    .custom(async (value) => {
      const isDocMappingIdExist = await isExistsByColumn(
        "id",
        "coop.samity_type",
        await pgConnect.getConnection("slave"),
        { id: value }
      );
      return isDocMappingIdExist ? true : Promise.reject();
    }),

  body("type").exists().withMessage("type key is not present").notEmpty().withMessage("type can not be null"),
  body("goal")
    .exists()
    .withMessage("goal is not present in the payload")
    .notEmpty()
    .withMessage("goal can not be null")
    .isArray({ min: 1 })
    .withMessage("goal must be an array"),
  body("goal.*.goal").exists().withMessage("goal key must be present in the index"),
  body("goal.*.samityLevel", "Invalid samity Level is provided")
    .exists()
    .withMessage("samityLevel key must be present in the index")
    .isIn(["P", "N", "C"]),
  body("docTypeId", "invalid docTypeId ")
    .exists()
    .notEmpty()
    .isInt({ min: 1 })
    .custom(async (values) => {
      const isDocTypeIdExist = await isExistsByColumn(
        "id",
        "master.document_type",
        await pgConnect.getConnection("slave"),
        { id: values }
      );
      return isDocTypeIdExist ? true : Promise.reject();
    }),

  body("isMandatory", "isMandatory is invalid").exists().notEmpty().isIn(["N", "Y"]),

  body("typeName", "invalid Type Name").exists().notEmpty(),
];

export const ValidatePostDocMapping = [
  body("samityTypeInfo.typeName", "সমিতি ধরণের নাম লিখুন ")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      const isSamityTypeExit = await isExistsByColumn(
        "id",
        "coop.samity_type",
        await pgConnect.getConnection("slave"),
        { typeName: value }
      );

      return isSamityTypeExit ? Promise.reject() : true;
    })
    .withMessage("সমিতির ধরন বিদ্যমান রয়েছে"),
  body("samityTypeInfo.samityTypeCode", "সমিতি ধরণের কোড লিখুন ")
    .exists()
    .notEmpty()
    .custom(async (value, { req }) => {
      const isSamityTypeExit = await isExistsByColumn(
        "id",
        "coop.samity_type",
        await pgConnect.getConnection("slave"),
        { samityTypeCode: value, doptorId: req.body.samityTypeInfo.doptorId }
      );
      console.log({ isSamityTypeExit });
      return isSamityTypeExit ? Promise.reject() : true;
    })
    .withMessage("সমিতির ধরণের কোড বিদ্যমান রয়েছে"),
  ...commonValidator,
];

export const ValidateUpdateDocMapping = [
  body("samityTypeInfo.id", "samity type id is not valid ")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      const isSamityTypeIdExist = await isExistsByColumn(
        "id",
        "coop.samity_type",
        await pgConnect.getConnection("slave"),
        { id: value }
      );

      return isSamityTypeIdExist ? true : Promise.reject();
    }),

  body("docMappingInfo.*.id", "id is not valid")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      let isDoctypeExist;
      value == 0
        ? (isDoctypeExist = true)
        : (isDoctypeExist = await isExistsByColumn(
            "id",
            "coop.samity_doc_mapping",
            await pgConnect.getConnection("slave"),
            { id: value }
          ));

      return isDoctypeExist ? true : Promise.reject();
    })
    .withMessage(" Id is not valid in database"),
  ...commonValidator,
];

export const ValidateDeleteDocMapping = [
  param("docMappingId", "Invalid DocMappingId")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      const isDocMappingIdExist = await isExistsByColumn(
        "id",
        "coop.samity_doc_mapping",
        await pgConnect.getConnection("slave"),
        { id: value }
      );

      return isDocMappingIdExist ? true : Promise.reject();
    })
    .withMessage("ডকুমেন্টের ম্যাপিং টি ডাটাবেস এ বিদ্যমান নেই "),
];

async function duplicateDocName(docIds: any[]) {
  const MasterDataService = Container.get(MasterDataServices);
  let docName = ``;
  for (const [index, element] of docIds.entries()) {
    const documentName = await MasterDataService.get("document-type", "", 10, 10, { id: element }, false);
    index == 0
      ? (docName = docName + documentName[0].doc_type_desc)
      : (docName = docName + "," + documentName[0].doc_type_desc);
  }

  return docName;
}

function findDuplicateDocIds(data: any, samityLevel: string) {
  const duplicateDocIdsForSamity = data
    .filter((e: any) => e.samityLevel == samityLevel && e.type == "S")
    .map((e: any) => {
      return e.docTypeId;
    })
    .filter((item: any, index: number, self: any) => self.indexOf(item) !== index);

  //if samity document is unique then check the member document list

  let duplicateDocIdsForMember = [];
  if (duplicateDocIdsForSamity.length == 0) {
    duplicateDocIdsForMember = data
      .filter((e: any) => e.samityLevel == samityLevel && e.type == "M")
      .map((e: any) => {
        return e.docTypeId;
      })
      .filter((item: any, index: number, self: any) => self.indexOf(item) !== index);
  }

  return duplicateDocIdsForSamity.length > 0 ? duplicateDocIdsForSamity : duplicateDocIdsForMember;
}
