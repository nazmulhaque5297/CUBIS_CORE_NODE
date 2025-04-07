import { body, param } from "express-validator";
import { toCamelKeys } from "keys-transform";
import { isExistsByColumn } from "rdcd-common";
import { pgConnect } from "../../../../../db-coop/factory/connection.db";

export const validateWorkingArea = [
  body().isArray().withMessage("body is not array"),
  body("*.samityId", "Samity Id can not be null").exists().notEmpty().trim(),

  body("*.status", "Status can not be null").exists().notEmpty().trim().toLowerCase(),
  body("*.divisionId", "বিভাগ নির্বাচন করুন ").exists().trim().notEmpty(),
  body("*.districtId", " districtId Key dose not exits").exists().trim().toLowerCase().optional(),
  body("*.upaCityId", " upaCityId Key dose not exits").exists().trim().optional(),

  body("*.upaCityType", "upaCityType Key dose not exits").exists().trim().optional(),

  body("*.uniThanaPawId", "uniThanaPawId Key dose not exits").exists().trim().optional(),

  body("*.uniThanaPawType", "uniThanaPawType Key dose not exits").exists().trim().optional(),

  body("*.detailsAddress", "detailsAddress Key dose not exits").exists().trim().optional(),
];

export const validatesArray = [body().isArray({ min: 1 }).withMessage("body is not array")];

export const validateGetBySamity = [
  param("samityId")
    .custom(async (value) => {
      const isSamityTypeIdExist = await isExistsByColumn(
        "id",
        "coop.samity_info",
        await pgConnect.getConnection("slave"),
        { id: value }
      );

      return isSamityTypeIdExist ? true : Promise.reject();
    })
    .withMessage("samity id is not present"),
];

export const validationDelete = [
  param("id")
    .custom(async (value) => {
      const workingAreaSql = `select * from coop.working_area where id=$1`;
      const resultFromDatabase = (await (await pgConnect.getConnection("slave")).query(workingAreaSql, [value]))
        .rows[0];

      const workingAreaResult = resultFromDatabase ? toCamelKeys(resultFromDatabase) : resultFromDatabase;

      const memberAddressSql = `select 
                               id, 
                               member_id, 
                               address_type, 
                               district_id, 
                               upa_city_id, 
                               upa_city_type, 
                               uni_thana_paw_id, 
                               uni_thana_paw_type, 
                               details_address
                              from coop.member_address_info
                              where samity_id= $1`;
      const memberAddressResultFromDatabase = (
        await (await pgConnect.getConnection("slave")).query(memberAddressSql, [workingAreaResult.samityId])
      ).rows;

      const memberAddressResult: any = memberAddressResultFromDatabase
        ? toCamelKeys(memberAddressResultFromDatabase)
        : memberAddressResultFromDatabase;

      let returnValue;
      for (const element of memberAddressResult) {
        if (
          element.districtId === workingAreaResult.districtId &&
          element.upaCityId === workingAreaResult.upaCityId &&
          element.upaCityType === workingAreaResult.upaCityType &&
          element.uniThanaPawId === workingAreaResult.uniThanaPawId &&
          element.uniThanaPawType === workingAreaResult.uniThanaPawType
        ) {
          returnValue = true;
          break;
        }
      }

      return returnValue ? Promise.reject() : true;
    })
    .withMessage("কর্ম এলাকাটি সদস্য নিবন্ধন এ ব্যাবহৃত হয়েছে "),
];
