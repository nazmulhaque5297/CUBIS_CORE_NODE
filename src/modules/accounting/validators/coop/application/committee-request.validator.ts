import { body, Meta } from "express-validator";
import { get, uniq } from "lodash";
import { BadRequestError, isExistsByColumn } from "rdcd-common";
import Container from "typedi";
import { pgConnect } from "../../../../../../db-coop/factory/connection.db";
import { CommitteeRequestServices } from "../../../../../../modules/coop/coop/services/committee-request.service";
import ServiceInfoServices from "../../../../../../modules/coop/coop/services/service-info.service";
import { isDateFormateValid } from "../../../../../../validators/checkDateFormate.validator";
import { CommitteeRoleServices } from "../../../services/committee-role.service";

const CommitteeRoleService = Container.get(CommitteeRoleServices);

const samityIdValidate = [
  body("samityId").custom(async (value, { req }) => {
    const CommitteeRequestService = Container.get(CommitteeRequestServices);
    const ServiceInfoService = Container.get(ServiceInfoServices);
    const serviceId = await ServiceInfoService.getServiceByNameAndDoptor(req.body.serviceName, req.user.doptorId);

    const isSamityExistOnApplication = await CommitteeRequestService.isSamityExistOnApplication(
      value,
      serviceId,
      "post",
      null
    );
    if (isSamityExistOnApplication.isExist) {
      throw new BadRequestError(isSamityExistOnApplication.message);
    } else if (!isSamityExistOnApplication.isExist) {
      return true;
    }
  }),
];

//when serviceId 9 then it checks that is there any electedCommitteeOrNot
const isCommitteeApplicationValid = [
  body()
    .custom(async (value, { req }) => {
      const ServiceInfoService = Container.get(ServiceInfoServices);
      const serviceId = await ServiceInfoService.getServiceByNameAndDoptor(value.serviceName, req.user.doptorId);

      //console.log("serviceIdserviceId", serviceId);
      if (serviceId == 9) {
        const isElectedCommitteeExistOrNot = await isExistsByColumn(
          "id",
          "coop.committee_info",
          await pgConnect.getConnection("slave"),
          {
            committee_type: "E",
            samityId: value.samityId,
          }
        );

        const isSelectedCommitteeExistOrNot = await isExistsByColumn(
          "id",
          "coop.committee_info",
          await pgConnect.getConnection("slave"),
          {
            committee_type: "S",
            samityId: value.samityId,
          }
        );

        return isElectedCommitteeExistOrNot || isSelectedCommitteeExistOrNot ? Promise.reject() : true;
      } else {
        return true;
      }
    })
    .withMessage("সমিতিটির জন্য নিয়োগকৃত প্রথম কমিটি রয়েছে "),
];

const samityIdValidateUpdate = [
  body("samityId").custom(async (value, { req }) => {
    const CommitteeRequestService = Container.get(CommitteeRequestServices);
    const ServiceInfoService = Container.get(ServiceInfoServices);
    const serviceId = await ServiceInfoService.getServiceByNameAndDoptor(req.body.serviceName, req.user.doptorId);

    //@ts-ignore
    const applicationId = parseInt(req.params.id);
    const isSamityExistOnApplication = await CommitteeRequestService.isSamityExistOnApplication(
      value,
      serviceId,
      "update",
      applicationId
    );
    if (isSamityExistOnApplication.isExist) {
      throw new BadRequestError(isSamityExistOnApplication.message);
    } else if (!isSamityExistOnApplication.isExist) {
      return true;
    }
  }),
];
const committeeRequestValidate = [
  body("data.committeeType")
    .exists()
    .withMessage("কমিটি টাইপ প্রদান করুন")
    .notEmpty()
    .withMessage("কমিটি টাইপ শূন্য হতে পারে না")
    .isIn([3, 4, 5, 9])
    .withMessage("কমিটি টাইপ বিদ্যমান নেই"),
  // body("data.meetingDate")
  // .custom((value, { req }) => {
  //   if (req.body.data.committeeType == 4) {
  //     return true;
  //   } else {
  //     if (!value) {
  //       return false;
  //     } else if (value && !isDateFormateValid(value)) {
  //       return false;
  //     } else {
  //       return true;
  //     }
  //   }
  // })
  // .withMessage("সভার তারিখ নির্বাচন করুন")
  // .bail(),

  // body("data.effectDate")
  //   .exists()
  //   .withMessage("মেয়াদ শুরুর তারিখ নির্বাচন করুন")
  //   .bail()
  //   .optional()
  //   .custom((value) => {
  //     return isDateFormateValid(value);
  //   })
  //   .withMessage("মেয়াদ শুরুর তারিখ নির্বাচন করুন "),
  // body("data.expireDate")
  //   .exists()
  //   .withMessage("মেয়াদ শেষের তারিখ নির্বাচন করুন")
  //   .bail()
  //   .optional()
  //   .custom((value) => {
  //     return isDateFormateValid(value);
  //   })
  //   .withMessage("মেয়াদ শেষের তারিখ নির্বাচন করুন"),
  // body("data.electionDate")
  //   .exists()
  //   .withMessage("নির্বাচনের তারিখ নির্বাচন করুন")
  //   .bail()
  //   .optional()
  //   .custom((value) => {
  //     return isDateFormateValid(value);
  //   })
  //   .withMessage("নির্বাচনের তারিখ নির্বাচন করুন"),
  body("data.members")
    .exists()
    .withMessage("অবশ্যই নুন্যতম সদস্য প্রদান করুন")
    .isArray({ min: 1 })
    .withMessage("অবশ্যই নুন্যতম সদস্য সংযুক্ত করুন")
    .custom(async (members: Array<any>) => {
      const roleIds = uniq(members.map((member) => member.roleId));
      const checkMembers = await CommitteeRoleService.checkByUniqueRoleRank(roleIds, 1);
      if (checkMembers) {
        return Promise.reject();
      }
    })
    .withMessage("একই কমিটিতে সভাপতি, চেয়ারম্যান  এবং ম্যানেজার একত্রে বিদ্যমান থাকতে পারবে না ")
    .custom((value) => {
      const isFielsAreValid = memberInfoKeyCheck(value);
      return isFielsAreValid;
    }),
  body("data.members.*.roleId")
    .exists()
    .withMessage("পদবী প্রদান করুন")
    .bail()
    .notEmpty()
    .withMessage("পদবী শূন্য হতে পারবে না")
    .bail()
    .isInt({ min: 1 })
    .withMessage("পদবী সংখ্যিক বা ০ বড় হতে হবে")
    .custom(async (value: any) => {
      const roleId = Number(value);
      if (!(await CommitteeRoleService.idCheck(roleId))) {
        return Promise.reject();
      }
    })
    .withMessage("পদবী বিদ্যমান নেই"),

  body("data.members.*.memberName")
    .if((value: any, { req, path, location }: Meta) => !isMember({ req, path, location }))
    .exists()
    .withMessage("সদস্যের নাম প্রদান করুন")
    .bail()
    .notEmpty()
    .withMessage("সদস্যের নাম ফাকা হতে পারবে না")
    .bail(),
  body("data.members.*.mobileNumber")
    .if((value: any, { req, path, location }: Meta) => !isMember({ req, path, location }))
    .exists()
    .withMessage("মোবাইল নাম্বার প্রদান করুন")
    .bail()
    .notEmpty()
    .withMessage("মোবাইল নাম্বার ফাকা হতে পারবে না")
    .bail(),
  body("data.members.*.memberDob", "invalid Date of birth ")
    .custom((value, { req, path }) => {
      if (value && !isDateFormateValid(value)) {
        const index = path.split(".")[1];
        const nameOfTheMember = get(req.body.data, `${index}.memberName`);

        throw new BadRequestError(`সদস্য ${nameOfTheMember} এর জন্ম তারিখ দিন `);
      } else {
        return true;
      }
    })
    .optional(),

  body("data.documents").custom((value: any) => {
    if (value.length == 0) {
      throw new BadRequestError("প্রয়োজনীয় ডকুমেন্ট সংযুক্ত করুন ");
    }
    if (value.length > 0) {
      const duplicatedObj = value.find((e: any, i: number, self: any) => {
        return self.find((el: any, index: number) => el.documentId === e.documentId && i !== index);
      });

      if (duplicatedObj?.documentId) {
        throw new BadRequestError(`${duplicatedObj.documentNameBangla} ডকুমেন্ট একাধিকবার রয়েছে  `);
      } else {
        return true;
      }
    }
  }),
];
export const committeeRequest = [...isCommitteeApplicationValid, ...samityIdValidate, ...committeeRequestValidate];

export const committeeRequestUpdate = [
  ...isCommitteeApplicationValid,
  ...samityIdValidateUpdate,
  ...committeeRequestValidate,
];

//get index from path data.members[0].memberId
const isMember = ({ req, path }: Meta) => {
  const index = path.split(".")[1]; //members[0]
  return !!get(req.body, `data.${index}.isMember`) as boolean;
};

const memberInfoKeyCheck = (memberInfo: any) => {
  const key = [
    "roleId",
    "isMember",
    "memberId",
    "memberName",
    "memberNid",
    "mobileNumber",
    "memberDob",
    "status",
    "orgName",
    "roleRank",
  ];
  for (const element of memberInfo) {
    const keys = Object.keys(element);
    for (const e of keys) {
      if (!key.includes(e)) {
        throw new BadRequestError(`${e} টি members তে দিতে পারবেন না `);
      }
    }
  }

  return true;
};
