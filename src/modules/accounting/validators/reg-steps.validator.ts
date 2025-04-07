import { body, query } from "express-validator";
import { isExistsByColumn } from "rdcd-common";
import { pgConnect } from "../../../../db-coop/factory/connection.db";

export const validationRegsitrationSteps = [
  body().exists().withMessage("body is required"),
  body("samityId")
    .exists()
    .withMessage("samityId is required")
    .isInt({ min: 1 })
    .withMessage("samityId must be integer and greater than 0")
    .custom(async (value: any) => {
      const isSamityIdExist = await isExistsByColumn(
        "id",
        "temps.samity_info",
        await pgConnect.getConnection("slave"),
        {
          id: value,
        }
      );
      return isSamityIdExist ? Promise.resolve() : Promise.reject();
    })
    .withMessage("samityId does not exist In database")
    .custom(async (value: any, { req }) => {
      const isSamityExistWithCitizen = await isExistsByColumn(
        "samity_id",
        "temps.reg_steps",
        await pgConnect.getConnection("slave"),
        { samity_id: value, user_id: req.user.userId }
      );
      return isSamityExistWithCitizen ? Promise.reject() : Promise.resolve();
    })
    .withMessage("samityId already exist In regSteps"),
  body("samityName")
    .exists()
    .withMessage("samityName is required")
    .notEmpty()
    .withMessage("samityName cannot be empty"),
  body("status")
    .exists()
    .withMessage("status is required")
    .notEmpty()
    .withMessage("status cannot be empty")
    .isIn(["P", "C"])
    .withMessage("status must be P or C"),

  body("lastStep").exists().withMessage("lastStep is required").notEmpty().withMessage("lastStep cannot be empty"),
  body("url").exists().withMessage("url is required").notEmpty().withMessage("url cannot be empty"),
];

export const validationForCitizenGet = [query("status").optional().isIn(["P"]).withMessage("status must be P")];
