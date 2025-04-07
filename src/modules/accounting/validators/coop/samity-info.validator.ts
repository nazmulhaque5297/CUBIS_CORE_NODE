import { param } from "express-validator";
import { isExistsByColumn } from "rdcd-common";
import { pgConnect } from "../../../../../db-coop/factory/connection.db";

export const validateCoopSamityId = [
  param("samityId", "অকার্যকর সমিতি আইডি দেয়া হয়েছে ")
    .exists()
    .notEmpty()
    .custom(async (value) => {
      const isSamityExist = await isExistsByColumn("id", "coop.samity_info", await pgConnect.getConnection("slave"), {
        id: value,
      });
      return isSamityExist ? true : Promise.reject();
    }),
];
