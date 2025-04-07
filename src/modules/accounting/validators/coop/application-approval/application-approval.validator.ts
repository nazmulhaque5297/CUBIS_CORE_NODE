import { body, param } from "express-validator";
import { BadRequestError, isExistsByColumn } from "rdcd-common";
import Container from "typedi";
import { pgConnect } from "../../../../../../db-coop/factory/connection.db";
import { ApplicationApprovalServices } from "../../../../../../modules/coop/coop/services/coop/application-approval/application-approval.service";
import ServiceInfoServices from "../../../../../../modules/coop/coop/services/service-info.service";

const ApplicationApprovalService = Container.get(ApplicationApprovalServices);
export const applicationApprovalValidator = [
  body("serviceActionId")
    .exists()
    .withMessage("Service Action Id is not present in body")
    .bail()
    .notEmpty()
    .withMessage("কর্মকান্ড নির্বাচন করুন ")
    .bail()
    .isNumeric()
    .withMessage("Service Action id must be a number")
    .bail()
    .custom(async (value: any, { req }) => {
      const ServiceInfoService = Container.get(ServiceInfoServices);

      const serviceAction = await ServiceInfoService.getServiceActionById(req.body.serviceId, value);

      if (serviceAction.applicationStatus === "A" && req.body.serviceId == 2) {
        const approvalInformation = await ApplicationApprovalService.isUserAuthorizeForApproveSamityRegistration(
          req.body.applicationId,
          req.user
        );

        if (approvalInformation.isUserCanApprove) {
          return true;
        } else if (!approvalInformation.isUserCanApprove) {
          throw new BadRequestError(
            `আবেদনটি আপনি অনুমোদন দিতে পারবেন না। আবেদনটি ${approvalInformation.approveOfficeLayerName} হতে অনুমোদিত হতে হবে। `
          );
        }
      }

      if (
        serviceAction.applicationStatus === "A" &&
        (req.body.serviceId == 3 || req.body.serviceId == 4 || req.body.serviceId == 5 || req.body.serviceId == 9)
      ) {
        const approvalInformation = await ApplicationApprovalService.isUserAuthorizeForApproveCommitteeFormation(
          req.body.applicationId,
          req.user,
          req.body.serviceId
        );

        if (approvalInformation.isUserCanApprove) {
          return true;
        } else if (!approvalInformation.isUserCanApprove) {
          throw new BadRequestError(
            `আবেদনটি আপনি অনুমোদন দিতে পারবেন না। আবেদনটি ${approvalInformation.approveOfficeLayerName} হতে অনুমোদিত হতে হবে। `
          );
        }
      }
    }),
  body("applicationId")
    .exists()
    .withMessage("Application Id is not present in body")
    .bail()
    .notEmpty()
    .withMessage("Application Id required")
    .bail()
    .isNumeric()
    .withMessage("Application id must be a number")
    .custom(async (value) => {
      const isIdExist = await isExistsByColumn("id", "coop.application", await pgConnect.getConnection("slave"), {
        id: value,
      });

      return isIdExist ? true : Promise.reject();
    })
    .withMessage("Application Id is not present in database")
    .bail(),
  body("designationId")
    .exists()
    .withMessage("Designation Id is not present in body")
    .bail()
    .custom(async (value) => {
      const designationId = value == "null" ? null : parseInt(value as any);
      if (designationId == null || designationId == 0) return true;
      if (typeof designationId !== "number") return false;

      const result = await isExistsByColumn("id", "master.office_designation", await pgConnect.getConnection("slave"), {
        id: designationId,
      });

      return result ? true : Promise.reject();
    })
    .withMessage("Designation Id is not valid"),
  body("attachment").exists().withMessage("Attachment is not present in body").optional(),
  body("remarks").exists().withMessage("Remarks is not present in body").optional(),
  body("serviceId")
    .exists()
    .withMessage("Service Id is not present in body")
    .notEmpty()
    .withMessage("Service Id is required")
    .bail(),
];

export const getByApplicationIdValidator = [
  param("applicationId").isNumeric().withMessage("Application id must be a number"),
];

export const validateNeedForCorrection = getByApplicationIdValidator;
