import { body, Meta } from "express-validator";
import { get } from "lodash";
import { BadRequestError, isExistsByColumn } from "rdcd-common";
import Container from "typedi";
import { pgConnect } from "../../../../../../db-coop/factory/connection.db";
import { MemberInformationCorrectionServices } from "../../../../../../modules/coop/coop/services/coop/application/memberInformationCorrection.service.";
import { MemberInfoServices } from "../../../../../../modules/coop/coop/services/coop/member-info.service";
import { SamityInfoServices } from "../../../../../../modules/coop/coop/services/coop/samityInfo/samity-Info.service";
import ServiceInfoServices from "../../../../../../modules/coop/coop/services/service-info.service";
import { isDateFormateValid } from "../../../../../../validators/checkDateFormate.validator";

export const memberInfomationCorrectionRequest = [
  body("data.membersInfo")
    .exists()
    .notEmpty()
    .isArray({ min: 1 })
    .withMessage("membersInfo is not an array of objects")
    .custom((value) => {
      const samityId = value[0].samityId;

      const isSamityIdSame = !value.some((e: any) => {
        return e.samityId != samityId;
      });

      return isSamityIdSame;
    })
    .withMessage("samity id can not be differ of members"),

  body("data.membersInfo.*.samityId")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      const isSamityTypeIdExist = await isExistsByColumn(
        "id",
        "coop.samity_info",
        await pgConnect.getConnection("slave"),
        { id: value }
      );

      return isSamityTypeIdExist ? true : Promise.reject();
    })
    .withMessage("samityId is not present in database")
    .custom(async (value, { req }) => {
      const MemberInformationCorrectionService = Container.get(MemberInformationCorrectionServices);
      const ServiceInfoService = Container.get(ServiceInfoServices);
      const serviceId = await ServiceInfoService.getServiceByNameAndDoptor(req.body.serviceName, req.user.doptorId);
      const isSamityExistInApplication = await MemberInformationCorrectionService.isSamityExistInApplication(
        value,
        serviceId
      );

      return isSamityExistInApplication ? Promise.reject() : true;
    })
    .withMessage("সমিতিটির ক্ষেত্রে সদস্য সংযোজন /তথ্য সংশোধনের আবেদন রয়েছে "),

  body("data.membersInfo.*.id")
    .exists()
    .notEmpty()
    .isInt()
    .custom(async (value, { req }) => {
      const isIdExist: any = await isExistsByColumn("id", "coop.member_info", await pgConnect.getConnection("slave"), {
        id: value,
        samityId: req.body.samityId,
      });

      return isIdExist ? true : Promise.reject();
    })
    .withMessage("মেম্বার টি পাওয়া যায় নি")
    .optional()
    .bail(),

  body("data.membersInfo.*.nid")
    .custom(async (value, { req, path, location }) => {
      const index = path.split(".")[1]; //members[0]
      const brn: any = get(req.body, `data.${index}.brn`);
      const memberNameBangla: any = get(req.body, `data.${index}.memberNameBangla`);
      if (!value && !brn) throw new BadRequestError(`${memberNameBangla} এর এনআইডি/জন্ম নিবন্ধন নম্বর লিখুন`);
      else return true;
    })
    .bail()
    .trim()
    // .toInt()
    // .isInt()
    .custom((value, { req, path }) => {
      const index = path.split(".")[1]; //members[0]
      const memberNameBangla: any = get(req.body, `data.${index}.memberNameBangla`);
      const length = value.toString().length;
      if (value) {
        if (length === 10 || length === 17) {
          return true;
        }
        throw new BadRequestError(`${memberNameBangla} এর এনআইডি নম্বর ১০ অথবা ১৭ সংখ্যার হতে হবে।`);
      } else return true;
    })
    .bail()
    .custom(async (value, { req, path, location }) => {
      const index = path.split(".")[1]; //members[0]
      const id: any = get(req.body, `data.${index}.id`);
      const memberNameBangla: any = get(req.body, `data.${index}.memberNameBangla`);
      let isNidExist;
      const MemberInformationCorrectionService = Container.get(MemberInformationCorrectionServices);

      if (value) {
        if (id) {
          isNidExist = await MemberInformationCorrectionService.nidOrBrnExistUpdate(
            value,
            id,
            req.body.samityId,
            "nid"
          );
        } else {
          isNidExist = await isExistsByColumn("id", "coop.member_info", await pgConnect.getConnection("slave"), {
            nid: value,
            samityId: parseInt(req.body.samityId),
          });
        }
      }
      if (value && isNidExist) throw new BadRequestError(`${memberNameBangla} এর এনআইডি নম্বরটি পূর্বে ব্যবহৃত হয়েছে`);
      else return true;
    })
    .bail()
    .custom((value, { req }) => {
      let count = 0;
      let firstIndex;
      let secondIndex = 0;
      const nids = req.body.data.membersInfo.map((e: any) => e.nid);
      for (const [i, element] of nids.entries()) {
        if(element){
          if (element == value) {
            count++;
            if (count == 1) {
              firstIndex = i;
            }
          }
          if (count == 2) {
            secondIndex = i;
            break;
          }
        }
      }

      if (secondIndex) {
        throw new BadRequestError(
          `${req.body.data.membersInfo[firstIndex].memberName} এবং 
           ${req.body.data.membersInfo[secondIndex].memberName} দুইজনের এনআইডি একই। একই এনআইডি গ্রহণযোগ্য নয়।  `
        );
      } else {
        return true;
      }
    })
    // .isLength({ min: 1, max: 20 })
    // .withMessage(" এনআইডি নম্বর   ১ থেকে ২০ অক্ষরের মধ্যে হতে হবে ")
    .bail(),
  body("data.membersInfo.*.brn")
    .custom(async (value, { req, path, location }) => {
      const index = path.split(".")[1]; //members[0]
      const nid: any = get(req.body, `data.${index}.nid`);
      const memberNameBangla: any = get(req.body, `data.${index}.memberNameBangla`);
      if (!value && !nid) throw new BadRequestError(`${memberNameBangla} এর এনআইডি/জন্ম নিবন্ধন নম্বর লিখুন`);
      else return true;
    })
    .bail()
    .custom(async (value, { req, path, location }) => {
      const index = path.split(".")[1]; //members[0]
      const id = get(req.body, `data.${index}.id`);
      const memberNameBangla: any = get(req.body, `data.${index}.memberNameBangla`);
      let isBrnExist;
      const MemberInformationCorrectionService = Container.get(MemberInformationCorrectionServices);

      if (value) {
        if (id) {
          isBrnExist = await MemberInformationCorrectionService.nidOrBrnExistUpdate(
            value,
            id,
            req.body.samityId,
            "brn"
          );
        } else {
          isBrnExist = await isExistsByColumn("id", "coop.member_info", await pgConnect.getConnection("slave"), {
            brn: value,
            samityId: parseInt(req.body.samityId),
          });
        }
      }
      if (value && isBrnExist)
        throw new BadRequestError(`${memberNameBangla} এর জন্ম নিবন্ধন নম্বরটি পূর্বে ব্যবহৃত হয়েছে`);
      else return true;
    })
    .bail()
    .custom((value, { req, path }) => {
      const index = path.split(".")[1]; //members[0]
      const memberNameBangla: any = get(req.body, `data.${index}.memberNameBangla`);

      if (value) {
        const length = value.toString().length;
        if (length === 17) {
          return true;
        }
        throw new BadRequestError(`${memberNameBangla} এর জন্ম নিবন্ধন নম্বর ১৭ সংখ্যার হতে হবে।`);
      } else return true;
    })
    .bail()
    .custom((value, { req }) => {
      let count = 0;
      let firstIndex;
      let secondIndex;
      const nids = req.body.data.membersInfo.map((e: any) => e.brn);
      for (const [i, element] of nids.entries()) {
        if(element){
          if (element == value) {
            count++;
            if (count == 1) {
              firstIndex = i;
            }
          }
          if (count == 2) {
            secondIndex = i;
            break;
          }
        }
      }
      if(value){
        if (secondIndex) {
          throw new BadRequestError(
            `${req.body.data.membersInfo[firstIndex].memberName} এবং 
             ${req.body.data.membersInfo[secondIndex].memberName} দুইজনের জন্ম নিবন্ধন নম্বর  একই। একই জন্ম নিবন্ধন নম্বর গ্রহণযোগ্য নয়।  `
          );
        } else {
          return true;
        }
      } else return true
     
    })
    // .isLength({ min: 1, max: 20 })
    // .withMessage(" জন্ম নিবন্ধন নম্বর ১ থেকে ২০ অক্ষরের মধ্যে হতে হবে ")
    // .optional()
    .bail(),

  body("data.membersInfo.*.dob").custom(async (value, { req, path, location }: Meta) => {
    if (actionFor({ req, path, location }) == "deactivate") {
      return true;
    } else {
      const samityInfoService = Container.get(SamityInfoServices);
      const samityInformation: any = await samityInfoService.get({
        id: req.body.samityId,
      });

      if (samityInformation[0].samityLevel == "P") {
        if (!value) {
          throw new BadRequestError("জন্ম তারিখ নির্বাচন করুন");
        } else if (!isDateFormateValid(value)) {
          throw new BadRequestError("জন্ম তারিখ সঠিকভাবে উল্লেখ করুন");
        } else {
          return true;
        }
      } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
        return true;
      }
    }
  }),
  body("data.membersInfo.*.memberName")
    .exists()
    .custom((value, { req, path, location }: Meta) => {
      if (actionFor({ req, path, location }) == "deactivate") {
        return true;
      } else {
        if (!value) {
          throw new BadRequestError("সদস্যের ইংরেজী নাম লিখুন ");
        } else if (value.length > 50 || value.length < 1) {
          throw new BadRequestError("সদস্যের নাম ১ থেকে ৫০ অক্ষরের মধ্যে হতে হবে");
        } else {
          return true;
        }
      }
    })

    .trim(),
  body("data.membersInfo.*.memberNameBangla").custom(async (value, { req, path, location }: Meta) => {
    if (actionFor({ req, path, location }) == "deactivate") {
      return true;
    } else {
      const samityInfoService = Container.get(SamityInfoServices);
      const samityInformation: any = await samityInfoService.get({
        id: req.body.samityId,
      });

      if (samityInformation[0].samityLevel == "P") {
        if (!value) {
          throw new BadRequestError("সদস্যের বাংলা নাম লিখুন");
        } else if (value.length > 50) {
          throw new BadRequestError("সদস্যের বাংলা নাম  ১ থেকে ৫০ অক্ষরের মধ্যে হতে হবে");
        } else {
          return true;
        }
      } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
        return true;
      }
    }
  }),
  body("data.membersInfo.*.fatherName")
    .custom(async (value, { req, path, location }: Meta) => {
      if (actionFor({ req, path, location }) == "deactivate") {
        return true;
      } else {
        const samityInfoService = Container.get(SamityInfoServices);
        const samityInformation: any = await samityInfoService.get({
          id: req.body.samityId,
        });

        if (samityInformation[0].samityLevel == "P") {
          if (!value) {
            throw new BadRequestError("পিতার নাম লিখুন");
          } else if (value.length > 50 || value.length < 1) {
            throw new BadRequestError("পিতার নাম ১ থেকে ৫০ অক্ষরের মধ্যে হতে হবে");
          } else {
            return true;
          }
        } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
          return true;
        }
      }
    })
    .trim(),
  body("data.membersInfo.*.motherName").custom(async (value, { req, path, location }: Meta) => {
    if (actionFor({ req, path, location }) == "deactivate") {
      return true;
    } else {
      const samityInfoService = Container.get(SamityInfoServices);
      const samityInformation: any = await samityInfoService.get({
        id: req.body.samityId,
      });

      if (samityInformation[0].samityLevel == "P") {
        if (!value) {
          throw new BadRequestError("মাতার নাম লিখুন");
        } else if (value.length > 50 || value.length < 1) {
          throw new BadRequestError("মাতার নাম ১ থেকে ৫০ অক্ষরের মধ্যে হতে হবে");
        } else {
          return true;
        }
      } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
        return true;
      }
    }
  })
  .trim()
  .bail(),
  body("data.membersInfo.*.mobile").custom(async (value, { req, path, location }: Meta) => {
    const index = path.split(".")[1]; //members[0]
  const memberNameBangla: any = get(req.body, `data.${index}.memberNameBangla`);
    if (actionFor({ req, path, location }) == "deactivate") {
      return true;
    } else {
      const samityInfoService = Container.get(SamityInfoServices);
      const samityInformation: any = await samityInfoService.get({
        id: req.body.samityId,
      });

      if (samityInformation[0].samityLevel == "P") {
        if (!value) {
          throw new BadRequestError(`${memberNameBangla} এর মোবাইল নম্বর লিখুন`);
        } else if (value.length !== 11) {
          console.log({mob: value.length})
          throw new BadRequestError(`${memberNameBangla} এর মোবাইল নম্বর ১১ অক্ষর হতে হবে`);
        } else {
          return true;
        }
      } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
        return true;
      }
    }
  })
  .trim()
  .bail(),
  body("data.membersInfo.*.genderId")
    .custom(async (value, { req, path, location }: Meta) => {
      if (actionFor({ req, path, location }) == "deactivate") {
        return true;
      } else {
        const samityInfoService = Container.get(SamityInfoServices);
        const samityInformation: any = await samityInfoService.get({
          id: req.body.samityId,
        });

        if (samityInformation[0].samityLevel == "P") {
          if (!value) {
            throw new BadRequestError("লিঙ্গ নির্বাচন করুন");
          } else {
            return true;
          }
        } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
          return true;
        }
      }
    })
    .bail(),
  body("data.membersInfo.*.educationLevelId", "শিক্ষগত যোগ্যতা নির্বাচন করুন")
    .custom(async (value, { req, path, location }: Meta) => {
      if (actionFor({ req, path, location }) == "deactivate") {
        return true;
      } else {
        const samityInfoService = Container.get(SamityInfoServices);
        const samityInformation: any = await samityInfoService.get({
          id: req.body.samityId,
        });

        if (samityInformation[0].samityLevel == "P") {
          if (!value) {
            throw new BadRequestError("শিক্ষগত যোগ্যতা নির্বাচন করুন ");
          } else {
            const isEducationLevelExist: any = await isExistsByColumn(
              "id",
              "master.code_master",
              await pgConnect.getConnection("slave"),
              { id: value, code_type: "EDT" }
            );
            if (!isEducationLevelExist) {
              throw new BadRequestError("শিক্ষগত যোগ্যতা নির্বাচন করুন");
            } else {
              return true;
            }
          }
        } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
          return true;
        }
      }
    })
    .trim()
    .bail(),
  body("data.membersInfo.*.religionId")
    .custom(async (value, { req }) => {
      const samityInfoService = Container.get(SamityInfoServices);
      const samityInformation: any = await samityInfoService.get({
        id: req.body.samityId,
      });

      if (samityInformation[0].samityLevel == "P") {
        const isReligionIdExist: any = await isExistsByColumn(
          "id",
          "master.code_master",
          await pgConnect.getConnection("slave"),
          { id: value, code_type: "REL" }
        );

        return isReligionIdExist ? true : Promise.reject();
      } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
        return true;
      }
    })
    .withMessage("ধর্ম নির্বাচন করুন")
    .trim(),
  body("data.membersInfo.*.maritalStatusId", "বৈবাহিক অবস্থা নির্বাচন করুন ")
    .custom(async (value, { req, path, location }: Meta) => {
      if (actionFor({ req, path, location }) == "deactivate") {
        return true;
      } else {
        const samityInfoService = Container.get(SamityInfoServices);
        const samityInformation: any = await samityInfoService.get({
          id: req.body.samityId,
        });

        if (samityInformation[0].samityLevel == "P") {
          if (!value) {
            throw new BadRequestError("বৈবাহিক অবস্থা নির্বাচন করুন ");
          } else {
            return true;
          }
        } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
          return true;
        }
      }
    })
    .bail()
    .trim(),
  body("data.membersInfo.*.occupationId", "পেশা নির্বাচন করুন")
    .custom(async (value, { req, path, location }: Meta) => {
      if (actionFor({ req, path, location }) == "deactivate") {
        return true;
      } else {
        const samityInfoService = Container.get(SamityInfoServices);
        const samityInformation: any = await samityInfoService.get({
          id: req.body.samityId,
        });

        if (samityInformation[0].samityLevel == "P") {
          if (!value) {
            throw new BadRequestError("পেশা নির্বাচন করুন ");
          } else {
            const isOccupationIdExist: Boolean = await isExistsByColumn(
              "id",
              "master.code_master",
              await pgConnect.getConnection("slave"),
              { id: value, code_type: "OCC" }
            );

            if (!isOccupationIdExist) {
              throw new BadRequestError("পেশা নির্বাচন করুন");
            } else {
              return true;
            }
          }
        } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
          return true;
        }
      }
    })
    .bail()
    .trim(),

  body("data.membersInfo.*.permanentAddress").custom(async (value, { req, path, location }: Meta) => {
    const index = path.split(".")[1];
    const memberDataFrom = get(req.body, `data.${index}.memberDataFrom`);
    if (actionFor({ req, path, location }) == "deactivate" || memberDataFrom == "csv") {
      return true;
    } else {
      const samityInfoService = Container.get(SamityInfoServices);
      const samityInformation: any = await samityInfoService.get({
        id: req.body.samityId,
      });

      if (samityInformation[0].samityLevel == "P") {
        if (!value) {
          throw new BadRequestError("স্থায়ী ঠিকানা লিখুন ");
        } else {
          return true;
        }
      } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
        return true;
      }
    }
  }),

  body("data.membersInfo.*.permanentAddress.districtId", "স্থায়ী ঠিকানার জেলা নির্বাচন করুন ").custom(
    async (value, { req, path, location }: Meta) => {
      const index = path.split(".")[1];
      const memberDataFrom = get(req.body, `data.${index}.memberDataFrom`);
      if (actionFor({ req, path, location }) == "deactivate" || memberDataFrom == "csv") {
        return true;
      } else {
        const samityInfoService = Container.get(SamityInfoServices);
        const samityInformation: any = await samityInfoService.get({
          id: req.body.samityId,
        });

        if (samityInformation[0].samityLevel == "P") {
          if (!value) {
            throw new BadRequestError("স্থায়ী ঠিকানার জেলা নির্বাচন করুন ");
          } else {
            const isDistrictIdExist = await isExistsByColumn(
              "id",
              "master.district_info",
              await pgConnect.getConnection("slave"),
              { id: value }
            );
            if (!isDistrictIdExist) {
              throw new BadRequestError("স্থায়ী ঠিকানার জেলা নির্বাচন করুন");
            } else {
              return true;
            }
          }
        } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
          return true;
        }
      }
    }
  ),
  body("data.membersInfo.*.permanentAddress.upaCityId", "স্থায়ী ঠিকানার উপজেলা/সিটি কর্পোরেশন নির্বাচন করুন").custom(
    async (value, { req, path, location }: Meta) => {
      const index = path.split(".")[1];
      const memberDataFrom = get(req.body, `data.${index}.memberDataFrom`);
      if (actionFor({ req, path, location }) == "deactivate" || memberDataFrom == "csv") {
        return true;
      } else {
        const samityInfoService = Container.get(SamityInfoServices);
        const samityInformation: any = await samityInfoService.get({
          id: req.body.samityId,
        });

        if (samityInformation[0].samityLevel == "P") {
          if (!value) {
            throw new BadRequestError("স্থায়ী ঠিকানার উপজেলা/সিটি কর্পোরেশন নির্বাচন করুন ");
          } else {
            const isUpaCityIdExist = await isExistsByColumn(
              "upa_city_id",
              "master.mv_upazila_city_info",
              await pgConnect.getConnection("slave"),
              { upaCityId: value }
            );
            if (!isUpaCityIdExist) {
              throw new BadRequestError("স্থায়ী ঠিকানার উপজেলা/সিটি কর্পোরেশন নির্বাচন করুন");
            } else {
              return true;
            }
          }
        } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
          return true;
        }
      }
    }
  ),
  body("data.membersInfo.*.permanentAddress.upaCityType", "invalid upaCityType").custom(
    async (value, { req, path, location }: Meta) => {
      const index = path.split(".")[1];
      const memberDataFrom = get(req.body, `data.${index}.memberDataFrom`);
      if (actionFor({ req, path, location }) == "deactivate" || memberDataFrom == "csv") {
        return true;
      } else {
        const samityInfoService = Container.get(SamityInfoServices);
        const samityInformation: any = await samityInfoService.get({
          id: req.body.samityId,
        });

        if (samityInformation[0].samityLevel == "P") {
          if (!value) {
            throw new BadRequestError("invalid upaCityType ");
          } else if (!["UPA", "CITY"].includes(value)) {
            throw new BadRequestError("invalid upaCityType ");
          } else {
            return true;
          }
        } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
          return true;
        }
      }
    }
  ),

  body("data.membersInfo.*.permanentAddress.uniThanaPawId", "স্থায়ী ঠিকানার ইউনিয়ন/থানা/পৌরসভা নির্বাচন করুন").custom(
    async (value, { req, path, location }: Meta) => {
      const index = path.split(".")[1];
      const memberDataFrom = get(req.body, `data.${index}.memberDataFrom`);
      if (actionFor({ req, path, location }) == "deactivate" || memberDataFrom == "csv") {
        return true;
      } else {
        const samityInfoService = Container.get(SamityInfoServices);
        const samityInformation: any = await samityInfoService.get({
          id: req.body.samityId,
        });

        if (samityInformation[0].samityLevel == "P") {
          if (!value) {
            throw new BadRequestError("স্থায়ী ঠিকানার ইউনিয়ন/থানা/পৌরসভা নির্বাচন করুন");
          } else {
            const isUniThanaPawIdExist = await isExistsByColumn(
              "uni_thana_paw_id",
              "master.mv_union_thana_paurasabha_info",
              await pgConnect.getConnection("slave"),
              { uniThanaPawId: value }
            );
            if (!isUniThanaPawIdExist) {
              throw new BadRequestError("স্থায়ী ঠিকানার ইউনিয়ন/থানা/পৌরসভা নির্বাচন করুন");
            } else {
              return true;
            }
          }
        } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
          return true;
        }
      }
    }
  ),

  body("data.membersInfo.*.permanentAddress.uniThanaPawType", "invalid uniThanaPawType").custom(
    async (value, { req, path, location }: Meta) => {
      const index = path.split(".")[1];
      const memberDataFrom = get(req.body, `data.${index}.memberDataFrom`);
      if (actionFor({ req, path, location }) == "deactivate" || memberDataFrom == "csv") {
        return true;
      } else {
        const samityInfoService = Container.get(SamityInfoServices);
        const samityInformation: any = await samityInfoService.get({
          id: req.body.samityId,
        });

        if (samityInformation[0].samityLevel == "P") {
          if (!value) {
            throw new BadRequestError("invalid uniThanaPawType ");
          } else if (!["UNI", "THANA", "PAW"].includes(value)) {
            throw new BadRequestError("invalid uniThanaPawType");
          } else {
            return true;
          }
        } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
          return true;
        }
      }
    }
  ),
  body("data.membersInfo.*.permanentAddress.detailsAddress", "invalid DetailsAddress")
    .custom(async (value, { req, path, location }: Meta) => {
      const index = path.split(".")[1];
      const memberDataFrom = get(req.body, `data.${index}.memberDataFrom`);
      if (actionFor({ req, path, location }) == "deactivate" || memberDataFrom == "csv") {
        return true;
      } else {
        const samityInfoService = Container.get(SamityInfoServices);
        const samityInformation: any = await samityInfoService.get({
          id: req.body.samityId,
        });

        if (samityInformation[0].samityLevel == "P") {
          if (!value) {
            throw new BadRequestError("স্থায়ী ঠিকানার বিস্তারিত ঠিকানা লিখুন");
          } else if (value.length > 256 || value.length < 1) {
            throw new BadRequestError("স্থায়ী ঠিকানার বিস্তারিত ঠিকানা ১ থেকে ২৫৬ অক্ষরের মধ্যে হতে হবে");
          } else {
            return true;
          }
        } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
          return true;
        }
      }
    })
    .optional(),

  body("data.membersInfo.*.presentAddress")
    .custom(async (value, { req, path, location }: Meta) => {
      const index = path.split(".")[1];
      const memberDataFrom = get(req.body, `data.${index}.memberDataFrom`);
      if (actionFor({ req, path, location }) == "deactivate" || memberDataFrom == "csv") {
        return true;
      } else {
        const samityInfoService = Container.get(SamityInfoServices);
        const samityInformation: any = await samityInfoService.get({
          id: req.body.samityId,
        });

        if (samityInformation[0].samityLevel == "P") {
          if (!value) {
            throw new BadRequestError("বর্তমান ঠিকানা লিখুন");
          } else {
            return true;
          }
        } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
          return true;
        }
      }
    })
    .bail(),
  body("data.membersInfo.*.presentAddress.districtId", "বর্তমান ঠিকানার জেলা নির্বাচন করুন ").custom(
    async (value, { req, path, location }: Meta) => {
      const index = path.split(".")[1];
      const memberDataFrom = get(req.body, `data.${index}.memberDataFrom`);
      if (actionFor({ req, path, location }) == "deactivate" || memberDataFrom == "csv") {
        return true;
      } else {
        const samityInfoService = Container.get(SamityInfoServices);
        const samityInformation: any = await samityInfoService.get({
          id: req.body.samityId,
        });

        if (samityInformation[0].samityLevel == "P") {
          const isDistrictIdExist = await isExistsByColumn(
            "id",
            "master.district_info",
            await pgConnect.getConnection("slave"),
            { id: value }
          );
          if (!isDistrictIdExist) {
            throw new BadRequestError("বর্তমান ঠিকানার জেলা নির্বাচন করুন");
          } else {
            return true;
          }
        } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
          return true;
        }
      }
    }
  ),

  body("data.membersInfo.*.presentAddress.upaCityId", "বর্তমান ঠিকানার উপজেলা/সিটি কর্পোরেশন নির্বাচন করুন").custom(
    async (value, { req, path, location }: Meta) => {
      const index = path.split(".")[1];
      const memberDataFrom = get(req.body, `data.${index}.memberDataFrom`);
      if (actionFor({ req, path, location }) == "deactivate" || memberDataFrom == "csv") {
        return true;
      } else {
        const samityInfoService = Container.get(SamityInfoServices);
        const samityInformation: any = await samityInfoService.get({
          id: req.body.samityId,
        });

        if (samityInformation[0].samityLevel == "P") {
          const isUpaCityIdExist = await isExistsByColumn(
            "upa_city_id",
            "master.mv_upazila_city_info",
            await pgConnect.getConnection("slave"),
            { upaCityId: value }
          );
          if (!isUpaCityIdExist) {
            throw new BadRequestError("বর্তমান ঠিকানার উপজেলা/সিটি কর্পোরেশন নির্বাচন করুন");
          } else {
            return true;
          }
        } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
          return true;
        }
      }
    }
  ),
  body("data.membersInfo.*.presentAddress.upaCityType", "invalid upaCityType").custom(
    async (value, { req, path, location }: Meta) => {
      const index = path.split(".")[1];
      const memberDataFrom = get(req.body, `data.${index}.memberDataFrom`);
      if (actionFor({ req, path, location }) == "deactivate" || memberDataFrom == "csv") {
        return true;
      } else {
        const samityInfoService = Container.get(SamityInfoServices);
        const samityInformation: any = await samityInfoService.get({
          id: req.body.samityId,
        });

        if (samityInformation[0].samityLevel == "P") {
          if (!value) {
            throw new BadRequestError("invalid upaCityType ");
          } else if (!["UPA", "CITY"].includes(value)) {
            throw new BadRequestError("invalid upaCityType ");
          } else {
            return true;
          }
        } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
          return true;
        }
      }
    }
  ),

  body("data.membersInfo.*.presentAddress.uniThanaPawId", "বর্তমান ঠিকানার ইউনিয়ন/থানা/পৌরসভা নির্বাচন করুন").custom(
    async (value, { req, path, location }: Meta) => {
      const index = path.split(".")[1];
      const memberDataFrom = get(req.body, `data.${index}.memberDataFrom`);
      if (actionFor({ req, path, location }) == "deactivate" || memberDataFrom == "csv") {
        return true;
      } else {
        const samityInfoService = Container.get(SamityInfoServices);
        const samityInformation: any = await samityInfoService.get({
          id: req.body.samityId,
        });

        if (samityInformation[0].samityLevel == "P") {
          const isUniThanaPawIdExist = await isExistsByColumn(
            "uni_thana_paw_id",
            "master.mv_union_thana_paurasabha_info",
            await pgConnect.getConnection("slave"),
            { uniThanaPawId: value }
          );
          if (!isUniThanaPawIdExist) {
            throw new BadRequestError("বর্তমান ঠিকানার ইউনিয়ন/থানা/পৌরসভা নির্বাচন করুন");
          } else {
            return true;
          }
        } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
          return true;
        }
      }
    }
  ),

  body("data.membersInfo.*.presentAddress.uniThanaPawType", "invalid uniThanaPawType").custom(
    async (value, { req, path, location }: Meta) => {
      const index = path.split(".")[1];
      const memberDataFrom = get(req.body, `data.${index}.memberDataFrom`);
      if (actionFor({ req, path, location }) == "deactivate" || memberDataFrom == "csv") {
        return true;
      } else {
        const samityInfoService = Container.get(SamityInfoServices);
        const samityInformation: any = await samityInfoService.get({
          id: req.body.samityId,
        });

        if (samityInformation[0].samityLevel == "P") {
          if (!value) {
            throw new BadRequestError("invalid uniThanaPawType");
          } else {
            if (!value) {
              throw new BadRequestError("invalid uniThanaPawType ");
            } else if (!["UNI", "THANA", "PAW"].includes(value)) {
              throw new BadRequestError("invalid upaCityType ");
            } else {
              return true;
            }
          }
        } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
          return true;
        }
      }
    }
  ),
  body("data.membersInfo.*.presentAddress.detailsAddress", "invalid DetailsAddress")
    .custom((value, { req, path, location }: Meta) => {
      const index = path.split(".")[1];
      const memberDataFrom = get(req.body, `data.${index}.memberDataFrom`);
      if (actionFor({ req, path, location }) == "deactivate" || memberDataFrom == "csv") {
        return true;
      } else {
        if (!value) {
          throw new BadRequestError("স্থায়ী ঠিকানার বিস্তারিত ঠিকানা লিখুন");
        } else if (value.length > 256 || value.length < 1) {
          throw new BadRequestError("স্থায়ী ঠিকানার বিস্তারিত ঠিকানা ১ থেকে ২৫৬  অক্ষরের মধ্যে হতে হবে");
        } else {
          return true;
        }
      }
    })
    .optional(),

  body("data.membersInfo.*.refSamityId", "সদস্য সমিতি নির্বাচন করুন")
    .custom(async (value, { req, path, location }: Meta) => {
      if (actionFor({ req, path, location }) == "deactivate") {
        return true;
      } else {
        const samityInfoService = Container.get(SamityInfoServices);
        const samityInformation: any = await samityInfoService.get({
          id: req.body.samityId,
        });
        if (samityInformation[0].samityLevel == "P") {
          return true;
        } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
          if (!value) {
            throw new BadRequestError("সদস্য সমিতি নির্বাচন করুন");
          } else {
            const isRefIdExist: any = await isExistsByColumn(
              "id",
              "coop.samity_info",
              await pgConnect.getConnection("slave"),
              { id: value }
            );
            return isRefIdExist ? true : Promise.reject();
          }
        }
      }
    })
    .withMessage("সদস্য সমিতিটি ডাটাবেস এ মজুদ নেই "),

  body("data.membersInfo.*.memberAdmissionDate").custom(async (value, { req, path, location }: Meta) => {
    if (actionFor({ req, path, location }) == "deactivate") {
      return true;
    } else {
      const samityInfoService = Container.get(SamityInfoServices);
      const samityInformation: any = await samityInfoService.get({
        id: req.body.samityId,
      });
      if (samityInformation[0].samityLevel == "P") {
        return true;
      } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
        if (!value) {
          throw new BadRequestError("সদস্য ভুক্তির তারিখ নির্বাচন করুন ");
        } else if (!isDateFormateValid(value)) {
          throw new BadRequestError("সদস্য ভুক্তির তারিখ নির্বাচন করুন ");
        } else {
          return true;
        }
      }
    }
  }),
  body("data.membersInfo.*.address").custom(async (value, { req, path, location }: Meta) => {
    if (actionFor({ req, path, location }) == "deactivate") {
      return true;
    } else {
      const samityInfoService = Container.get(SamityInfoServices);
      const samityInformation: any = await samityInfoService.get({
        id: req.body.samityId,
      });
      if (samityInformation[0].samityLevel == "P") {
        return true;
      } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
        if (!value) {
          throw new BadRequestError("ঠিকানা দেয়া হয়নি  ");
        } else if (value.length < 0 || value.length > 256) {
          throw new BadRequestError("ঠিকানা  ১ থেকে ২৫৬  অক্ষরের মধ্যে হতে হবে  ");
        } else {
          return true;
        }
      }
    }
  }),
  body("data.membersInfo.*.samitySignatoryPerson").custom(async (value, { req, path, location }: Meta) => {
    if (actionFor({ req, path, location }) == "deactivate") {
      return true;
    } else {
      const samityInfoService = Container.get(SamityInfoServices);
      const samityInformation: any = await samityInfoService.get({
        id: req.body.samityId,
      });
      if (samityInformation[0].samityLevel == "P") {
        return true;
      } else if (samityInformation[0].samityLevel == "C" || samityInformation[0].samityLevel == "N") {
        if (!value) {
          throw new BadRequestError("সমিতির যোগাযোগের ব্যাক্তির নাম লিখুন");
        } else if (value.length < 0 || value.length > 50) {
          throw new BadRequestError("সমিতির যোগাযোগের ব্যাক্তির নাম ১ থেকে ৫০  অক্ষরের মধ্যে হতে হবে  ");
        } else {
          return true;
        }
      }
    }
  }),

  body("data.membersInfo.*.actionFor")
    .exists()
    .withMessage("actionFor is not present in payload")
    .isIn(["create", "update", "deactivate"])
    .withMessage("Enter valid action "),

  body("data.membersInfo.*.documents").custom(async (value, { req, path, location }: Meta) => {
    const index = path.split(".")[1];
    const memberDataFrom = get(req.body, `data.${index}.memberDataFrom`);
    const isManual = get(req.body, `data.isManual`);
    if (actionFor({ req, path, location }) == "deactivate" || memberDataFrom == "csv") {
      return true;
    } else {
      if (isManual) {
        return true;
      } else {
        const MemberInfoService = Container.get(MemberInfoServices);
        const requiredDocument: any = await MemberInfoService.getRequiredDocument(
          req.body.data.membersInfo[0].samityId
        );
        if (requiredDocument && requiredDocument?.length > 0) {
          const docIds = requiredDocument.map((e: any) => e.docId);
          if (value.length <= 0) {
            throw new BadRequestError("প্রয়োজনীয় ডকুমেন্ট প্রদান করুন ");
          } else {
            for (const element of value) {
              if (!docIds.includes(element.docId)) {
                throw new BadRequestError("প্রয়োজনীয় ডকুমেন্ট প্রদান করুন ");
              } else {
                return true;
              }
            }
          }
        }
      }
    }
  }),
];

function isExistField(value: string, type: string) {
  const jsonAddress = value;
  const addressKey = Object.keys(jsonAddress);

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

const actionFor = ({ req, path }: Meta) => {
  const index = path.split(".")[1];
  return get(req.body, `data.${index}.actionFor`);
};
