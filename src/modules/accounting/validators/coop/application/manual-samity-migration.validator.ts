import { body, Meta } from "express-validator";
import { BadRequestError, isExistsByColumn } from "rdcd-common";
import { pgConnect } from "../../../../../../db-coop/factory/connection.db";

export const manualSamityMigrationValidation = [
  body("data.samityInfo")
    .exists()
    .withMessage("samityInfo doest not exist in data")
    .notEmpty()
    .withMessage("samity Info can not be null"),

  body("data.samityInfo.samityName")
    .exists()
    .withMessage("সমিতির নাম দিন")
    .notEmpty()
    .withMessage("সমিতির নাম দিন")
    .isString()
    .withMessage("সমিতির নাম স্ট্রিং হতে হবে ")
    .isLength({ min: 1, max: 200 })
    .withMessage("সমিতির নাম ১ থেকে ২০০ অক্ষরের মধ্যে হতে হবে "),

  body("data.samityInfo.samityLevel", "অকার্যকর সমিতির টাইপ দেয়া হয়েছে")
    .exists()
    .withMessage("অকার্যকর সমিতির টাইপ দেয়া হয়েছে")
    .notEmpty()
    .withMessage("সমিতির টাইপ নির্বাচন করুন")
    .isIn(["C", "N", "P"]),
  body("data.samityInfo.samityDivisionId")
    .exists()
    .withMessage("সমিতির কার্যালয়ের ঠিকানা - অকার্যকর বিভাগ আইডি দেয়া হয়েছে ")
    .notEmpty()
    .withMessage("সমিতির কার্যালয়ের ঠিকানা - বিভাগ  নির্বাচন করুন")
    .custom(async (value) => {
      const isDivisionIdExist = await isExistsByColumn(
        "id",
        "master.division_info",
        await pgConnect.getConnection("slave"),
        { id: value }
      );

      return isDivisionIdExist ? true : Promise.reject();
    })
    .withMessage("সমিতির বিভাগ বিদ্যমান নেই"),

  body("data.samityInfo.samityDistrictId")
    .exists()
    .withMessage("সমিতির কার্যালয়ের ঠিকানা - অকার্যকর জেলা আইডি দেয়া হয়েছে")
    .notEmpty()
    .withMessage("সমিতির কার্যালয়ের ঠিকানা - জেলা নির্বাচন করুন")
    .custom(async (value) => {
      const isDistrictIdExist = await isExistsByColumn(
        "id",
        "master.district_info",
        await pgConnect.getConnection("slave"),
        { id: value }
      );

      return isDistrictIdExist ? true : Promise.reject();
    })
    .withMessage("সমিতির জেলা বিদ্যমান নেই"),

  body("data.samityInfo.samityUpaCityType", "invalid samityUpaCityType")
    .exists()
    .withMessage("সমিতির কার্যালয়ের ঠিকানা - অকার্যকর উপজেলা/সিটি কর্পোরেশন আইডি দেয়া হয়েছে")
    .notEmpty()
    .withMessage("সমিতির কার্যালয়ের ঠিকানা - উপজেলা//সিটি কর্পোরেশন দিন")
    .isIn(["UPA", "CITY"])
    .withMessage("samityUpaCityType must be UPA or CITY"),
  body("data.samityInfo.samityUniThanaPawId", "invalid samityUniThanaPawId")
    .exists()
    .withMessage("সমিতির কার্যালয়ের ঠিকানা - অকার্যকর ইউনিয়ন/থানা/পৌরসভা  আইডি দেয়া হয়েছে")
    .notEmpty()
    .withMessage("কর্ম এলাকার থানা  অথবা পৌরসভা নির্বাচন করুন")
    .optional(),

  body("data.samityInfo.samityUniThanaPawType")
    .exists()
    .withMessage("সমিতির কার্যালয়ের ঠিকানা - অকার্যকর অকার্যকর ইউনিয়ন/থানা/পৌরসভা টাইপ আইডি দেয়া হয়েছে")
    .notEmpty()
    .withMessage("সমিতির ইউনিয়ন নির্বাচন করুন")
    .isIn(["UNI", "THANA", "PAW"])
    .withMessage("samityUniThanaPawType must be UNI, THANA,PAW"),
  body("data.samityInfo.samityDetailsAddress")
    .exists()
    .withMessage("সমিতির বিস্তারিতই ঠিকানা দিন")
    .isString()
    .withMessage("সমিতির বিস্তারিতই ঠিকানা স্ট্রিং হতে হবে ")
    .isLength({ min: 1, max: 256 })
    .withMessage("সমিতির বিস্তারিতই ঠিকানা ১ থেকে ২৫৬ অক্ষরের মধ্যে হতে হবে "),
  body("data.samityInfo.samityTypeId")
    .exists()
    .withMessage("অকার্যকর সমিতি ক্যাটাগরি নির্বাচন  দেয়া হয়েছে")
    .notEmpty()
    .withMessage("সমিতির ক্যাটাগরি নির্বাচন করুন")
    .custom(async (value) => {
      const isSamityTypeIdExist = await isExistsByColumn(
        "id",
        "coop.samity_type",
        await pgConnect.getConnection("slave"),
        { id: value }
      );

      return isSamityTypeIdExist ? true : Promise.reject();
    })
    .withMessage("সমিতির ধরণ বিদ্যমান নেই"),

  // body("data.samityInfo.samityFormationDate")
  //   .exists()
  //   .withMessage("সমিতি গঠনের দিন নির্বাচন করুন")
  //   .notEmpty()
  //   .withMessage("সমিতি গঠনের দিন নির্বাচন করুন"),
  // body("data.samityInfo.oldRegistrationNo")
  //   .exists()
  //   .withMessage("সমিতির মূল নিবন্ধন নম্বর প্রদান করুন ")
  //   .notEmpty()
  //   .withMessage("সমিতির মূল নিবন্ধন নম্বর প্রদান করুন ")
  //   .custom(async (value) => {
  //     const isOldRegExist = await isExistsByColumn("id", "coop.samity_info", await pgConnect.getConnection("slave"), {
  //       oldRegistrationNo: value,
  //     });

  //     return isOldRegExist ? Promise.reject() : true;
  //   })
  //   .withMessage("সমিতির মূল নিবন্ধন নম্বরটি বিদ্যমান রয়েছে "),
  body("data.samityInfo.purpose")
    .exists()
    .withMessage("Purpose is not present in the payload")
    .notEmpty()
    .withMessage("Purpose can not be null")
    .isString()
    .withMessage("সমিতির purpose  স্ট্রিং হতে হবে ")
    .isLength({ min: 1, max: 256 })
    .withMessage("সমিতির purpose  ১ থেকে ২৫৬ অক্ষরের মধ্যে হতে হবে "),
  body("data.samityInfo.memberAreaType")
    .exists()
    .withMessage("সদস্য এলাকার ধরণ নির্বাচন করুন")
    .notEmpty()
    .withMessage("সদস্য এলাকার ধরণ নির্বাচন করুন")
    .isIn([1, 2, 3, 4, 5])
    .withMessage("memberAreaType is not a valid number "),
  body("data.samityInfo.workingAreaType")
    .exists()
    .withMessage("কর্ম এলাকার ধরণ নির্বাচন করুন")
    .notEmpty()
    .withMessage("কর্ম এলাকার ধরণ নির্বাচন করুন")
    .isIn([1, 2, 3, 4, 5])
    .withMessage("workingAreaType is not a valid number "),
  //working area --------------------------------------------------------------------------------

  body("data.workingArea").isArray({ min: 1 }).withMessage("workingArea is not array"),

  body("data.workingArea.*.status", "Status can not be null").exists().notEmpty().trim().toLowerCase(),
  body("data.workingArea.*.divisionId", "বিভাগ নির্বাচন করুন ")
    .exists()
    .trim()
    .notEmpty()
    .custom(async (value) => {
      const isDivisionIdExist = await isExistsByColumn(
        "id",
        "master.division_info",
        await pgConnect.getConnection("slave"),
        { id: value }
      );

      return isDivisionIdExist ? true : Promise.reject();
    })
    .withMessage("কর্ম এলাকার নির্বাচিত বিভাগ বিদ্দমান নেই"),
  body("data.workingArea.*.districtId", " districtId Key dose not exits")
    .exists()
    .trim()
    .custom(async (value) => {
      const isDistrictIdExist = await isExistsByColumn(
        "id",
        "master.district_info",
        await pgConnect.getConnection("slave"),
        { id: value }
      );

      return isDistrictIdExist ? true : Promise.reject();
    })
    .withMessage("কর্ম এলাকার নির্বাচিত বিভাগ বিদ্দমান নেই")
    .optional(),
  body("data.workingArea.*.upaCityId", " উপজিলা নির্বাচন করুন").exists().trim().optional(),

  body("data.workingArea.*.upaCityType", "উপজিলা নির্বাচন করুন")
    .exists()
    .trim()
    .isIn(["UPA", "CITY"])
    .withMessage("samityUpaCityType must be UPA or CITY")
    .optional(),

  body("data.workingArea.*.uniThanaPawId", "ইউনিয়ন নির্বাচন করুন").exists().trim().optional(),

  body("data.workingArea.*.uniThanaPawType", "ইউনিয়ন নির্বাচন করুন")
    .exists()
    .trim()
    .isIn(["UNI", "THANA", "PAW"])
    .withMessage("uniThanaPawId must be UNI, THANA,PAW")
    .optional(),

  body("data.workingArea.*.detailsAddress", "বিস্তারিত ঠিকানা দিন")
    .exists()
    .withMessage("সমিতির কর্মএলাকার বিস্তারিতই ঠিকানা দিন")
    .isString()
    .withMessage("সমিতির কর্মএলাকার বিস্তারিতই ঠিকানা স্ট্রিং হতে হবে ")
    .isLength({ min: 0, max: 256 })
    .withMessage("সমিতির কর্মএলাকার বিস্তারিতই ঠিকানা ১ থেকে ২৫৬ অক্ষরের মধ্যে হতে হবে ")
    .optional(),

  //member area --------------------------------------------------------------------------------

  body("data.memberArea")
    .exists()
    .withMessage("memberArea is not present in payload")
    .isArray({ min: 1 })
    .withMessage("memberArea is not array"),

  body("data.memberArea.*.status", "Status can not be null").exists().notEmpty().trim().toLowerCase(),
  body("data.memberArea.*.divisionId", "বিভাগ নির্বাচন করুন ")
    .exists()
    .trim()
    .notEmpty()
    .custom(async (value) => {
      const isDivisionIdExist = await isExistsByColumn(
        "id",
        "master.division_info",
        await pgConnect.getConnection("slave"),
        { id: value }
      );

      return isDivisionIdExist ? true : Promise.reject();
    })
    .withMessage("সদস্য এলাকার নির্বাচিত বিভাগ বিদ্যমান নেই"),
  body("data.memberArea.*.districtId", "সদস্য এলাকার জেলা নির্বাচন করুন")
    .exists()
    .trim()
    .custom(async (value) => {
      const isDistrictIdExist = await isExistsByColumn(
        "id",
        "master.district_info",
        await pgConnect.getConnection("slave"),
        { id: value }
      );

      return isDistrictIdExist ? true : Promise.reject();
    })
    .withMessage("কর্ম এলাকার জেলা নির্বাচন করুন")
    .optional(),
  body("data.memberArea.*.upaCityId", " সদস্য এলাকার উপজেলা নির্বাচন করুন").exists().trim().optional(),

  body("data.memberArea.*.upaCityType", " সদস্য এলাকার উপজেলা নির্বাচন করুন").exists().trim().optional(),

  body("data.memberArea.*.uniThanaPawId", "সদস্য এলাকার ইউনিয়ন নির্বাচন করুন").exists().trim().optional(),

  body("data.memberArea.*.uniThanaPawType", "সদস্য এলাকার ইউনিয়ন নির্বাচন করুন").exists().trim().optional(),

  body("data.memberArea.*.detailsAddress", "সদস্য এলাকার বিস্তারিত ঠিকানা দিন")
    .exists()
    .withMessage("সমিতির  সদস্য নির্বাচনী এলাকার  বিস্তারিতই ঠিকানা দিন")
    .isString()
    .withMessage("সমিতির  সদস্য নির্বাচনী এলাকার  বিস্তারিতই ঠিকানা স্ট্রিং হতে হবে ")
    .isLength({ min: 0, max: 256 })
    .withMessage("সমিতির  সদস্য নির্বাচনী এলাকার  বিস্তারিতই ঠিকানা ১ থেকে ২৫৬ অক্ষরের মধ্যে হতে হবে ")
    .optional(),

  body("data.memberInfo", "অথরাইজড / অনুমোদিত ব্যক্তির তথ্য ফাকা হতে পারে না").optional().custom(async (value, { req }) => {
    if ((req.body.data.samityInfo.samityLevel == "P" || req.body.data.samityInfo.samityLevel == "C") && req.body.data.samityInfo.samityEffectiveness ==="A") {
      if (!value) {
        throw new BadRequestError("অথরাইজড / অনুমোদিত ব্যক্তির তথ্য ফাকা হতে পারে না");
      } else {
        const check = checkMemberInfoKey(value, req.body.data.samityInfo.samityLevel);

        if (!check.isPass) {
          throw new BadRequestError(check.message);
        } else {
          return true;
        }
      }
    } else if (req.body.data.samityInfo.samityLevel == "N") {
      return true;
    }
  }),
  body("data.memberInfo.memberNameBangla").optional().custom((value: any, { req }: Meta) => {
    if ((req.body.data.samityInfo.samityLevel == "P" || req.body.data.samityInfo.samityLevel == "C") && req.body.data.samityInfo.samityEffectiveness ==="A") {
      if (!value) {
        throw new BadRequestError("অথরাইজড / অনুমোদিত ব্যক্তির নাম লিখুন");
      } else if (value.length < 0 || value.length > 50) {
        throw new BadRequestError(" অথরাইজড / অনুমোদিত ব্যক্তির নাম  ১ থেকে ৫০ অক্ষরের মধ্যে হতে হবে");
      } else {
        return true;
      }
    } else if (req.body.data.samityInfo.samityLevel == "N") {
      return true;
    }
  }),
  body("data.memberInfo.nid").optional().custom((value: any, { req }: Meta) => {
    if ((req.body.data.samityInfo.samityLevel == "P" || req.body.data.samityInfo.samityLevel == "C") && req.body.data.samityInfo.samityEffectiveness ==="A") {
      if (!value) {
        throw new BadRequestError("অথরাইজড / অনুমোদিত ব্যক্তির এন আইডি নম্বর লিখুন");
      } else if (value.length < 0 || value.length > 20) {
        throw new BadRequestError(" অথরাইজড / অনুমোদিত ব্যক্তির এন আইডি নম্বর   ১ থেকে ২০ অক্ষরের মধ্যে হতে হবে ");
      } else if (value.toString().length != 10 && value.toString().length != 17) {
        throw new BadRequestError("অথরাইজড / অনুমোদিত ব্যক্তির এন আইডি নম্বর ১০ অথবা ১৭ সংখ্যার হতে হবে। ");
      } else {
        return true;
      }
    } else if (req.body.data.samityInfo.samityLevel == "N") {
      return true;
    }
  }),
  body("data.memberInfo.mobile").optional().custom((value, { req }) => {    
    if ((req.body.data.samityInfo.samityLevel == "P" || req.body.data.samityInfo.samityLevel == "C") && req.body.data.samityInfo.samityEffectiveness ==="A") {
      if (!value) {
        throw new BadRequestError("অথরাইজড / অনুমোদিত ব্যক্তির মোবাইল নম্বর দিন");
      } else if (value.length < 1 || value.length > 15) {
        throw new BadRequestError("অথরাইজড / অনুমোদিত ব্যক্তির মোবাইল নম্বর  ১ থেকে ১৫ অক্ষরের মধ্যে হতে হবে  ");
      } else {
        return true;
      }
    } else if (req.body.data.samityInfo.samityLevel == "N") {
      return true;
    }
  }),
];

export const documentValidationUpdate = [
  body("data.documentInfo")
    .exists()
    .withMessage("document Info is not present in payload")
    .notEmpty()
    .withMessage("document info can not be null")
    .isArray({ min: 1 })
    .withMessage("document Info should be an array")
    .custom((value) => {
      const isDocIdrepeted = value.some((element: any, index: number) => {
        return value.indexOf(element) !== index;
      });
      return isDocIdrepeted ? Promise.reject() : true;
    })
    .withMessage("একই ডকুমেন্ট একাধিক বার দেয়া হয়েছে ")
    .custom((value) => {}),
  body("data.documentInfo.*.documentId")
    .exists()
    .withMessage("ডকুমেন্ট এর ধরন নির্বাচন করুন ")
    .notEmpty()
    .withMessage("ডকুমেন্ট এর ধরন নির্বাচন করুন")
    .custom((v) => typeof v == "number")
    .withMessage("ডকুমেন্ট আইডি নম্বর হতে হবে ")
    .optional(),
  body("data.documentInfo.*.documentNo")
    .exists()
    .withMessage("ডকুমেন্ট এর নম্বর নির্বাচন করুন")
    .notEmpty()
    .withMessage("ডকুমেন্ট এর নম্বর নির্বাচন করুন")
    .optional(),
  body("data.documentInfo.*.documentName")
    .exists()
    .withMessage("ডকুমেন্ট এর নাম দিন")
    .notEmpty()
    .withMessage("ডকুমেন্ট এর নাম দিন")
    .isArray({ min: 1 })
    .withMessage("documentName is not an array"),
  body("data.documentInfo.*.documentName.*.name")
    .exists()
    .withMessage(" ডকুমেন্ট এর নাম দিন")
    .notEmpty()
    .withMessage(" ডকুমেন্ট এর নাম দিন")
    .optional(),
  body("data.documentInfo.*.documentName.*.mimeType")
    .exists()
    .withMessage(" ডকুমেন্ট এর ছবি নির্বাচন করুন ")
    .notEmpty()
    .withMessage(" ডকুমেন্ট এর ছবি নির্বাচন করুন")
    .optional(),
  body("data.documentInfo.*.documentName.*.base64Image")
    .exists()
    .withMessage(" ডকুমেন্ট এর ছবি নির্বাচন করুন")
    .notEmpty()
    .isBase64()
    .withMessage("ডকুমেন্ট এর base64 ফরমেট টি ঠিক নেই ")
    .withMessage(" ডকুমেন্ট এর ছবি নির্বাচন করুন")
    .optional(),
];

export const documentValidation = [
  // document info -----------------------------------------------------------------------------
  body("data.documentInfo")
    .exists()
    .withMessage("document Info is not present in payload")
    .notEmpty()
    .withMessage("document info can not be null")
    .isArray({ min: 1 })
    .withMessage("document Info should be an array")
    .custom((value) => {
      const documentIds = value.map((e: any) => e.documentId);
      const isDocIdrepeted = documentIds.some((element: any, index: number) => {
        return documentIds.indexOf(element) !== index;
      });
      return isDocIdrepeted ? Promise.reject() : true;
    })
    .withMessage("একই ডকুমেন্ট একাধিক বার দেয়া হয়েছে ")
    .bail(),
  body("data.documentInfo.*.documentId")
    .exists()
    .withMessage("ডকুমেন্ট এর ধরন নির্বাচন করুন ")
    .notEmpty()
    .withMessage("ডকুমেন্ট এর ধরন নির্বাচন করুন")
    .custom((v) => typeof v == "number")
    .withMessage("ডকুমেন্ট আইডি নম্বর হতে হবে "),
  body("data.documentInfo.*.documentNo")
    .exists()
    .withMessage("ডকুমেন্ট এর নম্বর নির্বাচন করুন")
    .isString()
    .withMessage("ডকুমেন্ট এর string হতে হবে ")
    .isLength({ min: 0, max: 200 })
    .withMessage("ডকুমেন্ট এর নম্বর ১ থেকে ২০০ অক্ষরের মধ্যে হতে হবে ")
    .optional(),
  body("data.documentInfo.*.documentName", "ডকুমেন্ট এর নাম দিন")
    .exists()
    .withMessage("ডকুমেন্ট এর নাম দিন")
    .notEmpty()
    .withMessage("ডকুমেন্ট এর নাম দিন")
    .isArray({ min: 1 }),
  body("data.documentInfo.*.documentName.*.name")
    .exists()
    .withMessage(" ডকুমেন্ট এর নাম দিন")
    .notEmpty()
    .withMessage(" ডকুমেন্ট এর নাম দিন"),

  body("data.documentInfo.*.documentName.*.mimeType")
    .exists()
    .withMessage(" ডকুমেন্ট এর ছবি নির্বাচন করুন ")
    .notEmpty()
    .withMessage(" ডকুমেন্ট এর ছবি নির্বাচন করুন"),
  body("data.documentInfo.*.documentName.*.base64Image")
    .exists()
    .withMessage(" ডকুমেন্ট এর ছবি নির্বাচন করুন")
    .notEmpty()
    .isBase64()
    .withMessage("ডকুমেন্ট এর base64 ফরমেট টি ঠিক নেই ")
    .withMessage(" ডকুমেন্ট এর ছবি নির্বাচন করুন"),
];

export const manualSamityMigrationRequest = [...manualSamityMigrationValidation, ...documentValidation];
export const samityMigrationUpdate = [
  ...manualSamityMigrationValidation,
  body("data.documentInfo")
    .exists()
    .withMessage("document Info is not present in payload")
    .notEmpty()
    .withMessage("document info can not be null")
    .isArray({ min: 1 })
    .withMessage("document Info should be an array")
    .custom((value) => {
      const documentIds = value.map((e: any) => e.documentId);
      const isDocIdrepeted = documentIds.some((element: any, index: number) => {
        return documentIds.indexOf(element) !== index;
      });
      return isDocIdrepeted ? Promise.reject() : true;
    })
    .withMessage("একই ডকুমেন্ট একাধিক বার দেয়া হয়েছে ")
    .bail(),
  body("data.documentInfo.*.documentId")
    .exists()
    .withMessage("ডকুমেন্ট এর ধরন নির্বাচন করুন ")
    .notEmpty()
    .withMessage("ডকুমেন্ট এর ধরন নির্বাচন করুন")
    .custom((v) => typeof v == "number")
    .withMessage("ডকুমেন্ট আইডি নম্বর হতে হবে "),
  body("data.documentInfo.*.documentNo")
    .exists()
    .withMessage("ডকুমেন্ট এর নম্বর নির্বাচন করুন")
    .isString()
    .withMessage("ডকুমেন্ট এর নম্বর string হতে হবে ")
    .isLength({ min: 0, max: 200 })
    .withMessage("ডকুমেন্ট এর নম্বর ১ থেকে ২০০ অক্ষরের মধ্যে হতে হবে ")
    .optional(),
  body("data.documentInfo.*.documentName", "ডকুমেন্ট এর নাম দিন")
    .exists()
    .withMessage("ডকুমেন্ট এর নাম দিন")
    .notEmpty()
    .withMessage("ডকুমেন্ট এর নাম দিন")
    .isArray({ min: 1 }),
  body("data.documentInfo.*.documentName.*.name")
    .exists()
    .withMessage(" ডকুমেন্ট এর নাম দিন")
    .notEmpty()
    .withMessage(" ডকুমেন্ট এর নাম দিন")
    .optional(),

  body("data.documentInfo.*.documentName.*.mimeType")
    .exists()
    .withMessage(" ডকুমেন্ট এর ছবি নির্বাচন করুন ")
    .notEmpty()
    .withMessage(" ডকুমেন্ট এর ছবি নির্বাচন করুন")
    .optional(),
  body("data.documentInfo.*.documentName.*.base64Image")
    .exists()
    .withMessage(" ডকুমেন্ট এর ছবি নির্বাচন করুন")
    .notEmpty()
    .isBase64()
    .withMessage("ডকুমেন্ট এর base64 ফরমেট টি ঠিক নেই ")
    .optional(),
];

function checkMemberInfoKey(data: any, samityLevel: string) {
  const expectedKeysForPrimarySamity = ["memberNameBangla", "nid", "mobile", "isAuthorizer"];
  const expectedKeysForCentralOrNationalSamity = ["memberNameBangla", "nid", "mobile", "isAuthorizer", "id"];
  const keys = Object.keys(data);
  if (samityLevel == "P") {
    for (const element of expectedKeysForPrimarySamity) {
      if (!keys.includes(element)) {
        return {
          isPass: false,
          message: `অথরাইজড / অনুমোদিত ব্যাক্তির ক্ষেত্রে ${element} এর ডাটা পাওয়া যায় নি`,
        };
        break;
      }
    }

    return {
      isPass: true,
      message: ``,
    };
  } else {
    for (const element of expectedKeysForCentralOrNationalSamity) {
      if (!keys.includes(element)) {
        return {
          isPass: false,
          message: `অথরাইজড / অনুমোদিত ব্যাক্তির ক্ষেত্রে ${element} এর ডাটা পাওয়া যায় নি`,
        };
        break;
      }
    }
    return {
      isPass: true,
      message: ``,
    };
  }
}
