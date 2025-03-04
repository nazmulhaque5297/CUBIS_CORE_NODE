import { body } from "express-validator";
import { isExistsByColumn } from "rdcd-common";
import { getComponentId } from "../../../configs/app.config";
import db from "../../../db/connection.db";
import { ComponentType } from "./../../../interfaces/component.interface";

export const userRoleValidates = [
  body("userId")
    .exists()
    .withMessage("পেলোড এ ইউজার আইডি পাওয়া যায়নি")
    .notEmpty()
    .withMessage("পেলোড এ ইউজার আইডি পাওয়া যায়নি")
    .custom(async (value) => {
      const isUserIdExist = await isExistsByColumn("id", "users.user", await db.getConnection("slave"), { id: value });

      return isUserIdExist ? true : Promise.reject();
    })
    .withMessage("ইউজার পাওয়া যায়নি"),
  body("roleId")
    .exists()
    .withMessage("পেলোড এ রোল আইডি  পাওয়া যায়নি")
    .notEmpty()
    .withMessage("পেলোড এ রোল আইডি পাওয়া যায়নি")
    .custom(async (value, { req }) => {
      const componentId = getComponentId(req.params!.component as ComponentType);
      const isRoleExist = await isExistsByColumn("id", "users.role", await db.getConnection("slave"), {
        id: value,
        component_id: componentId,
      });
      return isRoleExist ? true : Promise.reject();
    })
    .withMessage("রোল পাওয়া যায়নি")
    .custom(async (value, { req }) => {
      const isRoleExistInUserRole = await isExistsByColumn("id", "users.user_role", await db.getConnection("slave"), {
        roleId: value,
        userId: req.body.userId,
      });
      return isRoleExistInUserRole ? Promise.reject() : true;
    })
    .withMessage("ইউজারে রোলটি বরাদ্দ রয়েছে "),
  body("status")
    .exists()
    .withMessage("পেলোড এ স্টেটাস  পাওয়া যায়নি")
    .notEmpty()
    .withMessage("পেলোড এ স্টেটাস পাওয়া যায়নি")
    .isString()
    .isIn(["A", "P", "C", "R"])
    .withMessage("status must be in A,P or C"),
];
