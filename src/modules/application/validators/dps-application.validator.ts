import { body, CustomSanitizer } from "express-validator";
import { BadRequestError, isJSON } from "rdcd-common";
export const dpsApplicationValidator = [
  body("projectId")
    .notEmpty()
    .withMessage("প্রকল্পের নাম আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রকল্পের নাম সঠিকভাবে উল্লেখ করুন"),
  body("samityId")
    .notEmpty()
    .withMessage("সমিতি আইডি আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সমিতি আইডি সঠিকভাবে উল্লেখ করুন"),
  body("nextAppDesignationId")
    .notEmpty()
    .withMessage("অনুমোদনকারী/পর্যবেক্ষকের আইডি আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("অনুমোদনকারী/পর্যবেক্ষকের আইডি সঠিকভাবে উল্লেখ করুন"),
  body("data.productId")
    .notEmpty()
    .withMessage("প্রোডাক্ট আইডি আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("প্রোডাক্ট আইডি সঠিকভাবে উল্লেখ করুন"),
  body("data.customerId")
    .notEmpty()
    .withMessage("সদস্য আইডি আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্য আইডি সঠিকভাবে উল্লেখ করুন"),
  body("data.installmentAmount")
    .notEmpty()
    .withMessage("কিস্তির পরিমাণ আবশ্যিক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("কিস্তির পরিমাণ অবশ্যই নম্বর হতে হবে"),
  body("data.maturityDate").notEmpty().bail().withMessage("ম্যচুরিটির তারিখ আবশ্যিক"),
  body("data.time").notEmpty().withMessage("সময়কাল উল্লেখ করা আবশ্যিক"),
  body("data.installmentFrequency")
    .notEmpty()
    .withMessage("কিস্তির ফ্রিকোয়েন্সি দেওয়া আবশ্যিক")
    .bail()
    .isIn(["M", "W"])
    .withMessage("কিস্তির ফ্রিকোয়েন্সি দেওয়া হয়েছে"),
  body("data.maturityAmount")
    .notEmpty()
    .withMessage("ম্যাচুরিটির পরিমান আবশ্যিক")
    .bail()
    .custom((value: any, { req }) => {
      let principleAmount = Number(req.body.data.installmentAmount) * Number(req.body.data.time);
      if (value > principleAmount) return true;
      else return false;
    })
    .withMessage("ম্যচুরিটির পরিমান মূলধন অপেক্ষা কম অথবা সমান হতে পারবে না"),
  body("data.nomineeInfo")
    .isArray({ min: 1 })
    .withMessage("কমপক্ষে ১ জন নমিনি থাকা আবশ্যিক")
    .bail()
    .custom((value: any) => {
      return checkNomineePercentage(value);
    })
    .withMessage("সকল নমিনির সর্বমোট শতকরার পরিমাণ অবশ্যই ১০০% হতে হবে"),
  body("data.nomineeInfo.*.nomineeName")
    .notEmpty()
    .withMessage("নমিনির নাম দেওয়া আবশ্যক")
    .bail()
    .isString()
    .withMessage("নমিনির নাম সঠিকভাবে উল্লেখ করুন"),
  body("data.nomineeInfo.*.relation")
    .notEmpty()
    .withMessage("নমিনির সাথে সদস্যের সম্পর্ক দেওয়া আবশ্যক")
    .bail()
    .isInt()
    .withMessage("নমিনির সাথে সদস্যের সম্পর্ক উল্লেখ করুন"),
  body("data.nomineeInfo.*.percentage")
    .notEmpty()
    .withMessage("নমিনির শতকরা পরিমাণ দেওয়া আবশ্যক")
    .bail()
    .isInt()
    .withMessage("নমিনির শতকরা পরিমাণ সঠিকভাবে উল্লেখ করুন")
    .bail()
    .isFloat({ max: 100 })
    .withMessage("নমিনির শতকরা পরিমাণ ১-১০০ এর মধ্যে হতে হবে"),
  body("data.grantorInfo.*.nidNumber")
    .notEmpty()
    .withMessage("জামিনদারের জাতীয় পরিচয়পত্রের নম্বর আবশ্যিক")
    .bail()
    // .custom((values: any) => {
    //   return nidLengthCheck(values);
    // })
    // .withMessage("জামিনদারের জাতীয় পরিচয়পত্রের নম্বর অবশ্যই ১০ অথবা ১৭ সংখ্যার হতে হবে"),
    //   body("data.grantorInfo.*.birthDate").notEmpty().withMessage("জামিনদারের জন্ম তারিখ আবশ্যিক"),
    //   body("data.grantorInfo.*.occupation")
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
    .isInt({ min: 1 })
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
  body("data.documentList.*.documentType")
    .notEmpty()
    .withMessage("ডকুমেন্টের ধরন আবশ্যিক")
    .bail()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage("ডকুমেন্টের ধরন সঠিকভাবে উল্লেখ করুন"),
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

function checkArrayJsonFormat(value: any) {
  if (isJSON(JSON.stringify(value))) return true;
  else return false;
}

function nidLengthCheck(nid: string) {
  const length: number = String(nid).length;

  if (Number(length) == 10 || 17) {
    return true;
  } else {
    return false;
  }
}

function checkNomineePercentage(value: any) {
  let total: number = 0;
  for (const item of value) total += Number(item.percentage);
  if (total == 100) return true;
  else return false;
}
