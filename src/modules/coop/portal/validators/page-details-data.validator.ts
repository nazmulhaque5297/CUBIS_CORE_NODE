import { body, param } from "express-validator";
import { isExistsByColumn } from "rdcd-common";
import Container from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { PageDataServices } from "../services/page-data.service";

const PageDataService = Container.get(PageDataServices);

export const pageDataValidates = [
  body("pageId")
    .exists()
    .withMessage("পেইজ নাম নির্বাচন করুন")
    .notEmpty()
    .withMessage("পেইজ নাম নির্বাচন করুন")
    .custom(async (value) => {
      const isUserIdExist = await isExistsByColumn("id", "portal.page_info", await pgConnect.getConnection("slave"), {
        id: value,
      });

      return isUserIdExist ? true : Promise.reject();
    })
    .withMessage("পেইজটি বিদ্যমান রয়েছে"),

  body("contentId")
    .exists()
    .withMessage("কনটেন্ট নাম নির্বাচন করুন")
    .notEmpty()
    .withMessage("কনটেন্ট নাম নির্বাচন করুন")
    .custom(async (value, { req }) => {
      let isPostable;
      if (parseInt(value) == 0) {
        isPostable = true;
      } else {
        isPostable = await PageDataService.isPostable(parseInt(value), req.body.samityId);
      }

      return isPostable ? true : Promise.reject();
    })
    .withMessage("কনটেন্টটি বিদ্যমান রয়েছে "),

  body("pageId")
    .exists()
    .withMessage("পেইজ আইডি পেলোডে বিদ্যমান নেই")
    .custom(async (value, { req }) => {
      let result = true;
      if (parseInt(value) == 2) {
        const isPageIdExist = await isExistsByColumn(
          "id",
          "portal.page_details_data",
          await pgConnect.getConnection("slave"),
          { pageId: value, samityId: req.body.samityId }
        );
        isPageIdExist ? (result = false) : (result = true);
      }
      return result ? true : Promise.reject();
    })
    .withMessage("পেইজটি বিদ্যমান রয়েছে"),
];

export const pageDetailsDeleteValidator = [
  param("id")
    .exists()
    .withMessage("পেরাম বডিতে বিদ্যমান নেই")
    .notEmpty()
    .withMessage("পেলোডে বিদ্যমান নেই")
    .isInt({ min: 1 })
    .withMessage("অবশ্যই নম্বর হতে হবে")
    .custom(async (value) => {
      const isIdPresent = await isExistsByColumn(
        "id",
        "portal.page_details_data",
        await pgConnect.getConnection("slave"),
        { id: value }
      );

      return isIdPresent ? true : Promise.reject();
    })
    .withMessage("বাতিলকৃত ডাটাবেসে বিদ্যমান নেই"),
];

export const validationPathCommonData = [
  param("samityId")
    .custom(async (value) => {
      const isSamityExist = await isExistsByColumn("id", "portal.page_data", await pgConnect.getConnection("slave"), {
        samityId: value,
      });

      return isSamityExist ? true : Promise.reject();
    })
    .withMessage("সমিতিটি বিদ্যমান নেই"),

  body("commonData").exists().withMessage("কমন ডেটা পেলোডে বিদ্যমান নেই"),
];
