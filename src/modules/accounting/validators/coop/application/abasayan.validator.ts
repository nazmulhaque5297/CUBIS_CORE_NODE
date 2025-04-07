import { body, Meta } from "express-validator";
import { get, uniq } from "lodash";
import { BadRequestError, isExistsByColumn } from "rdcd-common";
import Container from "typedi";
import { pgConnect } from "../../../../../../db-coop/factory/connection.db";
import { AbasayanServices } from "../../../../../../modules/coop/coop/services/abasayan.service";
import ServiceInfoServices from "../../../../../../modules/coop/coop/services/service-info.service";

const samityIdValidate = [
  body("samityId").custom(async (value, { req }) => {
    const AbasayanRequestService = Container.get(AbasayanServices);
    const ServiceInfoService = Container.get(ServiceInfoServices);
    const serviceId = await ServiceInfoService.getServiceByNameAndDoptor(req.body.serviceName, req.user.doptorId);

    const isSamityExistOnApplication = await AbasayanRequestService.isSamityExistOnApplication(
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
    const isSamityExistOnClose = await AbasayanRequestService.isSamityExistOnClose(value, "post");
    if (isSamityExistOnClose.isExist) {
      throw new BadRequestError(isSamityExistOnClose.message);
    } else if (!isSamityExistOnClose.isExist) {
      return true;
    }
  }),
  body("data.content").optional(),
  body("data.documentInfo").optional(),
  body("data.applyDate").optional(),
];

//when serviceId 9 then it checks that is there any electedCommitteeOrNot
const isAbasayanApplicationValid = [
  body()
    .custom(async (value, { req }) => {
      const ServiceInfoService = Container.get(ServiceInfoServices);
      const serviceId = await ServiceInfoService.getServiceByNameAndDoptor(value.serviceName, req.user.doptorId);

      if (serviceId == 11) {
        try {
          const isAbasayanStatusExistOrNot = await isExistsByColumn(
            "id",
            "coop.samity_close",
            await pgConnect.getConnection("slave"),
            {
              status: "A",
              samityId: value.samityId,
            }
          );

          return isAbasayanStatusExistOrNot ? Promise.reject() : true;
        } catch (error) {}
      } else {
        return true;
      }
    })
    .withMessage("সমিতিটি অবসায়ন এ রয়েছে "),
];

const samityIdValidateUpdate = [
  body("samityId").custom(async (value, { req }) => {
    const AbasayanRequestService = Container.get(AbasayanServices);
    const ServiceInfoService = Container.get(ServiceInfoServices);
    const serviceId = await ServiceInfoService.getServiceByNameAndDoptor(req.body.serviceName, req.user.doptorId);

    //@ts-ignore
    const applicationId = parseInt(req.params.id);
    const isSamityExistOnApplication = await AbasayanRequestService.isSamityExistOnApplication(
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

    const isSamityExistOnClose = await AbasayanRequestService.isSamityExistOnClose(value, "update");
    if (isSamityExistOnClose.isExist) {
      throw new BadRequestError(isSamityExistOnClose.message);
    } else if (!isSamityExistOnClose.isExist) {
      return true;
    }
  }),
  body("data.content").optional(),
  body("data.documentInfo").optional(),
  body("data.applyDate").optional(),
];

export const abasayanRequest = [...isAbasayanApplicationValid, ...samityIdValidate];

export const abasayanRequestUpdate = [...isAbasayanApplicationValid, ...samityIdValidateUpdate];
