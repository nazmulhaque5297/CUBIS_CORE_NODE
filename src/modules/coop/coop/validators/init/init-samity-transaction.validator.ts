import { body, query } from "express-validator";
import { omit } from "lodash";
import { isExistsByColumn, isKeyExist } from "rdcd-common";
import { pgConnect } from "../../../../../db-coop/factory/connection.db";
import { keysOfTables } from "../../types/keys.type";

export const validatesamityTransaction = [
  body()
    .isArray({ min: 1 })
    .withMessage("জি.এল নাম নির্বাচন করুন")
    .custom((values: any) => {
      return isKeyExist(keysOfTables.samityTransactionKeys, values);
    })
    .withMessage("Body Req has an Invalid keys"),
  body("*.samityId", "সমিতি আইডি নির্বাচন করুন ")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      const isSamityExist = await isExistsByColumn("id", "temps.samity_info", await pgConnect.getConnection("slave"), {
        id: value,
      });

      return isSamityExist ? true : Promise.reject();
    })
    .withMessage("সমিতি টি সিস্টেম এ মজুদ নেই ")
    .trim(),
  body("*.glacId", "জিএল নির্বাচন করুন")
    .exists()
    .notEmpty()
    .isInt()

    .custom(async (value) => {
      const isGlacIdExist = await isExistsByColumn("id", "coop.glac_mst", await pgConnect.getConnection("slave"), {
        id: value,
      });
      return isGlacIdExist ? true : Promise.reject();
    })

    .trim(),
  body("*.incAmt", "আয় এর টাকার পরিমান লিখুন")
    .exists()
    .withMessage("Income Amount should exist")
    .notEmpty()
    .withMessage("আয় এর টাকার পরিমান লিখুন ")
    .isNumeric()
    .withMessage("আয় এর টাকা নম্বর এ সরবরাহ করুন ")
    .isLength({ min: 1, max: 10 })
    .withMessage("আয় এর টাকা ১০ টি অংকের বেশি হবে না ")
    .withMessage("আয় এর টাকার পরিমান পরিমান নম্বর হতে হবে")
    .custom((value, { req, path, location }) => {
      const orpCode = getValueFromPath(req.body, path.split(".")[0] + "orpCode");

      if (orpCode === "INC") {
        return value > 0 ? true : false;
      } else {
        return true;
      }
    })
    .withMessage("আয় এর টাকার পরিমান ০ চেয়ে বড় হতে হবে ")
    .trim(),
  body("*.expAmt", "ব্যয় এর টাকার পরিমান লিখুন ")
    .exists()
    .withMessage("Expense Amount should exist")
    .notEmpty()
    .withMessage("ব্যয় এর টাকার পরিমান লিখুন ")
    .isNumeric()
    .withMessage("ব্যয় এর টাকা নম্বর এ সরবরাহ করুন ")
    .isLength({ min: 1, max: 10 })
    .withMessage("ব্যয় এর টাকা ১০ টি অংকের বেশি হবে না ")
    .custom((value, { req, path }) => {
      const orpCode = getValueFromPath(req.body, path.split(".")[0] + "orpCode");
      if (orpCode === "EXP") {
        return value > 0 ? true : false;
      } else {
        return true;
      }
    })
    .withMessage("ব্যয় এর টাকার পরিমান ০ চেয়ে বড় হতে হবে "),

  body("*.financialYear", "সমিতির বাজেট বছর নির্বাচন করুন")
    .exists()
    .withMessage("financialYear is not Exist")
    .custom(async (value, { req, path }) => {
      const isIeBudget = getValueFromPath(req.body, path.split(".")[0] + "isIeBudget");
      if (isIeBudget === "B") {
        const isFinancialYearExist = await isExistsByColumn(
          "id",
          "coop.financial_year",
          await pgConnect.getConnection("slave"),
          { financial_year: value }
        );
        return isFinancialYearExist ? true : Promise.reject();
      } else {
        true;
      }
    })
    .trim(),
  body("*.orpCode", "Operation Code can not be null & Must be within EXP & INC")
    .exists()
    .notEmpty()
    .trim()
    .isLength({ max: 3 })
    .isIn(["INC", "EXP"]),
  body("*.isIeBudget", "Expense or Budget Amount can not be null And Must Be in B & E")
    .exists()
    .notEmpty()
    .trim()
    .isLength({ max: 1 })
    .isIn(["B", "E"]),
];

export const validatesamityTransactionUpdate = [
  body()
    .isArray({ min: 1 })
    .withMessage("জি.এল নাম নির্বাচন করুন")
    .custom((values: any) => {
      return isKeyExist(keysOfTables.samityTransactionKeys, values);
    })
    .withMessage("Body Req has an Invalid keys")
    .bail(),
  body("*.id", "Id can not be null").exists().notEmpty().trim(),
  body("*.samityId", "সমিতি আইডি নির্বাচন করুন ").exists().notEmpty().trim(),
  body("*.glacId", "জিএল নির্বাচন করুন").exists().notEmpty().isInt().trim(),
  body("*.incAmt", "আয় এর টাকার পরিমান লিখুন")
    .exists()
    .withMessage("Income Amount should exist")
    .notEmpty()
    .withMessage("আয় এর টাকার পরিমান লিখুন ")
    .isNumeric()
    .withMessage("আয় এর টাকার পরিমান পরিমান নম্বর হতে হবে")
    .custom((value, { req, path, location }) => {
      const orpCode = getValueFromPath(req.body, path.split(".")[0] + "orpCode");

      if (orpCode === "INC") {
        return value > 0 ? true : false;
      } else {
        return true;
      }
    })
    .withMessage("আয় এর টাকার পরিমান ০ চেয়ে বড় হতে হবে ")
    .trim(),
  body("*.expAmt", "ব্যয় এর টাকার পরিমান লিখুন ")
    .exists()
    .withMessage("Expense Amount should exist")
    .notEmpty()
    .withMessage("ব্যয় এর টাকার পরিমান লিখুন ")
    .isNumeric()
    .withMessage("ব্যয় এর টাকার পরিমান নম্বর হতে হবে")
    .custom((value, { req, path }) => {
      const orpCode = getValueFromPath(req.body, path.split(".")[0] + "orpCode");
      if (orpCode === "EXP") {
        return value > 0 ? true : false;
      } else {
        return true;
      }
    })
    .withMessage("ব্যয় এর টাকার পরিমান ০ চেয়ে বড় হতে হবে "),

  body("*.financialYear", "সমিতির বাজেট বছর নির্বাচন করুন").exists().withMessage("financialYear is not Exist").trim(),
  body("*.orpCode", "Operation Code can not be null & Must be within EXP & INC")
    .exists()
    .notEmpty()
    .trim()
    .isLength({ max: 3 })
    .isIn(["INC", "EXP"]),
  body("*.isIeBudget", "Expense or Budget Amount can not be null And Must Be in B & E")
    .exists()
    .notEmpty()
    .trim()
    .isLength({ max: 1 })
    .isIn(["B", "E"]),
];

export const validateSamityTransactionQuery = [
  query()
    .custom((value: any) => {
      const values = [];
      values.push(Object(omit(value, ["isPagination", "limit", "page"])));
      return isKeyExist(keysOfTables.samityTransactionKeys, values);
    })
    .withMessage("query params invalid"),
];

function getValueFromPath(arr: any, path: any) {
  //[0].something
  // if something is a object and you want to see the value then
  // const [first, prop,index] then add to return
  const [first, prop] = path.match(/[a-zA-Z]+|\d+/g);
  return arr[first][prop];
}
