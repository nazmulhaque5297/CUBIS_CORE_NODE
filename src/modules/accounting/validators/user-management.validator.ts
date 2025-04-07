import { body, param } from "express-validator";
import { toCamelKeys } from "keys-transform";
import { isExistsByColumn } from "../../../utils/service.utils";
import { sqlConnect } from "../../../db-coop/factory/connection.db";

export const validateLogin =[
  
  body("LoginID","LoginID Missing").exists().isLength({min:1}).withMessage("Length is Less than 1")
    .custom(async(value)=>{
      const isUserExist = await isExistsByColumn("IdsNo", "CCULBSYSIDS", await sqlConnect.getConnection("master"), { IdsNo: value });
      console.log("isUserExist",isUserExist)
      return isUserExist?true:Promise.reject();
    })
    .withMessage("Wrong User Id Is Provided"),
  body("Password","Password Is Missing").exists().isLength({max:8}).withMessage(" Password Length should be Less than 8 character")
]

export const validateCreateUser = [
  body().isArray().withMessage("There Is a Problem in body area")
]

