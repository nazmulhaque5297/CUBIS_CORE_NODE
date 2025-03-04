import { body, Meta, query } from "express-validator";
import { BadRequestError, isExistsByColumn } from "rdcd-common";
import Container from "typedi";
import { pgConnect } from "../../../../../db-coop/factory/connection.db";
import { CommitteeRoleServices } from "../../services/committee-role.service";
import { CommitteeInfoServices } from "../../services/coop/committee-info.service";

export const committeeMemberListValidation = [
  query("samityId", "samityId is Not present")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      const CommitteeInfoService = Container.get(CommitteeInfoServices);
      const isValid = await CommitteeInfoService.isSamityValidForCommitteeInformation(parseInt(value));
      return isValid ? true : Promise.reject();
    })
    .withMessage("সমিতিটির সাপেক্ষে কোনো কমিটি পাওয়া যায় নি"),
];

export const addCommitteeMemberValidation = [
  body("samityId")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      const isSamityExist = await isExistsByColumn("id", "coop.samity_info", await pgConnect.getConnection("slave"), {
        id: value,
      });
      return isSamityExist ? true : Promise.reject();
    })
    .withMessage("সমিতিটি পাওয়া যায়নি"),
  body("committeeId")
    .exists()
    .notEmpty()
    .custom(async (value: any, { req }: Meta) => {
      const isCommitteeExist = await isExistsByColumn(
        "id",
        "coop.committee_info",
        await pgConnect.getConnection("slave"),
        { id: value }
      );

      if (!isCommitteeExist) {
        throw new BadRequestError("কমিটি টি নিয়ে কোনো তথ্য পাওয়া যায়নি ");
      }

      const CommitteeInfoService = Container.get(CommitteeInfoServices);
      const isMemberAddable = await CommitteeInfoService.isMemberAddable(req.body.samityId, value);

      if (!isMemberAddable) {
        throw new BadRequestError(
          "কমিটিতে সদস্য সংখ্যা ও সক্রিয় সদস্য সংখ্যা একই, তাই কমিটিতে নতুন সদস্য যোগ করা যাবে না "
        );
      } else {
        return true;
      }
    }),
  body("committeeRoleId")
    .exists()
    .withMessage("রোল আইডি প্রদান করুন")
    .bail()
    .notEmpty()
    .withMessage("রোল আইডি শূন্য হতে পারবে না")
    .bail()
    .isInt({ min: 1 })
    .withMessage("রোল আইডি সংখ্যিক বা ০ বড় হতে হবে")
    .custom(async (value: any) => {
      const CommitteeRoleService = Container.get(CommitteeRoleServices);
      const roleId = Number(value);
      if (!(await CommitteeRoleService.idCheck(roleId))) {
        return Promise.reject();
      }
    })
    .withMessage("রোল আইডি বিদ্যমান নেই"),

  body("memberName")
    .exists()
    .withMessage("সদস্যের নাম প্রদান করুন")
    .bail()
    .notEmpty()
    .withMessage("সদস্যের নাম ফাকা হতে পারবে না")
    .bail(),
  // body("mobile")
  //   .exists()
  //   .withMessage("মোবাইল নাম্বার প্রদান করুন")
  //   .bail()
  //   .notEmpty()
  //   .withMessage("মোবাইল নাম্বার ফাকা হতে পারবে না")
  //   .bail(),
];
