import { body } from "express-validator";
import { isJSON } from "rdcd-common";
import BadRequestError from "../../../errors/bad-request.error";
import db from "../../../db/connection.db";

export const validateMemberCreate = [
  body("memberInfo.*.data.age")
    .notEmpty()
    .withMessage("সদস্যের বয়স দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের বয়স সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.gender")
    .notEmpty()
    .withMessage("সদস্যের লিঙ্গ দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের লিঙ্গ সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.nameBn")
    .notEmpty()
    .withMessage("সদস্যের বাংলা নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("সদস্যের বাংলা নাম ১-২৫০ অক্ষরের মধ্যে হতে হবে"),
  body("memberInfo.*.data.nameEn")
    .notEmpty()
    .withMessage("সদস্যের ইংরেজি নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("সদস্যের ইংরেজি নাম ১-২৫০ অক্ষরের মধ্যে হতে হবে"),
  // .matches(/^[A-Za-z ,.'-]+$/)
  // .withMessage("Invalid name in english provided"),
  body("memberInfo.*.data.religion")
    .notEmpty()
    .withMessage("সদস্যের ধর্ম দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের ধর্ম সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.education")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সদস্যের শিক্ষাগত যোগ্যতা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.birthDate").notEmpty().withMessage("সদস্যের জন্ম তারিখ দেওয়া আবশ্যক"),
  body("memberInfo.*.data.occupation")
    .notEmpty()
    .withMessage("সদস্যের পেশা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের পেশা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.memberDocuments.*.documentType")
    .notEmpty()
    .withMessage("সদস্যের ডকুমেন্টের ধরণ দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 3, max: 3 })
    .withMessage("সদস্যের ডকুমেন্টের ধরণ সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.memberDocuments.*.documentNumber")
    .optional({ nullable: true })
    .isLength({ min: 0, max: 30 })
    .withMessage("সদস্যের ডকুমেন্টের নম্বর ৩০ অক্ষরের মধ্যে হতে হবে"),
  body("memberInfo.*.data.memberDocuments.*.documentFront").optional({ nullable: true }),
  // .custom(value=>{
  //   var base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
  //   if(base64regex.test(value) || )
  // })
  // .withMessage("সদস্যের ডকুমেন্টের সম্মুখ ছবি সঠিক ফরম্যাটে প্রদান করুন"),
  body("memberInfo.*.data.memberDocuments.*.documentFrontType")
    .optional({ nullable: true })
    .isString()
    .withMessage("সদস্যের ডকুমেন্টের সম্মুখ ছবির ধরণ সঠিকভাবে প্রদান করুন"),
  body("memberInfo.*.data.memberDocuments.*.documentBack").optional({ nullable: true }),
  // .isBase64()
  // .withMessage("সদস্যের ডকুমেন্টের পিছনের ছবি সঠিক ফরম্যাটে প্রদান করুন"),
  body("memberInfo.*.data.memberDocuments.*.documentBackType")
    .optional({ nullable: true })
    .isString()
    .withMessage("সদস্যের ডকুমেন্টের পিছনের ছবির ধরণ সঠিকভাবে প্রদান করুন"),
  body("memberInfo.*.data.fatherName")
    .notEmpty()
    .withMessage("সদস্যের পিতার নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("সদস্যের পিতার নাম ১-২৫০ অক্ষরের মধ্যে হতে হবে")
    .bail(),
  // .matches(/^[A-Za-z ,.'-]+$/)
  // .withMessage("Invalid father name provided"),
  body("memberInfo.*.data.fatherNid")
    .optional({ nullable: true })
    .custom((values: any) => {
      return nidLengthCheck(values);
    })
    .withMessage("সদস্যের পিতার জাতীয় পরিচয়পত্র নম্বর অবশ্যই ১০ অথবা ১৭ ডিজিটের হতে হবে")
    .trim(),
  body("memberInfo.*.data.motherName")
    .notEmpty()
    .withMessage("সদস্যের মাতার নাম দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 1, max: 250 })
    .withMessage("সদস্যের মাতার নাম ১-২৫০ অক্ষরের মধ্যে হতে হবে")
    .bail(),
  // .matches(/^[A-Za-z ,.'-]+$/)
  // .withMessage("Invalid mother name provided"),
  body("memberInfo.*.data.motherNid")
    .optional({ nullable: true })
    .custom((values: any) => {
      return nidLengthCheck(values);
    })
    .withMessage("সদস্যের মাতার জাতীয় পরিচয়পত্র নম্বর অবশ্যই ১০ অথবা ১৭ ডিজিটের হতে হবে")
    .trim(),
  body("memberInfo.*.data.mobile")
    .notEmpty()
    .withMessage("সদস্যের মোবাইল নম্বর দেওয়া আবশ্যক")
    .bail()
    .isLength({ min: 11, max: 11 })
    .withMessage("সদস্যের মোবাইল নম্বর ১১ডিজিট হতে হবে"),
  body("memberInfo.*.data.yearlyIncome")
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage("সদস্যের বার্ষিক আয় সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.maritalStatus")
    .notEmpty()
    .withMessage("সদস্যের বৈবাহিক অবস্থা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("সদস্যের বৈবাহিক অবস্থা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.data.spouseName")
    .optional({ nullable: true })
    .isLength({ min: 0, max: 250 })
    .withMessage("সদস্যের স্বামী/স্ত্রীর নাম ২৫০ অক্ষরের মধ্যে হতে হবে ")
    .bail(),
  body("memberInfo.*.data.email")
    .optional({ nullable: true })
    .isEmail()
    .withMessage("সঠিক ইমেইল আইডি প্রদান করুন")
    .normalizeEmail(),
  body("memberInfo.*.address").isObject().withMessage("ঠিকানা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.address.per.districtId")
    .notEmpty()
    .withMessage("স্থায়ী ঠিকানার জেলা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("স্থায়ী ঠিকানার জেলা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.per.upaCityId")
    .notEmpty()
    .withMessage("স্থায়ী ঠিকানার উপজেলা/ সিটি কর্পোরেশন দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("স্থায়ী ঠিকানার উপজেলা/ সিটি কর্পোরেশন সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.per.upaCityType")
    .notEmpty()
    .withMessage("স্থায়ী ঠিকানার উপজেলা/ সিটি কর্পোরেশনের ধরণ দেওয়া আবশ্যক")
    .bail()
    .isIn(["UPA", "CITY"])
    .withMessage("স্থায়ী ঠিকানার উপজেলা/ সিটি কর্পোরেশনের ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.per.uniThanaPawId")
    .notEmpty()
    .withMessage("স্থায়ী ঠিকানার ইউনিয়ন/থানা/পৌরসভা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("স্থায়ী ঠিকানার ইউনিয়ন/থানা/পৌরসভা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.per.uniThanaPawType")
    .notEmpty()
    .withMessage("স্থায়ী ঠিকানার ইউনিয়ন/থানা/পৌরসভার ধরণ দেওয়া আবশ্যক")
    .bail()
    .isIn(["UNI", "THANA", "PAW"])
    .withMessage("স্থায়ী ঠিকানার ইউনিয়ন/থানা/পৌরসভার ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.per.village")
    .optional()
    .isString()
    .withMessage("স্থায়ী ঠিকানার বর্ণনা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.address.per.postCode")
    .optional()
    .custom((value) => {
      if (value && value.toString().length != 4)
        throw new BadRequestError("স্থায়ী ঠিকানার পোস্ট অফিসের কোড ৪ অক্ষরের হতে হবে");
      else return true;
    }),
  body("memberInfo.*.address.pre.districtId")
    .notEmpty()
    .withMessage("বর্তমান ঠিকানার জেলা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("বর্তমান ঠিকানার জেলা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.pre.upaCityId")
    .notEmpty()
    .withMessage("বর্তমান ঠিকানার উপজেলা/ সিটি কর্পোরেশন দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("বর্তমান ঠিকানার উপজেলা/ সিটি কর্পোরেশন সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.pre.upaCityType")
    .notEmpty()
    .withMessage("বর্তমান ঠিকানার উপজেলা/ সিটি কর্পোরেশনের ধরণ দেওয়া আবশ্যক")
    .bail()
    .isIn(["UPA", "CITY"])
    .withMessage("বর্তমান ঠিকানার উপজেলা/ সিটি কর্পোরেশনের ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.pre.uniThanaPawId")
    .notEmpty()
    .withMessage("বর্তমান ঠিকানার ইউনিয়ন/থানা/পৌরসভা দেওয়া আবশ্যক")
    .bail()
    .isInt({ min: 1 })
    .withMessage("বর্তমান ঠিকানার ইউনিয়ন/থানা/পৌরসভা সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.pre.uniThanaPawType")
    .notEmpty()
    .withMessage("বর্তমান ঠিকানার ইউনিয়ন/থানা/পৌরসভার ধরণ দেওয়া আবশ্যক")
    .bail()
    .isIn(["UNI", "THANA", "PAW"])
    .withMessage("বর্তমান ঠিকানার ইউনিয়ন/থানা/পৌরসভার ধরণ সঠিকভাবে উল্লেখ করুন")
    .trim(),
  body("memberInfo.*.address.pre.village")
    .optional()
    .isString()
    .withMessage("বর্তমান ঠিকানার বর্ণনা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.address.pre.postCode")
    .optional()
    .custom((value) => {
      if (value && value.toString().length != 4)
        throw new BadRequestError("বর্তমান ঠিকানার পোস্ট অফিসের কোড ৪ অক্ষরের হতে হবে");
      else return true;
    }),
  body("memberInfo.*.guardianInfo").optional({ nullable: true }),
  body("memberInfo.*.guardianInfo.guardianName")
    .optional({ nullable: true })
    .isLength({ min: 0, max: 250 })
    .withMessage("সদস্যের অভিভাবকের নাম ২৫০ অক্ষরের মধ্যে হতে হবে")
    .bail()
    .trim(),
  body("memberInfo.*.guardianInfo.documentNo")
    .optional()
    .custom((values: any) => {
      return nidLengthCheck(values);
    })
    .withMessage("সদস্যের অভিভাবিকের জাতীয় পরিচয়পত্র নম্বর অবশ্যই ১০ অথবা ১৭ ডিজিটের হতে হবে")
    .trim(),
  body("memberInfo.*.guardianInfo.relation")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("অভিভাবকের সাথে সদস্যের সম্পর্ক সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.guardianInfo.occupation")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("অভিভাবকের পেশা সঠিকভাবে উল্লেখ করুন"),
  body("memberInfo.*.nominee")
    .custom(async (value: any, { req }) => {
      const status = await getProjectConfig(req.body.memberInfo[0].data.projectId);
      if (status && !value) return false;
      else return true;
    })
    .withMessage("নমিনির তথ্য দেওয়া আবশ্যক")
    .bail()
    .custom(async (value: any, { req }) => {
      const status = await getProjectConfig(req.body.memberInfo[0].data.projectId);
      if (status) return checkArrayJsonFormat(value);
      else return true;
    })
    .withMessage("নমিনির তথ্য সঠিকভাবে উল্লেখ করুন")
    .custom(async (value: any, { req }) => {
      const status = await getProjectConfig(req.body.memberInfo[0].data.projectId);
      if (status) return checkNomineePercentage(value);
      else return true;
    }),
  // .withMessage("সকল নমিনির সর্বমোট শতকরার পরিমাণ অবশ্যই ১০০% হতে হবে"),
  body("memberInfo.*.nominee.*.nomineeName")
    .custom(async (value: any, { req }) => {
      const status = await getProjectConfig(req.body.memberInfo[0].data.projectId);

      if (status && !value) throw new BadRequestError(`নমিনির নাম দেওয়া আবশ্যক`);
      else return true;
    })
    .trim(),
  body("memberInfo.*.nominee.*.relation").custom(async (value: any, { req }) => {
    const status = await getProjectConfig(req.body.memberInfo[0].data.projectId);
    if (status && !value) throw new BadRequestError(`নমিনির সাথে সদস্যের সম্পর্ক দেওয়া আবশ্যক`);
    else if (status && !Number(value)) throw new BadRequestError(`নমিনির সাথে সদস্যের সম্পর্ক সঠিকভাবে উল্লেখ করুন`);
    else return true;
  }),
  body("memberInfo.*.nominee.*.percentage").custom(async (value: any, { req }) => {
    const status = await getProjectConfig(req.body.memberInfo[0].data.projectId);
    if (status && !value) throw new BadRequestError(`নমিনির শতকরা পরিমাণ দেওয়া আবশ্যক`);
    else if (status && !Number(value)) throw new BadRequestError(`নমিনির শতকরা পরিমাণ সঠিকভাবে উল্লেখ করুন`);
    else if (status && (Number(value) < 0 || Number(value) > 100))
      throw new BadRequestError(`নমিনির শতকরা পরিমাণ ১-১০০ এর মধ্যে হতে হবে`);
    else return true;
  }),
  body("memberInfo.*.nominee.*.docType").custom(async (value: any, { req }) => {
    const status = await getProjectConfig(req.body.memberInfo[0].data.projectId);

    if (status && !value) throw new BadRequestError(`নমিনির ডকুমেন্টের ধরণ দেওয়া আবশ্যক`);
    else if (status && value && String(value).length != 3)
      throw new BadRequestError(`নমিনির ডকুমেন্টের ধরণ সঠিকভাবে উল্লেখ করুন`);
    else return true;
  }),

  body("memberInfo.*.nominee.*.docNumber").custom(async (value: any, { req }) => {
    const status = await getProjectConfig(req.body.memberInfo[0].data.projectId);

    if (status && !value) throw new BadRequestError(`নমিনির ডকুমেন্টের নম্বর দেওয়া  আবশ্যক`);
    else return true;
  }),

  body("memberInfo.*.nominee.*.nomineePicture").custom(async (value: any, { req }) => {
    const status = await getProjectConfig(req.body.memberInfo[0].data.projectId);

    if (status && !value) throw new BadRequestError(`নমিনির ছবি দেওয়া আবশ্যক`);
    else return true;
  }),

  // body("memberInfo.*.nominee.*.nomineePictureType").custom(async (value: any, { req }) => {
  //   const fileTypes = ["jpeg", "jpg", "png"];
  //   const status = await getProjectConfig(req.body.memberInfo[0].data.projectId);

  //   if (status && !value) throw new BadRequestError(`নমিনির ছবির ধরণ দেওয়া আবশ্যক`);
  //   else if (status && !fileTypes.includes(String(value).split("/")[1]))
  //     throw new BadRequestError(`নমিনির ছবি JPEG/JPG/PNG ফরম্যাটে দিতে হবে`);
  //   else return true;
  // }),
  body("memberInfo.*.nominee.*.nomineeSign").custom(async (value: any, { req }) => {
    const status = await getProjectConfig(req.body.memberInfo[0].data.projectId);

    if (status && !value) throw new BadRequestError(`নমিনির স্বাক্ষরের ছবি দেওয়া আবশ্যক`);
    else return true;
  }),
  // body("memberInfo.*.nominee.*.nomineeSignType").custom(async (value: any, { req }) => {
  //   const fileTypes = ["jpeg", "jpg", "png"];
  //   const status = await getProjectConfig(req.body.memberInfo[0].data.projectId);

  //   if (status && !value) throw new BadRequestError(`নমিনির স্বাক্ষরের ছবির ধরণ দেওয়া আবশ্যক`);
  //   else if (status && !fileTypes.includes(String(value).split("/")[1]))
  //     throw new BadRequestError(`নমিনির স্বাক্ষরের ছবি JPEG/JPG/PNG ফরম্যাটে দিতে হবে`);
  //   else return true;
  // }),
  body("memberInfo.*.data.classId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সদস্যের শ্রেণি সঠিকভাবে উল্লেখ করুন"),

  body("memberInfo.*.data.section")
    .optional({ nullable: true })
    .isLength({ min: 1, max: 50 })
    .withMessage("সদস্যের শ্রেণির সেকশনের নাম ৫০ অক্ষরের মধ্যে হতে হবে"),

  body("memberInfo.*.data.rollNo")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("সদস্যের শ্রেণি রোল সঠিকভাবে উল্লেখ করুন"),

  body("memberInfo.*.memberSign").optional({ nullable: true }),

  body("memberInfo.*.memberSignType")
    .optional({ nullable: true })
    .isString()
    .withMessage("সদস্যের স্বাক্ষরের ছবির ধরণ সঠিকভাবে প্রদান করুন"),
  body("memberInfo.*.memberPicture").optional({ nullable: true }),
  // .isBase64()
  // .withMessage("সদস্যের ছবি সঠিক ফরম্যাটে প্রদান করুন"),
  body("memberInfo.*.memberPictureType")
    .optional({ nullable: true })
    .isString()
    .withMessage("সদস্যের ছবির ধরণ সঠিকভাবে প্রদান করুন"),
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
  if (total == 100) true;
  else throw new BadRequestError("সকল নমিনির সর্বমোট শতকরার পরিমাণ অবশ্যই ১০০% হতে হবে");
}

async function getProjectConfig(projectId: number) {
  const pool = db.getConnection("slave");
  const projectConfigSql = `SELECT 
                              is_default_savings_product, 
                              is_default_share_product 
                            FROM 
                              master.project_info 
                            WHERE 
                              id = $1`;
  const projectConfig = (await pool.query(projectConfigSql, [projectId])).rows[0];
  if (projectConfig && (projectConfig.is_default_savings_product || projectConfig.is_default_share_product))
    return true;
  else return false;
}
