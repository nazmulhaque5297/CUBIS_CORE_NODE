import { body, CustomSanitizer } from "express-validator";
import BadRequestError from "../../..//errors/bad-request.error";

const toInt: CustomSanitizer = (value) => {
  if (value[0]) {
    return value.map((v: any) => {
      return parseInt(v);
    });
  }
};

function onlyOneActiveValue(value: any) {
  const activeValue = value.filter((value: any) => value.isActive == true);
  if (activeValue && activeValue.length === 1) return true;
  else return false;
}

function percentageCheck(value: any) {
  const activeValue = value.filter((value: any) => value.isActive == true);
  const singlePercentageValue = activeValue.map((v: any) => Number(v.segregationRate));
  const totalPercentage = singlePercentageValue.reduce((a: number, b: number) => a + b, 0);
  if (totalPercentage === 100) return true;
  else return false;
}

export const validateProductUpdate = [
  body("projectId")
    .notEmpty()
    .withMessage("প্রকল্পের নাম আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রকল্প সঠিকভাবে উল্লেখ করুন"),
  body("data.productId")
    .notEmpty()
    .withMessage("প্রোডাক্টের আইডি দেওয়া আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রোডাক্টের নাম সঠিকভাবে উল্লেখ করুন"),
  body("samityId").optional({ nullable: true }),
  body("data.productMaster.minLoanAmt")
    .notEmpty()
    .withMessage("সর্বনিম্ন ঋণের পরিমান দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সর্বনিম্ন ঋণের পরিমান অবশ্যই শূন্য অপেক্ষা বড় হতে হবে"),
  body("data.productMaster.maxLoanAmt")
    .notEmpty()
    .withMessage("সর্বোচ্চ ঋণের পরিমান দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সর্বোচ্চ ঋণের পরিমান অবশ্যই শূন্য অপেক্ষা বড় হতে হবে"),
  body("data.productMaster.repFrq")
    .notEmpty()
    .withMessage("কিস্তি আদায়ের ফ্রিকোয়েন্সি দেওয়া আবশ্যক")
    .bail()
    .isIn(["W", "M"])
    .withMessage("কিস্তি আদায়ের ফ্রিকোয়েন্সি অবশ্যই সাপ্তাহিক বা মাসিক হতে হবে"),
  body("data.productMaster.calType")
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
  body("data.productMaster.allowGracePeriod")
    .notEmpty()
    .withMessage("প্রোডাক্টের গ্রেস পিরিয়ডের অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isBoolean()
    .withMessage("প্রোডাক্টের গ্রেস পিরিয়ডের অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.gracePeriod").custom((value, { req }) => {
    if (req.body.data.productMaster.allowGracePeriod && !value)
      throw new BadRequestError(`প্রোডাক্টের গ্রেস পিরিয়ড উল্লেখ করুন`);
    else {
      if (value && !Number.isInteger(value)) throw new BadRequestError(`প্রোডাক্টের গ্রেস পিরিয়ড সঠিকভাবে উল্লেখ করুন`);
      else return true;
    }
  }),
  body("data.productMaster.serCrgAtGracePeriod").custom((value, { req }) => {
    if (req.body.data.productMaster.allowGracePeriod && !(value.toString() == "true" || value.toString() == "false"))
      throw new BadRequestError(`প্রোডাক্টের গ্রেস পিরিয়ডে সার্ভিস চার্জের অবস্থা দেওয়া আবশ্যক`);
    else return true;
  }),
  // .bail()
  // .isBoolean()
  // .withMessage("প্রোডাক্টের গ্রেস পিরিয়ডে সার্ভিস চার্জের অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.graceAmtRepayIns")
    .custom((value, { req }) => {
      if (req.body.data.productMaster.serCrgAtGracePeriod && !value)
        throw new BadRequestError(`প্রোডাক্টের গ্রেস পিরিয়ডে সার্ভিস চার্জের পদ্ধতি উল্লেখ করুন`);
      else return true;
    })
    .isIn(["EQUAL", "NO-CHARGE", "NO", null])
    .withMessage("প্রোডাক্টের গ্রেস পিরিয়ডে সার্ভিস চার্জের পদ্ধতি সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.principalGl")
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
  body("data.productMaster.allowInsurance")
    .notEmpty()
    .withMessage("প্রোডাক্টের ইন্সুরেন্সের চার্জের অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isBoolean()
    .withMessage("প্রোডাক্টের ইন্সুরেন্সের অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.insuranceGl").custom((value, { req }) => {
    if (req.body.data.productMaster.allowInsurance && !value)
      throw new BadRequestError(`ইন্সুরেন্সের জিএল উল্লেখ করুন`);
    else {
      if (value && !Number.isInteger(value)) throw new BadRequestError(`ইন্সুরেন্সের জিএল সঠিকভাবে উল্লেখ করুন`);
      else return true;
    }
  }),
  body("data.productMaster.insurancePercent").custom((value, { req }) => {
    if (req.body.data.productMaster.allowInsurance && !value)
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
  body("data.productMaster.realizationSeqPrincipal")
    .notEmpty()
    .withMessage("আদায়ের ক্রমানুসার মূলধন দেওয়া আবশ্যক")
    .isIn([1, 2, 3])
    .withMessage("আদায়ের ক্রমানুসার মূলধন সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.realizationSeqService")
    .notEmpty()
    .withMessage("আদায়ের ক্রমানুসার সার্ভিস চার্জ দেওয়া আবশ্যক")
    .isIn([1, 2, 3])
    .withMessage("আদায়ের ক্রমানুসার সার্ভিস চার্জ সঠিকভাবে উল্লেখ করুন"),
  body("data.productMaster.realizationSeqOd")
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
      const realizationSeqPrincipal = req.body?.data?.productMaster?.realizationSeqPrincipal
        ? Number(req.body.data.productMaster.realizationSeqPrincipal)
        : undefined;
      const realizationSeqService = req.body?.data?.productMaster?.realizationSeqService
        ? Number(req.body.data.productMaster.realizationSeqService)
        : undefined;
      const realizationSeqOd = req.body?.data?.productMaster?.realizationSeqOd
        ? Number(req.body.data.productMaster.realizationSeqOd)
        : undefined;

      let allTransactionSerial = [realizationSeqPrincipal, realizationSeqService, realizationSeqOd];
      const findDuplicates = allTransactionSerial.filter(
        (item: any, index: number) => allTransactionSerial.indexOf(item) !== index
      );

      if (!allTransactionSerial.includes(undefined) && findDuplicates.length > 0) return false;
      else return true;
    })
    .withMessage("আদায়ের ক্রমানুসার পুনরাবৃত্তি করা যাবে না"),
  body("data.productMaster")
    .custom((value: any) => {
      if (value.loanTerm.length != value.numberOfInstallment.length) return false;
      else return true;
    })
    .withMessage("ঋণের মেয়াদের সংখ্যা ও কিস্তি আদায়ের সংখ্যা সমান হতে হবে"),
  body("data.productCharge")
    .custom((value) => {
      let allChargeTypes = value.map((chargeValue: any) => Number(chargeValue.chargeTypeId));
      const findDuplicates = allChargeTypes.filter(
        (item: any, index: number) => allChargeTypes.indexOf(item) !== index
      );
      if (findDuplicates.length > 0) return false;
      else return true;
    })
    .withMessage("ইতিমধ্যে চার্জের নামটি বিদ্যমান আছে"),
  body("data.productCharge.*.effectDate").optional(),
  body("data.productCharge.*.chargeTypeId")
    .custom((value: any, { req }) => {
      if (req.body.data.productCharge[0] && !value) return false;
      else return true;
    })
    .withMessage("প্রোডাক্টের চার্জের নাম দেওয়া আবশ্যক")
    .isInt()
    .withMessage("প্রোডাক্টের চার্জের নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.productCharge.*.chargeValue")
    .custom((value: any, { req }) => {
      if (req.body.data.productCharge[0] && !value) return false;
      else return true;
    })
    .withMessage("প্রোডাক্টের চার্জের পরিমাণ দেওয়া আবশ্যক")
    .isInt()
    .withMessage("প্রোডাক্টের চার্জের পরিমাণ সঠিকভাবে উল্লেখ করুন"),
  body("data.productCharge.*.chargeGl")
    .custom((value: any, { req }) => {
      if (req.body.data.productCharge[0] && !value) return false;
      else return true;
    })
    .withMessage("প্রোডাক্টের চার্জের ক্রেডিট জিএল এর নাম দেওয়া আবশ্যক")
    .isInt({ min: 1 })
    .withMessage("প্রোডাক্টের চার্জের ক্রেডিট জিএল এর নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.productCharge.*.isActive")
    .custom((value: any, { req }) => {
      if (req.body.data.productCharge[0] && !value.toString()) return false;
      else return true;
    })
    .withMessage("প্রোডাক্টের চার্জের অবস্থা দেওয়া আবশ্যক")
    .isBoolean()
    .withMessage("প্রোডাক্টের চার্জের অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("data.productServiceCharge")
    .custom((values: any) => {
      return onlyOneActiveValue(values);
    })
    .withMessage("প্রোডাক্টের শুধুমাত্র একটি সার্ভিস চার্জের পরিমান সক্রিয় থাকবে"),
  body("data.productServiceCharge.*.intRate")
    .notEmpty()
    .withMessage("প্রোডাক্টের সার্ভিস চার্জের শতকরা হার দেওয়া আবশ্যক")
    .bail()
    .isFloat({ min: 0.0, max: 100.0 })
    .withMessage("প্রোডাক্টের সার্ভিস চার্জের শতকরা হারের সর্বোচ্চ পরিমাণ ১০০%"),
  body("data.productServiceCharge.*.effectDate")
    .notEmpty()
    .withMessage("প্রডাক্টের সার্ভিস চার্জ কার্যকর হওয়ার তারিখ দেওয়া আবশ্যক"),
  body("data.productServiceCharge.*.currentdueIntRate")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0.0, max: 100.0 })
    .withMessage("প্রোডাক্টের বিলম্বিত সার্ভিস চার্জের শতকরা হারের সর্বোচ্চ পরিমাণ ১০০%"),
  body("data.productServiceCharge.*.overdueIntRate")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0.0, max: 100.0 })
    .withMessage("প্রোডাক্টের মেয়াদউত্তীর্ণ সার্ভিস চার্জের শতকরা হারের সর্বোচ্চ পরিমাণ ১০০%"),
  body("data.productServiceCharge.*.isActive")
    .notEmpty()
    .withMessage("প্রোডাক্টের সার্ভিস চার্জের অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isBoolean()
    .withMessage("প্রোডাক্টের সার্ভিস চার্জের অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("data.slabWiseLoanAmount")
    .custom((value) => {
      let allLoanNo = value.map((slabWiseLoanData: any) => Number(slabWiseLoanData.loanNo));
      const findDuplicates = allLoanNo.filter((item: any, index: number) => allLoanNo.indexOf(item) !== index);
      if (findDuplicates.length > 0) return false;
      else return true;
    })
    .withMessage("একই ঋণ নম্বর পুনরাবৃত্তি করা যাবে না"),
  body("data.slabWiseLoanAmount.*.loanNo")
    .notEmpty()
    .withMessage("ঋণ নম্বর দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("ঋণ নম্বর অবশ্যই সাংখ্যিক হতে হবে"),
  body("data.slabWiseLoanAmount.*.minAmount")
    .notEmpty()
    .withMessage("ঋণের সর্বনিম্ন টাকার পরিমাণ দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("ঋণের সর্বনিম্ন টাকার পরিমাণ অবশ্যই সাংখ্যিক হতে হবে"),
  body("data.slabWiseLoanAmount.*.maxAmount")
    .notEmpty()
    .withMessage("ঋণের সর্বোচ্চ টাকার পরিমাণ দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("ঋণের সর্বোচ্চ টাকার পরিমাণ অবশ্যই সাংখ্যিক হতে হবে"),
  body("data.slabWiseLoanAmount.*.preDisbInterval")
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage("পূর্বের ঋণের ব্যবধান (দিন) অবশ্যই সাংখ্যিক হতে হবে"),
  body("data.slabWiseLoanAmount.*.depositPercent")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0.0, max: 100.0 })
    .withMessage("সঞ্চয়ের শতকরা হারের সর্বোচ্চ পরিমাণ ১০০%"),
  body("data.slabWiseLoanAmount.*.sharePercent")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0.0, max: 100.0 })
    .withMessage("শেয়ারের শতকরা হারের সর্বোচ্চ পরিমাণ ১০০%"),
  body("data.slabWiseLoanAmount.*.isActive")
    .notEmpty()
    .withMessage("ঋণের দফার অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isBoolean()
    .withMessage("ঋণের দফার অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("data.serviceChargeBivajon.*.segregationId")
    .custom((value: any, { req }) => {
      if (req.body.data.serviceChargeBivajon[0] && !value) return false;
      else return true;
    })
    .withMessage("সার্ভিস চার্জের বিভাজনের খাতের নাম দেওয়া আবশ্যক")
    .isInt({ min: 1 })
    .withMessage("সার্ভিস চার্জের বিভাজনের খাতের নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.serviceChargeBivajon.*.segregationRate")
    .custom((value: any, { req }) => {
      if (req.body.data.serviceChargeBivajon[0] && !value) return false;
      else return true;
    })
    .withMessage("সার্ভিস চার্জ বিভাজনের শতকরা হার দেওয়া আবশ্যক")
    .isFloat({ min: 0.0, max: 100.0 })
    .withMessage("সার্ভিস চার্জ বিভাজনের শতকরা হারের সর্বোচ্চ পরিমাণ ১০০%"),
  body("data.serviceChargeBivajon")
    .optional()
    .custom((value: any) => {
      if (value[0]) return percentageCheck(value);
      else return true;
    })
    .withMessage("সক্রিয় সার্ভিস চার্জ বিভাজনসমূহের মোট শতকরা পরিমান ১০০% হওয়া আবশ্যক"),
  body("data.serviceChargeBivajon.*.glId")
    .custom((value: any, { req }) => {
      if (req.body.data.serviceChargeBivajon[0] && !value) return false;
      else return true;
    })
    .withMessage("সার্ভিস চার্জের বিভাজনের লেজারের নাম দেওয়া আবশ্যক")
    .isInt({ min: 1 })
    .withMessage("সার্ভিস চার্জের বিভাজনের লেজারের নাম সঠিকভাবে উল্লেখ করুন "),
  body("data.serviceChargeBivajon.*.isActive")
    .custom((value: any, { req }) => {
      if (req.body.data.serviceChargeBivajon[0] && !(value.toString() == "true" || value.toString() == "false"))
        return false;
      else return true;
    })
    .withMessage("সার্ভিস চার্জের বিভাজনের অবস্থা দেওয়া আবশ্যক")
    .isBoolean()
    .withMessage("সার্ভিস চার্জের বিভাজনের অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("data.serviceChargeBivajon")
    .custom((value) => {
      let allSectors = value.map((serviceChargeSegData: any) => Number(serviceChargeSegData.segregationId));
      const findDuplicates = allSectors.filter((item: any, index: number) => allSectors.indexOf(item) !== index);
      if (findDuplicates.length > 0) return false;
      else return true;
    })
    .withMessage("একই খাতের নাম পুনরাবৃত্তি করা যাবে না"),
  body("data.necessaryDocument.*.docTypeId")
    .notEmpty()
    .withMessage("প্রোডাক্টের প্রয়োজনীয় ডকুমেন্টের ধরণ দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রোডাক্টের প্রয়োজনীয় ডকুমেন্টের ধরণ সঠিকভাবে উল্লেখ করুন"),
  body("data.necessaryDocument.*.isMandatory")
    .notEmpty()
    .withMessage("প্রোডাক্টের প্রয়োজনীয় ডকুমেন্টের বাধ্যবাধকতার অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isBoolean()
    .withMessage("প্রোডাক্টের প্রয়োজনীয় ডকুমেন্টের বাধ্যবাধকতার অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("data.necessaryDocument")
    .custom((value) => {
      let allDocuments = value.map((documentData: any) => Number(documentData.docTypeId));
      const findDuplicates = allDocuments.filter((item: any, index: number) => allDocuments.indexOf(item) !== index);
      if (findDuplicates.length > 0) return false;
      else return true;
    })
    .withMessage("একই ডকুমেন্টের ধরণ পুনরাবৃত্তি করা যাবে না"),
  body("nextAppDesignationId")
    .notEmpty()
    .withMessage("অনুমোদনকারী/পর্যবেক্ষকের নাম দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("অনুমোদনকারী/পর্যবেক্ষকের নাম সঠিকভাবে উল্লেখ করুন"),
];
