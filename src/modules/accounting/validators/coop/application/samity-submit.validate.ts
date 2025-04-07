import { param } from "express-validator";
import Container from "typedi";
import { pgConnect } from "../../../../../../db-coop/factory/connection.db";
import { ApplicationServices } from "../../../../../../modules/coop/coop/services/application.service";
import { isExistsByColumn } from "../../../../../../utils/service.utils";

const ApplicationService = Container.get(ApplicationServices);
export const validationForSamityFinalSubmission = [
  param("id")
    .exists()
    .withMessage("Id is required")
    .bail()
    .isInt({ min: 1 })
    .withMessage("Id must be integer")
    .notEmpty()
    .withMessage("Id cannot be empty")
    .bail()
    .custom(async (value: any) => {
      const id = Number(value);
      const isSamityIdExist = await isExistsByColumn(
        "id",
        "temps.samity_info",
        await pgConnect.getConnection("slave"),
        {
          id,
        }
      );
      return isSamityIdExist ? true : Promise.reject();
    })
    .withMessage("Samity Id does not exist")
    .bail()
    .custom(async (value: any) => {
      const count = await ApplicationService.countHeadDesingnation(parseInt(value));
      return count === 1 ? true : Promise.reject();
    })
    .withMessage("No Designation Head or More than one Head is exist"),
];
