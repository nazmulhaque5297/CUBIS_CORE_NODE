import { body, CustomSanitizer } from "express-validator";
import BadRequestError from "../../../errors/bad-request.error";
import SanctionService from "../../sanction/services/sanction.service";
import Container from "typedi";

export const validateSanctionApplication = [
  body("projectId")
    .notEmpty()
    .withMessage("প্রকল্পের নাম আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রকল্পের নাম সঠিকভাবে উল্লেখ করুন"),
  body("samityId")
    .notEmpty()
    .withMessage("সমিতির নাম দেওয়া আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সমিতির নাম সঠিকভাবে উল্লেখ করুন"),
  body("nextAppDesignationId")
    .custom((value, { req }) => {
      if (!req?.params?.appId && !value) {
        return false;
      } else return true;
    })
    .withMessage("অনুমোদনকারী/পর্যবেক্ষকের নাম দেওয়া আবশ্যিক"),
  body("data.productId")
    .notEmpty()
    .withMessage("প্রোডাক্টের নাম দেওয়া আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রোডাক্টের নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.customerId")
    .notEmpty()
    .withMessage("সদস্যের নাম দেওয়া আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.loanAmount")
    .notEmpty()
    .withMessage("ঋণের পরিমাণ আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("ঋণের পরিমাণ অবশ্যই নম্বর হতে হবে"),
  body("data.applyDate").notEmpty().withMessage("আবেদনের তারিখ আবশ্যিক"),
  body("data.loanTerm")
    .notEmpty()
    .withMessage("ঋণের মেয়াদ আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("ঋণের মেয়াদ অবশ্যই নম্বর হতে হবে"),
  body("data.serviceCharge")
    .notEmpty()
    .withMessage("সার্ভিস চার্জ আবশ্যিক")
    .bail()
    .isFloat({ min: 0.0 })
    .withMessage("সার্ভিস চার্জ অবশ্যই নম্বর হতে হবে"),
  body("data.frequency")
    .notEmpty()
    .withMessage("কিস্তি আদায় দেওয়া আবশ্যিক")
    .bail()
    .isIn(["M", "W"])
    .withMessage("কিস্তি আদায় সঠিকভাবে উল্লেখ করুন"),
  body("data.installmentNumber")
    .notEmpty()
    .withMessage("কিস্তি সংখ্যা আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("কিস্তি সংখ্যা অবশ্যই নম্বর হতে হবে"),
  body("data.loanPurpose")
    .notEmpty()
    .withMessage("ঋণের উদ্দেশ্য দেওয়া আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("ঋণের উদ্দেশ্য সঠিকভাবে উল্লেখ করুন"),
  body("data.installmentAmount")
    .notEmpty()
    .withMessage("কিস্তির পরিমাণ আবশ্যিক")
    .bail()
    .isFloat({ min: 0.0 })
    .withMessage("কিস্তির পরিমাণ অবশ্যই নম্বর হতে হবে"),
  body("data.grantorInfo")
    .notEmpty()
    .withMessage("জামিনদার/ সাক্ষীর তথ্য দেওয়া আবশ্যিক")
    .custom((values: any) => {
      return minimumLength(values);
    })
    .withMessage("ন্যূনতম একজন জামিনদার আবশ্যিক"),
  body("data.grantorInfo.*.grantorName")
    .notEmpty()
    .withMessage("জামিনদার/ সাক্ষীর নাম দেওয়া আবশ্যিক")
    .bail()
    .isString()
    .withMessage("জামিনদার/ সাক্ষীর নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.grantorInfo.*.fatherName")
    .notEmpty()
    .withMessage("জামিনদার/ সাক্ষীর পিতার নাম দেওয়া আবশ্যিক")
    .bail()
    .isString()
    .withMessage("জামিনদার/ সাক্ষীর পিতার নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.grantorInfo.*.motherName")
    .notEmpty()
    .withMessage("জামিনদার/ সাক্ষীর মাতার নাম দেওয়া আবশ্যিক")
    .bail()
    .isString()
    .withMessage("জামিনদার/ সাক্ষীর মাতার নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.grantorInfo.*.mobile")
    .notEmpty()
    .withMessage("জামিনদার/ সাক্ষীর মোবাইল নম্বর দেওয়া আবশ্যিক")
    .bail()
    .isMobilePhone("bn-BD")
    .withMessage("জামিনদার/ সাক্ষীর মোবাইল নম্বর সঠিকভাবে উল্লেখ করুন"),
  body("data.grantorInfo.*.nidNumber")
    .notEmpty()
    .withMessage("জামিনদার/ সাক্ষীর জাতীয় পরিচয়পত্রের নম্বর দেওয়া আবশ্যিক")
    .bail()
    .custom((values: any) => {
      return nidLengthCheck(values);
    })
    .withMessage("জামিনদারের জাতীয় পরিচয়পত্রের নম্বর অবশ্যই ১০ অথবা ১৭ সংখ্যার হতে হবে"),
  body("data.grantorInfo.*.birthDate").notEmpty().withMessage("জামিনদারের জন্ম তারিখ আবশ্যিক"),
  body("data.grantorInfo.*.occupation")
    .notEmpty()
    .withMessage("জামিনদারের পেশা আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("জামিনদারের পেশার সঠিকভাবে উল্লেখ করুন"),
  body("data.grantorInfo.*.perAddress")
    .notEmpty()
    .withMessage("জামিনদারের স্থায়ী ঠিকানা আবশ্যিক")
    .bail()
    .isString()
    .withMessage("জামিনদারের স্থায়ী ঠিকানা সঠিকভাবে উল্লেখ করুন"),
  body("data.grantorInfo.*.preAddress")
    .notEmpty()
    .withMessage("জামিনদারের বর্তমান ঠিকানা আবশ্যিক")
    .bail()
    .isString()
    .withMessage("জামিনদারের বর্তমান ঠিকানা সঠিকভাবে উল্লেখ করুন"),
  body("data.grantorInfo.*.relation")
    .optional()
    .custom((value) => {
      if (value && !Number(value)) return false;
      else return true;
    })
    .withMessage("জামিনদারের সম্পর্ক সঠিকভাবে উল্লেখ করুন"),
  body("data.grantorInfo.*.grantorOrWitness")
    .notEmpty()
    .withMessage("জামিনদার/সাক্ষী উল্লেখ করা আবশ্যিক")
    .bail()
    .isIn(["J", "S"])
    .withMessage("জামিনদার/সাক্ষী সঠিকভাবে উল্লেখ করুন"),
  body("data.grantorInfo.*.personType")
    .notEmpty()
    .withMessage("জামিনদার/সাক্ষী প্রকার উল্লেখ করা আবশ্যিক")
    .bail()
    .isIn(["M", "N"])
    .withMessage("জামিনদার/সাক্ষী সঠিকভাবে উল্লেখ করুন"),
  body("data.documentList.*.documentType").custom(async (value, { req }) => {
    const sanctionService: SanctionService = Container.get(SanctionService);
    const docList = (await sanctionService.getDocumentType(
      Number(req.user.doptorId),
      Number(req.body?.data?.projectId),
      Number(req.body?.data?.productId),
      Number(req.body?.data?.customerId)
    )) as any;
    if (docList && docList[0] && !value) throw new BadRequestError("ডকুমেন্টের ধরন আবশ্যিক");
    if (docList && docList[0] && value && String(value).length != 3)
      throw new BadRequestError("ডকুমেন্টের ধরন সঠিকভাবে উল্লেখ করুন");
    else return true;
  }),
  body("data.documentList.*.documentNumber").optional().isString().withMessage("ডকুমেন্টের নম্বর সঠিকভাবে উল্লেখ করুন"),
  body("data.documentList.*.documentFront")
    .optional()
    .isBase64()
    .withMessage("ডকুমেন্টের সামনের ছবি সঠিকভাবে উল্লেখ করুন"),
  body("data.documentList.*.documentFrontType")
    .optional()
    .isString()
    .withMessage("ডকুমেন্টের সামনের ছবি সঠিকভাবে উল্লেখ করুন"),
  body("data.documentList.*.documentBack")
    .optional()
    .isBase64()
    .withMessage("ডকুমেন্টের পিছনের ছবি সঠিকভাবে উল্লেখ করুন"),
  body("data.documentList.*.documentBackType")
    .optional()
    .isString()
    .withMessage("ডকুমেন্টের পিছনের ছবির ফরমেট সঠিকভাবে উল্লেখ করুন"),
];
const toInt: CustomSanitizer = (value) => {
  if (value[0]) {
    return value.map((v: any) => {
      return parseInt(v);
    });
  }
};

function nidLengthCheck(nid: string) {
  if (nid.length === 10 || 17) return true;
  else return false;
}

function minimumLength(value: string) {
  if (value.length <= 0) return false;
  else return true;
}

function percentageCheck(value: any) {
  const activeValue = value.filter((value: any) => value.activeToggle == true);
  const singlePercentageValue = activeValue.map((v: any) => Number(v.percentage));
  const totalPercentage = singlePercentageValue.reduce((a: number, b: number) => a + b, 0);
  if (totalPercentage === 100) return true;
  else return false;
}

function percentageChecks(value: any) {
  const activeValue = value.filter((value: any) => value.isActive == true);
  const singlePercentageValue = activeValue.map((v: any) => Number(v.segregationRate));
  const totalPercentage = singlePercentageValue.reduce((a: number, b: number) => a + b, 0);
  if (totalPercentage === 100) return true;
  else return false;
}
function onlyOneActiveValue(value: any) {
  const activeValue = value.filter((value: any) => value.activeToggle == true);
  if (activeValue && activeValue.length === 1) return true;
  else return false;
}
function onlyOneActiveValues(value: any) {
  const activeValue = value.filter((value: any) => value.isActive == true);
  if (activeValue && activeValue.length === 1) return true;
  else return false;
}

export const validateprojectAssignApplication = [
  body("projectId").optional({ nullable: true }),
  body("samityId").optional({ nullable: true }),
  body("data.userId")
    .notEmpty()
    .withMessage("আবেদনকারীর নাম দেওয়া আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("আবেদনকারীর নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.projects.*.id")
    .notEmpty()
    .withMessage("প্রকল্পের নাম দেওয়া আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("ন্যূনতম একটি প্রকল্প বরাদ্দ করা আবশ্যিক"),
  body("data.projects.*.assignStatus")
    .notEmpty()
    .withMessage("পূর্বে প্রকল্পটি বরাদ্দকৃত কিনা দেওয়া আবশ্যিক")
    .bail()
    .isBoolean()
    .withMessage("প্রকল্পটি বরাদ্দকৃত কিনা সঠিকভাবে উল্লেখ করুন"),
  body("data.projects.*.isChecked")
    .notEmpty()
    .withMessage("প্রকল্পটি নতুন বরাদ্দকৃত কিনা দেওয়া আবশ্যিক")
    .bail()
    .isBoolean()
    .withMessage("প্রকল্পটি নতুন বরাদ্দকৃত কিনা সঠিকভাবে উল্লেখ করুন"),
  body("nextAppDesignationId")
    .notEmpty()
    .withMessage("পর্যবেক্ষক বা অনুমোদনকারী নির্বাচন করুন")
    .bail()
    .isInt({ min: 1 })
    .withMessage("পরবর্তী অনুমোদনের প্রতিনিধি সঠিকভাবে উল্লেখ করুন"),
];

export const validateLoanScheduleApplication = [
  body("projectStatus")
    .notEmpty()
    .withMessage("প্রকল্প বিদ্যমান কিনা দেওয়া আবশ্যিক")
    .bail()
    .isBoolean()
    .withMessage("প্রকল্প বিদ্যমান কিনা সঠিকভাবে উল্লেখ করুন"),
  body("projectId").custom((value, { req }) => {
    if (req.body.projectStatus == "true" && !value && value == "নির্বাচন করুন")
      throw new BadRequestError(`প্রকল্প দেওয়া আবশ্যক`);
    else return true;
  }),
  body("samityId")
    .notEmpty()
    .withMessage("সমিতির নাম দেওয়া আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সমিতির নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.customerId")
    .notEmpty()
    .withMessage("সদস্যের নাম দেওয়া আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের নাম সঠিকভাবে উল্লেখ করুন"),
  body("nextAppDesignationId")
    .notEmpty()
    .withMessage("পরবর্তী অনুমোদনের প্রতিনিধি আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("পরবর্তী অনুমোদনের সঠিকভাবে উল্লেখ করুন"),
];

export const validateSubGlApplication = [
  body("projectId").optional({ nullable: true }),
  body("samityId").optional({ nullable: true }),
  body("data.subGl.*.id").optional({ nullable: true }).isInt().withMessage("সাব জিএল এর ধরণ সঠিকভাবে উল্লেখ করুন"),
  body("data.subGl.*.type")
    .notEmpty()
    .withMessage("সাব জিএল এর ধরণ আবশ্যিক")
    .bail()
    .isInt()
    .withMessage("সাব জিএল এর ধরণ সঠিকভাবে উল্লেখ করুন"),
  body("data.subGl.*.name")
    .notEmpty()
    .withMessage("সাব জিএল এর নাম আবশ্যিক")
    .bail()
    .isString()
    .withMessage("সাব জিএল এর নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.subGl.*.refNo")
    .notEmpty()
    .withMessage("সাব জিএল এর রেফারেন্স নম্বর আবশ্যিক")
    .bail()
    .isString()
    .withMessage("সাব জিএল এর রেফারেন্স নম্বর সঠিকভাবে উল্লেখ করুন"),
  body("data.subGl.*.isActive")
    .notEmpty()
    .withMessage("সাব জিএল এর অবস্থা (সচল/অচল) আবশ্যিক")
    .bail()
    .isBoolean()
    .withMessage("সাব জিএল এর অবস্থা (সচল/অচল) সঠিকভাবে উল্লেখ করুন"),
  body("nextAppDesignationId")
    .notEmpty()
    .withMessage("পরবর্তী অনুমোদনের প্রতিনিধি আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("পরবর্তী অনুমোদনের প্রতিনিধি সঠিকভাবে উল্লেখ করুন"),
];

export const validateProductApplication = [
  body("projectId")
    .notEmpty()
    .withMessage("প্রকল্পের নাম আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রকল্প সঠিকভাবে উল্লেখ করুন"),
  body("samityId").optional({ nullable: true }),
  body("data.productMaster.projectName")
    .notEmpty()
    .withMessage("প্রোডাক্টের প্রকল্পের নাম আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রোডাক্টের প্রকল্প সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.productName")
    .notEmpty()
    .withMessage("প্রোডাক্টের নাম দেওয়া আবশ্যক")
    .bail()
    .isString()
    .withMessage("প্রোডাক্টের নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.productCode")
    .notEmpty()
    .withMessage("প্রোডাক্টের কোড দেওয়া আবশ্যক")
    .bail()
    .isString()
    .withMessage("প্রোডাক্টের কোড সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.productStartDate").notEmpty().withMessage("প্রোডাক্টের কার্যকলাপ শুরুর তারিখ দেওয়া আবশ্যক"),
  body("data.productMaster.lowestLoanAmount")
    .notEmpty()
    .withMessage("সর্বনিম্ন ঋণের পরিমান দেওয়া আবশ্যক")
    .bail()
    .isNumeric()
    .withMessage("সর্বনিম্ন ঋণের পরিমান অবশ্যই সাংখ্যিক হতে হবে"),
  body("data.productMaster.highestLoanAmount")
    .notEmpty()
    .withMessage("সর্বোচ্চ ঋণের পরিমান দেওয়া আবশ্যক")
    .bail()
    .isNumeric()
    .withMessage("সর্বোচ্চ ঋণের পরিমান অবশ্যই সাংখ্যিক হতে হবে"),
  body("data.productMaster.repaymentRequency")
    .notEmpty()
    .withMessage("কিস্তি আদায়ের ফ্রিকোয়েন্সি দেওয়া আবশ্যক")
    .bail()
    .isIn(["W", "M"])
    .withMessage("কিস্তি আদায়ের ফ্রিকোয়েন্সি অবশ্যই সাপ্তাহিক বা মাসিক হতে হবে"),
  body("data.productMaster.calculationMethod")
    .notEmpty()
    .withMessage("সার্ভিস চার্জ ক্যালকুলেশনের পদ্ধতি দেওয়া আবশ্যক")
    .bail()
    .isIn(["F", "D", "DOC", "DOC-MILK"])
    .withMessage("সার্ভিস চার্জ ক্যালকুলেশনের পদ্ধতি অবশ্যই ফ্লাট রেট বা ডিক্লাইন রেট পদ্ধতি হতে হবে"),
  body("data.productMaster.productGl")
    .notEmpty()
    .withMessage("প্রোডাক্টের জিএল দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রোডাক্টের জিএল সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.gracePeriodAllowed")
    .notEmpty()
    .withMessage("প্রোডাক্টের গ্রেস পিরিয়ডের অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isBoolean()
    .withMessage("প্রোডাক্টের গ্রেস পিরিয়ডের অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.gracePeriod").custom((value, { req }) => {
    if (req.body.data.productMaster.gracePeriodAllowed && !value)
      throw new BadRequestError(`প্রোডাক্টের গ্রেস পিরিয়ড উল্লেখ করুন`);
    else {
      if (value && !Number.isInteger(value)) throw new BadRequestError(`প্রোডাক্টের গ্রেস পিরিয়ড সঠিকভাবে উল্লেখ করুন`);
      else return true;
    }
  }),
  body("data.productMaster.gPServChargeAllowed")
    .notEmpty()
    .withMessage("প্রোডাক্টের গ্রেস পিরিয়ডে সার্ভিস চার্জের অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isBoolean()
    .withMessage("প্রোডাক্টের গ্রেস পিরিয়ডে সার্ভিস চার্জের অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.gPServChargeDir")
    .custom((value, { req }) => {
      if (req.body.data.productMaster.gPServChargeAllowed && !value)
        throw new BadRequestError(`প্রোডাক্টের গ্রেস পিরিয়ডে সার্ভিস চার্জের পদ্ধতি উল্লেখ করুন`);
      else return true;
    })
    .isIn(["EQUAL", "NO-CHARGE", "NO", null])
    .withMessage("প্রোডাক্টের গ্রেস পিরিয়ডে সার্ভিস চার্জের পদ্ধতি সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.capitalGl")
    .notEmpty()
    .withMessage("মূলধন/ আসল এর জিএল দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("মূলধন/ আসল এর জিএল সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.serviceChargeGl")
    .notEmpty()
    .withMessage("সার্ভিস চার্জের জিএল দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সার্ভিস চার্জের জিএল সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.insuranceAllowed")
    .notEmpty()
    .withMessage("প্রোডাক্টের ইন্সুরেন্সের চার্জের অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isBoolean()
    .withMessage("প্রোডাক্টের ইন্সুরেন্সের অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.insuranceGl").custom((value, { req }) => {
    if (req.body.data.productMaster.insuranceAllowed && !value)
      throw new BadRequestError(`ইন্সুরেন্সের জিএল উল্লেখ করুন`);
    else {
      if (value && !Number.isInteger(value)) throw new BadRequestError(`ইন্সুরেন্সের জিএল সঠিকভাবে উল্লেখ করুন`);
      else return true;
    }
  }),
  body("data.productMaster.insuPerRate").custom((value, { req }) => {
    if (req.body.data.productMaster.insuranceAllowed && !value)
      throw new BadRequestError(`ইন্সুরেন্সের শতকরা হার উল্লেখ করুন`);
    else {
      if (value && !Number(value)) throw new BadRequestError(`ইন্সুরেন্সের শতকরা হার সঠিকভাবে উল্লেখ করুন`);
      else {
        if (value && Number(value) && (Number(value) < 0 || Number(value) > 100))
          throw new BadRequestError(`ইন্সুরেন্সের শতকরা হারের সর্বোচ্চ পরিমাণ ১০০%`);
        else return true;
      }
    }
  }),
  body("data.productMaster.sequentialOrderCapital")
    .notEmpty()
    .withMessage("আদায়ের ক্রমানুসার মূলধন দেওয়া আবশ্যক")
    .isIn([1, 2, 3])
    .withMessage("আদায়ের ক্রমানুসার মূলধন সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.sequentialOrderSerCharge")
    .notEmpty()
    .withMessage("আদায়ের ক্রমানুসার সার্ভিস চার্জ দেওয়া আবশ্যক")
    .isIn([1, 2, 3])
    .withMessage("আদায়ের ক্রমানুসার সার্ভিস চার্জ সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.sequentialOrderDelayCharge")
    .notEmpty()
    .withMessage("আদায়ের ক্রমানুসার বিলম্বিত চার্জ দেওয়া আবশ্যক")
    .isIn([1, 2, 3])
    .withMessage("আদায়ের ক্রমানুসার বিলম্বিত চার্জ সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.numberOfInstallment")
    .notEmpty()
    .withMessage("কিস্তি আদায়ের সংখ্যা দেওয়া আবশ্যক")
    .bail()
    .isArray({ min: 1 })
    .withMessage("কিস্তি আদায়ের সংখ্যা অবশ্যই সাংখ্যিক হতে হবে")
    .customSanitizer(toInt),
  body("data.productMaster")
    .custom((value: any) => {
      if (value.loanTerm.length != value.numberOfInstallment.length) return false;
      else return true;
    })
    .withMessage("প্রতিটি ঋণের মেয়াদের জন্য কিস্তি আদায়ের সংখ্যা দেওয়া আবশ্যক"),
  body("data.productMaster.holidayEffect")
    .notEmpty()
    .withMessage("হলিডে ইফেক্ট দেওয়া আবশ্যক")
    .bail()
    .isIn(["NO", "NWD", "NMD"])
    .withMessage("হলিডে ইফেক্ট সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.chequeDisbursementFlag")
    .notEmpty()
    .withMessage("চেকের মাধ্যমে ঋণ বিতরণের অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isBoolean()
    .withMessage("চেকের মাধ্যমে ঋণ বিতরণের অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.chequeDisbursementGl")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("চেকের মাধ্যমে ঋণ বিতরণের জিএল সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.loanTerm")
    .notEmpty()
    .withMessage("ঋণের মেয়াদকাল দেওয়া আবশ্যক")
    .bail()
    .isArray({ min: 1 })
    .withMessage("ঋণের মেয়াদকাল অবশ্যই সাংখ্যিক হতে হবে")
    .customSanitizer(toInt),
  body("data.productMaster.isAdvPayBenefit")
    .notEmpty()
    .withMessage("অগ্রিম অর্থ প্রদানের সুবিধার অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isBoolean()
    .withMessage("অগ্রিম অর্থ প্রদানের সুবিধার অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster")
    .custom((value, { req }) => {
      const sequentialOrderCapital = req.body?.data?.productMaster?.sequentialOrderCapital
        ? Number(req.body.data.productMaster.sequentialOrderCapital)
        : undefined;
      const sequentialOrderSerCharge = req.body?.data?.productMaster?.sequentialOrderSerCharge
        ? Number(req.body.data.productMaster.sequentialOrderSerCharge)
        : undefined;
      const sequentialOrderDelayCharge = req.body?.data?.productMaster?.sequentialOrderDelayCharge
        ? Number(req.body.data.productMaster.sequentialOrderDelayCharge)
        : undefined;

      let allTransactionSerial = [sequentialOrderCapital, sequentialOrderSerCharge, sequentialOrderDelayCharge];
      const findDuplicates = allTransactionSerial.filter(
        (item: any, index: number) => allTransactionSerial.indexOf(item) !== index
      );

      if (!allTransactionSerial.includes(undefined) && findDuplicates.length > 0) return false;
      else return true;
    })
    .withMessage("আদায়ের ক্রমানুসার পুনরাবৃত্তি করা যাবে না"),
];

export const validateProductServiceCharge = [
  body("data.productServiceCharge")
    .custom((values: any) => {
      return onlyOneActiveValue(values);
    })
    .withMessage("প্রোডাক্টের শুধুমাত্র একটি সার্ভিস চার্জের পরিমান সক্রিয় থাকবে"),
  body("data.productServiceCharge.*.serviceChargeRate")
    .notEmpty()
    .withMessage("প্রোডাক্টের সার্ভিস চার্জের শতকরা হার দেওয়া আবশ্যক")
    .bail()
    .isFloat({ min: 0.0, max: 100.0 })
    .withMessage("প্রোডাক্টের সার্ভিস চার্জের শতকরা হারের সর্বোচ্চ পরিমাণ ১০০%"),
  body("data.productServiceCharge.*.startDate")
    .notEmpty()
    .withMessage("প্রোডাক্টের সার্ভিস চার্জ সচল হওয়ার তারিখ দেওয়া আবশ্যক"),
  body("data.productServiceCharge.*.lateServiceChargeRate")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0.0, max: 100.0 })
    .withMessage("প্রোডাক্টের বিলম্বিত সার্ভিস চার্জের শতকরা হারের সর্বোচ্চ পরিমাণ ১০০%"),
  body("data.productServiceCharge.*.expireServiceChargeRate")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0.0, max: 100.0 })
    .withMessage("প্রোডাক্টের মেয়াদউত্তীর্ণ সার্ভিস চার্জের শতকরা হারের সর্বোচ্চ পরিমাণ ১০০%"),
  body("data.productServiceCharge.*.activeToggle")
    .notEmpty()
    .withMessage("প্রোডাক্টের সার্ভিস চার্জের অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isBoolean()
    .withMessage("প্রোডাক্টের সার্ভিস চার্জের অবস্থা সঠিকভাবে উল্লেখ করুন"),
];

export const validateProductServiceChargeSegregation = [
  body("data.serviceChargeBivajon.*.sectorName")
    .custom((value: any, { req }) => {
      if (req.body.data.serviceChargeBivajon && !value) return false;
      else return true;
    })
    .withMessage("সার্ভিস চার্জের বিভাজনের খাতের নাম দেওয়া আবশ্যক")
    .isInt({ min: 1 })
    .withMessage("সার্ভিস চার্জের বিভাজনের খাতের নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.serviceChargeBivajon.*.percentage")
    .custom((value: any, { req }) => {
      if (req.body.data.serviceChargeBivajon && !value) return false;
      else return true;
    })
    .withMessage("সার্ভিস চার্জ বিভাজনের শতকরা হার দেওয়া আবশ্যক")
    .isFloat({ min: 0.0, max: 100.0 })
    .withMessage("সার্ভিস চার্জ বিভাজনের শতকরা হারের সর্বোচ্চ পরিমাণ ১০০%"),
  body("data.serviceChargeBivajon")
    .optional()
    .custom((values: any) => {
      return percentageCheck(values);
    })
    .withMessage("সক্রিয় সার্ভিস চার্জ বিভাজনসমূহের মোট শতকরা পরিমান ১০০% হওয়া আবশ্যক"),
  body("data.serviceChargeBivajon.*.generalLedgerName")
    .custom((value: any, { req }) => {
      if (req.body.data.serviceChargeBivajon && !value) return false;
      else return true;
    })
    .withMessage("সার্ভিস চার্জের বিভাজনের লেজারের নাম দেওয়া আবশ্যক")
    .isInt({ min: 1 })
    .withMessage("সার্ভিস চার্জের বিভাজনের লেজারের নাম সঠিকভাবে উল্লেখ করুন "),
  body("data.serviceChargeBivajon.*.activeToggle")
    .custom((value: any, { req }) => {
      if (req.body.data.serviceChargeBivajon && !value) return false;
      else return true;
    })
    .withMessage("সার্ভিস চার্জের বিভাজনের অবস্থা দেওয়া আবশ্যক")
    .isBoolean()
    .withMessage("সার্ভিস চার্জের বিভাজনের অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("data.serviceChargeBivajon")
    .custom((value) => {
      let allSectors = value.map((serviceChargeSegData: any) => serviceChargeSegData.sectorName);
      const findDuplicates = allSectors.filter((item: any, index: number) => allSectors.indexOf(item) !== index);
      if (findDuplicates.length > 0) return false;
      else return true;
    })
    .withMessage("একই খাতের নাম পুনরাবৃত্তি করা যাবে না"),
];

export const validateProductCharge = [
  body("data.productCharge")
    .custom((value) => {
      let allChargeTypes = value.map((chargeValue: any) => chargeValue.chargeName);
      const findDuplicates = allChargeTypes.filter(
        (item: any, index: number) => allChargeTypes.indexOf(item) !== index
      );
      if (findDuplicates.length > 0) return false;
      else return true;
    })
    .withMessage("ইতিমধ্যে চার্জের নামটি বিদ্যমান আছে"),
  body("data.productCharge.*.startDate").optional(),
  body("data.productCharge.*.chargeName")
    .custom((value: any, { req }) => {
      if (req.body.data.productCharge && !value) return false;
      else return true;
    })
    .withMessage("প্রোডাক্টের চার্জের নাম দেওয়া আবশ্যক")
    .isInt()
    .withMessage("প্রোডাক্টের চার্জের নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.productCharge.*.chargeAmount")
    .custom((value: any, { req }) => {
      if (req.body.data.productCharge && !value) return false;
      else return true;
    })
    .withMessage("প্রোডাক্টের চার্জের পরিমাণ দেওয়া আবশ্যক")
    .isInt()
    .withMessage("প্রোডাক্টের চার্জের পরিমাণ সঠিকভাবে উল্লেখ করুন"),
  body("data.productCharge.*.chargeCreditgl")
    .custom((value: any, { req }) => {
      if (req.body.data.productCharge && !value) return false;
      else return true;
    })
    .withMessage("প্রোডাক্টের চার্জের ক্রেডিট জিএল এর নাম দেওয়া আবশ্যক")
    .isInt({ min: 1 })
    .withMessage("প্রোডাক্টের চার্জের ক্রেডিট জিএল এর নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.productCharge.*.chargeActive")
    // .custom((value: any, { req }) => {
    //   if (req.body.data.productCharge && !("chargeActive" in value)) return false;
    //   else return true;
    // })

    .exists()
    .withMessage("প্রোডাক্টের চার্জের অবস্থা দেওয়া আবশ্যক")
    .isBoolean()
    .withMessage("প্রোডাক্টের চার্জের অবস্থা সঠিকভাবে উল্লেখ করুন"),
];

export const validateProductSanctionPolicy = [
  body("data.slabWiseLoanAmount")
    .custom((value) => {
      let allLoanNo = value.map((slabWiseLoanData: any) => slabWiseLoanData.loanNumber);
      const findDuplicates = allLoanNo.filter((item: any, index: number) => allLoanNo.indexOf(item) !== index);
      if (findDuplicates.length > 0) return false;
      else return true;
    })
    .withMessage("একই ঋণ নম্বর পুনরাবৃত্তি করা যাবে না"),
  body("data.slabWiseLoanAmount.*.loanNumber")
    .notEmpty()
    .withMessage("ঋণ নম্বর দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("ঋণ নম্বর অবশ্যই সাংখ্যিক হতে হবে"),
  body("data.slabWiseLoanAmount.*.lowestAmount")
    .notEmpty()
    .withMessage("ঋণের সর্বনিম্ন টাকার পরিমাণ দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("ঋণের সর্বনিম্ন টাকার পরিমাণ অবশ্যই সাংখ্যিক হতে হবে"),
  body("data.slabWiseLoanAmount.*.highestAmount")
    .notEmpty()
    .withMessage("ঋণের সর্বোচ্চ টাকার পরিমাণ দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("ঋণের সর্বোচ্চ টাকার পরিমাণ অবশ্যই সাংখ্যিক হতে হবে"),
  body("data.slabWiseLoanAmount.*.pastLoanDifference")
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage("পূর্বের ঋণের ব্যবধান (দিন) অবশ্যই সাংখ্যিক হতে হবে"),
  body("data.slabWiseLoanAmount.*.perOfSavings")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0.0, max: 100.0 })
    .withMessage("সঞ্চয়ের শতকরা হারের সর্বোচ্চ পরিমাণ ১০০%"),
  body("data.slabWiseLoanAmount.*.perOfShares")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0.0, max: 100.0 })
    .withMessage("শেয়ারের শতকরা হারের সর্বোচ্চ পরিমাণ ১০০%"),
];

export const validateProductDocuments = [
  body("data.necessaryDocument").isArray({ min: 1 }).withMessage("ন্যূনতম একটি ডকুমেন্টের ধরণ দেওয়া আবশ্যক"),
  body("data.necessaryDocument.*.docName")
    .notEmpty()
    .withMessage("প্রোডাক্টের প্রয়োজনীয় ডকুমেন্টের ধরণ দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রোডাক্টের প্রয়োজনীয় ডকুমেন্টের ধরণ সঠিকভাবে উল্লেখ করুন"),
  body("data.necessaryDocument.*.mendatory")
    .notEmpty()
    .withMessage("প্রোডাক্টের প্রয়োজনীয় ডকুমেন্টের বাধ্যবাধকতার অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isBoolean()
    .withMessage("প্রোডাক্টের প্রয়োজনীয় ডকুমেন্টের বাধ্যবাধকতার অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("data.necessaryDocument")
    .custom((value) => {
      let allDocuments = value.map((documentData: any) => documentData.docName);
      const findDuplicates = allDocuments.filter((item: any, index: number) => allDocuments.indexOf(item) !== index);
      if (findDuplicates.length > 0) return false;
      else return true;
    })
    .withMessage("একই ডকুমেন্টের ধরণ পুনরাবৃত্তি করা যাবে না"),
  body("nextAppDesId")
    .notEmpty()
    .withMessage("অনুমোদনকারী/পর্যবেক্ষকের নাম দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("অনুমোদনকারী/পর্যবেক্ষকের নাম সঠিকভাবে উল্লেখ করুন"),
];

export const validateUpdateMainProduct = [
  body("projectId")
    .notEmpty()
    .withMessage("প্রকল্পের নাম আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রকল্প সঠিকভাবে উল্লেখ করুন"),
  body("samityId").optional({ nullable: true }),
  body("data.productMaster.projectName")
    .optional()
    .isInt({ min: 1 })
    .withMessage("প্রোডাক্টের প্রকল্প সঠিকভাবে উল্লেখ করুন"),
  body("data.productId")
    .notEmpty()
    .withMessage("প্রোডাক্টের নাম দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রোডাক্টের নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.productName").optional().isString().withMessage("প্রোডাক্টের নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.productCode").optional().isString().withMessage("প্রোডাক্টের কোড সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.openDate").optional(),
  body("data.productMaster.minLoanAmt")
    .optional()
    .isNumeric()
    .withMessage("সর্বনিম্ন ঋণের পরিমান সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.maxLoanAmt").optional().isNumeric().withMessage("সর্বোচ্চ ঋণের পরিমান সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.repFrq")
    .optional()
    .isIn(["W", "M"])
    .withMessage("কিস্তি আদায়ের ফ্রিকোয়েন্সি অবশ্যই সাপ্তাহিক বা মাসিক হতে হবে"),
  body("data.productMaster.calType")
    .optional()
    .isIn(["F", "D", "DOC", "DOC-MILK"])
    .withMessage("ঋণের হিসাব পদ্ধতি অবশ্যই ফ্লাট রেট বা ডিক্লাইন রেট পদ্ধতি হতে হবে"),
  body("data.productMaster.productGl")
    .optional()
    .isInt({ min: 1 })
    .withMessage("প্রোডাক্টের জিএল সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.allowGracePeriod")
    .optional()
    .isBoolean()
    .withMessage("প্রোডাক্টের গ্রেস পিরিয়ডের অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.gracePeriod")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("প্রোডাক্টের গ্রেস পিরিয়ড সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.serCrgAtGracePeriod")
    .optional()
    .isBoolean()
    .withMessage("প্রোডাক্টের গ্রেস পিরিয়ডে সার্ভিস চার্জের অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.graceAmtRepayIns")
    .optional({ nullable: true })
    .isIn(["EQUAL"])
    .withMessage("প্রোডাক্টের গ্রেস পিরিয়ডে সার্ভিস চার্জের পদ্ধতি সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.principalGl").optional().isInt({ min: 1 }).withMessage("মূলধনের জিএল সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.serviceChargeGl")
    .optional()
    .isInt({ min: 1 })
    .withMessage("সার্ভিস চার্জের জিএল সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.allowInsurance")
    .optional()
    .isBoolean()
    .withMessage("প্রোডাক্টের ইন্সুরেন্সের অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.insuranceGl")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("ইন্সুরেন্সের জিএল সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.insurancePercent")
    .optional({ nullable: true })
    .isFloat({ min: 1, max: 100 })
    .withMessage("ইন্সুরেন্সের শতকরা হারের সর্বোচ্চ পরিমাণ ১০০%"),
  body("data.productMaster.realizationSeqPrincipal")
    .optional()
    .isIn([1, 2, 3])
    .withMessage("আদায়ের ক্রমানুসার মূলধন সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.realizationSeqService")
    .optional()
    .isIn([1, 2, 3])
    .withMessage("আদায়ের ক্রমানুসার সার্ভিস চার্জ সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.realizationSeqOd")
    .optional()
    .isIn([1, 2, 3])
    .withMessage("আদায়ের ক্রমানুসার বিলম্বিত চার্জ সঠিকভাবে উল্লেখ করুন"),
  body("data.productServiceCharge")
    .optional()
    .custom((values: any) => {
      return onlyOneActiveValues(values);
    })
    .withMessage("প্রোডাক্টের শুধুমাত্র একটি সার্ভিস চার্জের পরিমান সক্রিয় থাকবে"),
  body("data.productServiceCharge.*.intRate")
    .optional()
    .isFloat({ min: 0.0, max: 100.0 })
    .withMessage("প্রোডাক্টের সার্ভিস চার্জের শতকরা হারের সর্বোচ্চ পরিমাণ ১০০%"),
  body("data.productServiceCharge.*.effectDate").optional(),
  body("data.productServiceCharge.*.currentdueIntRate")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0.0, max: 100.0 })
    .withMessage("প্রোডাক্টের বিলম্বিত সার্ভিস চার্জের শতকরা হারের সর্বোচ্চ পরিমাণ ১০০%"),
  body("data.productServiceCharge.*.overdueIntRate")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0.0, max: 100.0 })
    .withMessage("প্রোডাক্টের মেয়াদউত্তীর্ণ সার্ভিস চার্জের শতকরা হারের সর্বোচ্চ পরিমাণ ১০০%"),
  body("data.productServiceCharge.*.isActive")
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage("প্রোডাক্টের সার্ভিস চার্জের অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("data.serviceChargeBivajon.*.segregationId")
    .optional({ checkFalsy: true })
    .isInt()
    .withMessage("প্রোডাক্টের সার্ভিস চার্জের বিভাজনের খাতের নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.productServiceCharge.*.segregationRate")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0.0, max: 100.0 })
    .withMessage("প্রোডাক্টের সার্ভিস চার্জ বিভাজনের শতকরা হারের সর্বোচ্চ পরিমাণ ১০০%"),
  // body("data.serviceChargeBivajon")
  //   .optional()
  //   .custom((values: any) => {
  //     return percentageChecks(values);
  //   })
  //   .withMessage(
  //     "সক্রিয় সার্ভিস চার্জ বিভাজনসমূহের মোট শতকরা পরিমান ১০০% হওয়া আবশ্যক"
  //   ),
  body("data.serviceChargeBivajon.*.glId")
    .optional({ checkFalsy: true })
    .isInt()
    .withMessage("সার্ভিস চার্জের বিভাজনের লেজারের নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.productServiceCharge.*.isActive")
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage("সার্ভিস চার্জের বিভাজনের অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("data.productCharge.*.effectDate").optional(),
  body("data.productCharge.*.chargeTypeId")
    .optional({ checkFalsy: true })
    .isInt()
    .withMessage("প্রোডাক্টের চার্জের নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.productCharge.*.chargeValue")
    .optional({ checkFalsy: true })
    .isFloat()
    .withMessage("প্রোডাক্টের চার্জের পরিমাণ অবশ্যই সাংখ্যিক হতে হবে"),
  body("data.productCharge.*.chargeGl")
    .optional({ checkFalsy: true })
    .isInt()
    .withMessage("প্রোডাক্টের চার্জের ক্রেডিট জিএল এর নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.productServiceCharge.*.isActive")
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage("প্রোডাক্টের চার্জের অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("data.slabWiseLoanAmount.*.loanNo")
    .optional({ checkFalsy: true })
    .isInt()
    .withMessage("ঋণের সংখ্যা অবশ্যই সাংখ্যিক হতে হবে"),
  body("data.slabWiseLoanAmount.*.minAmount")
    .optional({ checkFalsy: true })
    .isInt()
    .withMessage("ঋণের সর্বনিম্ন টাকার পরিমাণ অবশ্যই সাংখ্যিক হতে হবে"),
  body("data.slabWiseLoanAmount.*.maxAmount")
    .optional({ checkFalsy: true })
    .isInt()
    .withMessage("ঋণের সর্বোচ্চ টাকার পরিমাণ অবশ্যই সাংখ্যিক হতে হবে"),
  body("data.slabWiseLoanAmount.*.preDisbInterval")
    .optional({ checkFalsy: true })
    .isInt()
    .withMessage("পূর্বের ঋণের ব্যবধান (দিন) অবশ্যই সাংখ্যিক হতে হবে"),
  body("data.slabWiseLoanAmount.*.depositPercent")
    .optional({ checkFalsy: true })
    .isFloat()
    .withMessage("সঞ্চয়ের শতকরা হারের সর্বোচ্চ পরিমাণ ১০০%"),
  body("data.slabWiseLoanAmount.*.sharePercent")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 100 })
    .withMessage("শেয়ারের শতকরা হারের সর্বোচ্চ পরিমাণ ১০০%"),
  body("data.necessaryDocument.*.docTypeId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("প্রোডাক্টের প্রয়োজনীয় ডকুমেন্টের ধরণ সঠিকভাবে উল্লেখ করুন"),
  body("data.necessaryDocument.*.isMandatory")
    .optional()
    .isBoolean()
    .withMessage("প্রোডাক্টের প্রয়োজনীয় ডকুমেন্টের বাধ্যবাধকতার অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("data.necessaryDocument.*.isDocNoMandatory")
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage(`প্রয়োজনীয় ডকুমেন্টে নম্বর দেওয়া আবশ্যিক কিনা সঠিকভাবে উল্লেখ করুন`),
  body("docNoLength").optional({ checkFalsy: true }).isArray({ min: 0 }),
  body("nextAppDesignationId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("অনুমোদনকারী/পর্যবেক্ষকের নাম সঠিকভাবে উল্লেখ করুন"),
];

export const validateUpdateFieldOfficer = [
  body("projectId").optional({ nullable: true }).isInt({ min: 1 }).withMessage("প্রকল্পের নাম সঠিকভাবে উল্লেখ করুন"),
  body("samityId").optional({ nullable: true }).isInt({ min: 1 }).withMessage("সমিতির নাম সঠিকভাবে উল্লেখ করুন"),
  body("nextAppDesignationId")
    .notEmpty()
    .withMessage("অনুমোদনকারী/পর্যবেক্ষকের নাম দেওয়া আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("অনুমোদনকারী/পর্যবেক্ষকের নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.fieldOfficerData.*.designationId")
    .exists()
    .withMessage("designation id is not present in the payload")
    .notEmpty()
    .withMessage("designation id can not be null"),
];
