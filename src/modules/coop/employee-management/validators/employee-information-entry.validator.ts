import { body } from "express-validator";
// {
//   "employeeInfo": {

export const employeeInformationEntryRequestValidator = [
  body("data.employeeInfo.spouse_name")
    .exists()
    .withMessage("স্বামী/স্ত্রীর নাম প্রদান করুন")
    .optional({ nullable: true }),
  body("data.employeeInfo.samityId").exists().withMessage("সমিতির নাম প্রদান করুন").optional(),

  body("data.employeeInfo.permanent_address")
    .exists()
    .withMessage("স্থায়ী ঠিকানা প্রদান করুন")
    .notEmpty()
    .withMessage("স্থায়ী ঠিকানা প্রদান করুন"),
  body("data.employeeInfo.employee_id")
    .exists()
    .withMessage("কর্মকর্তার আইডি প্রদান করুন")
    .notEmpty()
    .withMessage("কর্মকর্তার আইডি প্রদান করুন"),

  body("data.employeeInfo.nid")
    .exists()
    .withMessage("কর্মকর্তার এন আইডি প্রদান করুন ")
    .notEmpty()
    .withMessage("Employee nid can not be null")
    .custom((value) => {
      const length = value.toString().length;
      if (length === 10 || length === 13 || length === 17) {
        return true;
      }
      return false;
    })
    .withMessage("এন আইডি নম্বর ১০,১৩ অথবা ১৭ সংখ্যার হতে হবে। ")
    .optional(),
  body("data.employeeInfo.brn")
    .exists()
    .withMessage("কর্মকর্তা/কর্মচারীর জন্মনিবন্ধন নাম্বার প্রদান করুন")
    .notEmpty()
    .withMessage("কর্মকর্তা/কর্মচারীর জন্মনিবন্ধন নাম্বার প্রদান করুন")
    .custom((value) => {
      const length = value.toString().length;
      if (length === 17) {
        return true;
      }
      return false;
    })
    .withMessage("জন্ম নিবন্ধন নম্বর ১৭ সংখ্যার হতে হবে")
    .optional(),

  body("data.employeeInfo.dob")
    .exists()
    .withMessage("কর্মকর্তা/কর্মচারীর জন্ম তারিখ প্রদান করুন ")
    .notEmpty()
    .withMessage("কর্মকর্তা/কর্মচারীর জন্ম তারিখ প্রদান করুন "),
  body("data.employeeInfo.name")
    .exists()
    .withMessage("কর্মকর্তা/কর্মচারীর নাম প্রদান করুন")
    .notEmpty()
    .withMessage("কর্মকর্তা/কর্মচারীর নাম প্রদান করুন"),

  body("data.employeeInfo.fatherName")
    .exists()
    .withMessage("কর্মকর্তা/কর্মচারীর পিতার নাম প্রদান করুন")
    .notEmpty()
    .withMessage("কর্মকর্তা/কর্মচারীর পিতার নাম প্রদান করুন"),
  body("data.employeeInfo.motherName")
    .exists()

    .withMessage("কর্মকর্তা/কর্মচারীর মাতার নাম প্রদান করুন ")
    .optional({ nullable: true }),
  body("data.employeeInfo.maritalStatusId")
    .exists()
    .withMessage("কর্মকর্তা/কর্মচারীর বৈবাহিক অবস্থা নির্বাচন করুন")
    .notEmpty()
    .withMessage("কর্মকর্তা/কর্মচারীর বৈবাহিক অবস্থা নির্বাচন করুন"),
  body("data.employeeInfo.educationalQualification")
    .exists()
    .withMessage("কর্মকর্তা/কর্মচারীর শিক্ষাগত যোগ্যতা নির্বাচন করুন")
    .notEmpty()
    .withMessage("কর্মকর্তা/কর্মচারীর শিক্ষাগত যোগ্যতা নির্বাচন করুন"),
  body("data.employeeInfo.present_address")
    .exists()
    .withMessage("কর্মকর্তা/কর্মচারীর বর্তমান ঠিকানা প্রদান করুন")
    .notEmpty()
    .withMessage("কর্মকর্তা/কর্মচারীর বর্তমান ঠিকানা প্রদান করুন"),
  body("data.employeeInfo.designation_id")
    .exists()
    .withMessage("কর্মকর্তা/কর্মচারীর পদবি নির্বাচন করুন")
    // .notEmpty()
    // .withMessage("Designation id can not be null")
    .optional({ nullable: true }),

  body("data.employeeInfo.ranking")
    .exists()
    .withMessage("কর্মকর্তা/কর্মচারীর পদমর্যাদাক্রম প্রদান করুন")
    // .notEmpty()
    // .withMessage("Ranking or serial can not be null")
    // .isInt()
    // .withMessage("Ranking or serial must be integer")
    .optional({ nullable: true }),
  body("data.employeeInfo.status")
    .exists()
    .withMessage("কর্মকর্তা/কর্মচারীর সক্রিয়তা নির্বাচন করুন")
    .notEmpty()
    .withMessage("কর্মকর্তা/কর্মচারীর সক্রিয়তা নির্বাচন করুন"),
  body("data.employeeInfo.religion")
    .exists()
    .withMessage("কর্মকর্তা/কর্মচারীর ধর্ম নির্বাচন করুন")
    .notEmpty()
    .withMessage("কর্মকর্তা/কর্মচারীর ধর্ম নির্বাচন করুন"),
  body("data.employeeInfo.gender")
    .exists()
    .withMessage("কর্মকর্তা/কর্মচারীর লিঙ্গ নির্বাচন করুন ")
    .notEmpty()
    .withMessage("কর্মকর্তা/কর্মচারীর লিঙ্গ নির্বাচন করুন ")
    .isInt()
    .withMessage("কর্মকর্তা/কর্মচারীর লিঙ্গ পূর্ণ সংখ্যায় প্রদান করুন"),
  body("data.employeeInfo.experience").exists().notEmpty().withMessage("কর্মকর্তা/কর্মচারীর অভিজ্ঞতা প্রদান করুন"),
  body("data.employeeInfo.basic_salary")
    .exists()
    .withMessage("কর্মকর্তা/কর্মচারীর মূল বেতন প্রদান করুন")
    .optional({ nullable: true }),
  body("data.employeeInfo.gross_salary")
    .exists()
    .withMessage("কর্মকর্তা/কর্মচারীর মোট বেতন প্রদান করুন  ")
    .optional({ nullable: true }),
  body("data.imageDocument")
    .exists()
    .withMessage("কর্মকর্তা/কর্মচারীর ছবি সংযুক্ত করুন")
    .notEmpty()
    .withMessage("কর্মকর্তা/কর্মচারীর ছবি সংযুক্ত করুন"),
  body("data.imageDocument.documentPictureFront")
    .exists()
    .withMessage("কর্মকর্তা/কর্মচারীর ছবি সংযুক্ত করুন")
    .notEmpty()
    .withMessage("কর্মকর্তা/কর্মচারীর ছবি সংযুক্ত করুন"),
  body("data.imageDocument.documentPictureFrontName")
    .exists()
    .withMessage("কর্মকর্তা/কর্মচারীর ছবি সংযুক্ত করুন")
    .notEmpty()
    .withMessage("কর্মকর্তা/কর্মচারীর ছবি সংযুক্ত করুন"),
  body("data.imageDocument.documentPictureFrontType")
    .exists()
    .withMessage("ডকুমেন্টের ধরণ নির্বাচন করুন")
    .notEmpty()
    .withMessage("ডকুমেন্টের ধরণ নির্বাচন করুন"),
  body("data.imageDocument.documentPictureFrontFile")
    .exists()
    .withMessage("কর্মকর্তা/কর্মচারীর ছবি সংযুক্ত করুন")
    .notEmpty()
    .withMessage("কর্মকর্তা/কর্মচারীর ছবি সংযুক্ত করুন"),
  body("data.signatureDocument")
    .exists()
    .withMessage("কর্মকর্তা/কর্মচারীর সাক্ষর সংযুক্ত করুন")
    .notEmpty()
    .withMessage("কর্মকর্তা/কর্মচারীর সাক্ষর সংযুক্ত করুন"),
  body("data.signatureDocument.documentPictureFront")
    .exists()
    .withMessage("কর্মকর্তা/কর্মচারীর সাক্ষর সংযুক্ত করুন")
    .notEmpty()
    .withMessage("কর্মকর্তা/কর্মচারীর সাক্ষর সংযুক্ত করুন "),
  body("data.signatureDocument.documentPictureFrontName")
    .exists()
    .withMessage("কর্মকর্তা/কর্মচারীর সাক্ষর সংযুক্ত করুন")
    .notEmpty()
    .withMessage("কর্মকর্তা/কর্মচারীর সাক্ষর সংযুক্ত করুন"),
  body("data.signatureDocument.documentPictureFrontType")
    .exists()
    .withMessage("কর্মকর্তা/কর্মচারীর সাক্ষর সংযুক্ত করুন")
    .notEmpty()
    .withMessage("কর্মকর্তা/কর্মচারীর সাক্ষর সংযুক্ত করুন"),
  body("data.signatureDocument.documentPictureFrontFile")
    .exists()
    .withMessage("কর্মকর্তা/কর্মচারীর সাক্ষর সংযুক্ত করুন")
    .notEmpty()
    .withMessage("কর্মকর্তা/কর্মচারীর সাক্ষর সংযুক্ত করুন"),
  body("serviceId"),
];
