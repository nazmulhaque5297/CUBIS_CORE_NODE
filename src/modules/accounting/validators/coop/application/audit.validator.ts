import { body, Meta } from "express-validator";
import { get, uniq } from "lodash";
import { BadRequestError, isExistsByColumn } from "rdcd-common";
import Container from "typedi";
import { pgConnect } from "../../../../../../db-coop/factory/connection.db";
import { AuditServices } from "../../../../../../modules/coop/coop/services/audit.service";
import ServiceInfoServices from "../../../../../../modules/coop/coop/services/service-info.service";

const samityIdValidate = [
  body("data.samityId").custom(async (value, { req }) => {

    const AuditRequestService = Container.get(AuditServices);
    const ServiceInfoService = Container.get(ServiceInfoServices);
    const serviceId = await ServiceInfoService.getServiceByNameAndDoptor(req.body.serviceName, req.user.doptorId);

    const isSamityExistOnApplication = await AuditRequestService.isSamityExistOnApplication(
      value,
      serviceId,
      "post",
      null
    );
    if (isSamityExistOnApplication.isExist) {
      throw new BadRequestError(isSamityExistOnApplication.message);
    } else if (!isSamityExistOnApplication.isExist) {
      return true;
    }
    const isSamityExistOnClose = await AuditRequestService.isSamityExistOnAudit(
      value,
      "post"
    );
    if (isSamityExistOnClose.isExist) {
      throw new BadRequestError(isSamityExistOnClose.message);
    } else if (!isSamityExistOnClose.isExist) {
      return true;
    }
  })
  // body("data.content").optional(),
  // body("data.documentInfo").optional(),
  // body("data.applyDate").optional(),
];

//when serviceId 9 then it checks that is there any electedCommitteeOrNot
const isAuditApplicationValid = [
  body()
    .custom(async (value, { req }) => {
      const ServiceInfoService = Container.get(ServiceInfoServices);
      const serviceId = await ServiceInfoService.getServiceByNameAndDoptor(value.serviceName, req.user.doptorId);

      //console.log("serviceIdserviceId", serviceId);
      if (serviceId == 13) {
        try {
          const isAuditStatusExistOrNot = await isExistsByColumn(
            "id",
            "coop.audit_info",
            await pgConnect.getConnection("slave"),
            {
              status: "A",
              samityId: value.samityId,
            }
          );

          return isAuditStatusExistOrNot ? Promise.reject() : true;
        } catch (error) {
          console.log(error);

        }
      } else {
        return true;
      }
    })
    .withMessage("সমিতিটি অডিট এর জন্য অপেক্ষমান "),
];

const samityIdValidateUpdate = [
  body("data.samityId").custom(async (value, { req }) => {
    const AuditRequestService = Container.get(AuditServices);
    const ServiceInfoService = Container.get(ServiceInfoServices);
    const serviceId = await ServiceInfoService.getServiceByNameAndDoptor(req.body.serviceName, req.user.doptorId);

    //@ts-ignore
    const applicationId = parseInt(req.params.id);
    const isSamityExistOnApplication = await AuditRequestService.isSamityExistOnApplication(
      value,
      serviceId,
      "update",
      applicationId
    );
    if (isSamityExistOnApplication.isExist) {
      throw new BadRequestError(isSamityExistOnApplication.message);
    } else if (!isSamityExistOnApplication.isExist) {
      return true;
    }

    const isSamityExistOnClose = await AuditRequestService.isSamityExistOnAudit(
      value,
      "update"
    );
    if (isSamityExistOnClose.isExist) {
      throw new BadRequestError(isSamityExistOnClose.message);
    } else if (!isSamityExistOnClose.isExist) {
      return true;
    }
  })
  // body("data.content").optional(),
  // body("data.documentInfo").optional(),
  // body("data.applyDate").optional(),
];

export const auditRequest = [...isAuditApplicationValid, ...samityIdValidate];

export const auditRequestUpdate = [
  ...isAuditApplicationValid,
  ...samityIdValidateUpdate,
];




