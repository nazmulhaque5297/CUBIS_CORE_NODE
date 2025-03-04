import { body, param } from "express-validator";
import { isExistsByColumn } from "rdcd-common";
import { pgConnect } from "../../../../db-coop/factory/connection.db";

export const validateGetSamityAuthorizer = [
  param("samityId")
    .exists()
    .withMessage("samityId is not present")
    .notEmpty()
    .withMessage("samityId can not be null")
    .custom(async (value) => {
      const isSamityExist = await isExistsByColumn("id", "coop.samity_info", await pgConnect.getConnection("slave"), {
        id: value,
      });
    })
    .withMessage("samity id is not present in database"),
];

export const validatePostSamityAuthorizer = [
  body("*.id")
    .exists()
    .withMessage("id is not present in the payload")
    .notEmpty()
    .withMessage("id can not be null")
    .custom(async (value) => {
      let isPass = false;
      if (value > 0) {
        const isIdExist = await isExistsByColumn(
          "id",
          "coop.samity_authorized_person",
          await pgConnect.getConnection("slave"),
          { id: value }
        );
        isIdExist ? (isPass = true) : (isPass = false);
      }

      if (value == 0) {
        isPass = true;
      }
      return isPass ? true : Promise.reject();
    })
    .withMessage("id is not valid"),

  body("*.samityId", "সমিতির নাম  নির্বাচন করুন ")
    .exists()
    .notEmpty()
    .custom(async (value, { req }) => {
      let isSamityIdExist;
      isSamityIdExist = await isExistsByColumn("id", "coop.samity_info", await pgConnect.getConnection("slave"), {
        id: value,
      });
      return isSamityIdExist ? true : Promise.reject();
    })
    .withMessage("samity id is not valid")
    .optional(),

  body("*.memberId", "নিয়োগকৃত সদস্য নির্বাচন করুন")
    .exists()
    .notEmpty()
    .isInt()
    .custom(async (value, { req }) => {
      let isMemberIdExist;
      //   if (req.body.id == 0) {
      isMemberIdExist = await isExistsByColumn("id", "coop.member_info", await pgConnect.getConnection("slave"), {
        id: value,
      });
      //   }

      return isMemberIdExist ? true : Promise.reject();
    })
    .withMessage("member id is not valid")
    .optional(),

  body("*.status", "invalid status")
    .exists()
    .notEmpty()
    .isIn([true, false])
    .withMessage("status must be true or false"),
];
