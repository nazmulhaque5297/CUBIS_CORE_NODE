import { param } from "express-validator";
import { isExistsByColumn } from "rdcd-common";
import Container from "typedi";
import { pgConnect } from "../../../../../db-coop/factory/connection.db";
import { MemberInfoServices } from "../../services/coop/member-info.service";

export const ValidMemberDeactivation = [
  param("id")
    .exists()
    .withMessage("id is not present in the query param")
    .notEmpty()
    .withMessage("id can not be null")
    .custom(async (value) => {
      const isIdExist = await isExistsByColumn("id", "coop.member_info", await pgConnect.getConnection("slave"), {
        id: value,
      });

      return isIdExist ? true : Promise.reject();
    })
    .withMessage("সদস্যের কোনো তথ্য পাওয়া যায়নি")
    .custom(async (value) => {
      const isIdExist = await isExistsByColumn(
        "id",
        "coop.member_financial_info",
        await pgConnect.getConnection("slave"),
        { member_id: value }
      );

      return isIdExist ? true : Promise.reject();
    })
    .withMessage("সদস্যের আর্থিক  তথ্যাদি  পাওয়া যায়নি ")
    .custom(async (value) => {
      const MemberInfoService = Container.get(MemberInfoServices);
      const isMemberEligibleForDeactivation = await MemberInfoService.isMemberEligibleForDeactivation(parseInt(value));

      return isMemberEligibleForDeactivation ? true : Promise.reject();
    })
    .withMessage("সদস্যের শেয়ার সংখ্যা,লোন এর পরিমান ০ এর চেয়ে বেশি  "),
];
