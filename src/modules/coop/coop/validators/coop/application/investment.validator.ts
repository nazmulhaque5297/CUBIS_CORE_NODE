import { body, Meta } from "express-validator";
import { get, uniq } from "lodash";
import { BadRequestError, isExistsByColumn } from "rdcd-common";
import Container from "typedi";
import { pgConnect } from "../../../../../../db-coop/factory/connection.db";
import { InvestmentServices } from "../../../../../../modules/coop/coop/services/investment.service";
import ServiceInfoServices from "../../../../../../modules/coop/coop/services/service-info.service";

const samityIdValidate = [
  body("data.samityId").custom(async (value, { req }) => {
    
    const InvestmentRequestService = Container.get(InvestmentServices);
    const ServiceInfoService = Container.get(ServiceInfoServices);
    const serviceId = await ServiceInfoService.getServiceByNameAndDoptor(req.body.serviceName, req.user.doptorId);

    const isSamityExistOnApplication = await InvestmentRequestService.isSamityExistOnApplication(
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
    const isSamityExistOnClose = await InvestmentRequestService.isSamityExistOnInvestment(
      value,
      "post"
    );
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
const isInvestmentApplicationValid = [
  body()
    .custom(async (value, { req }) => {
      const ServiceInfoService = Container.get(ServiceInfoServices);
      const serviceId = await ServiceInfoService.getServiceByNameAndDoptor(value.serviceName, req.user.doptorId);
      
      if (serviceId == 12) {
        try {
          const isInvestmentStatusExistOrNot = await isExistsByColumn(
            "id",
            "coop.investment_info",
            await pgConnect.getConnection("slave"),
            {
              status: "A",
              samityId: value.samityId,
            }
          );
          return isInvestmentStatusExistOrNot ? Promise.reject() : true;
        } catch (error) {          
        }
      } else {
        return true;
      }
    })
    .withMessage("সমিতিটি বিনিয়োগের জন্য অনুমোদিত"),
];

const samityIdValidateUpdate = [
  body("samityId").custom(async (value, { req }) => {
    const InvestmentRequestService = Container.get(InvestmentServices);
    const ServiceInfoService = Container.get(ServiceInfoServices);
    const serviceId = await ServiceInfoService.getServiceByNameAndDoptor(req.body.serviceName, req.user.doptorId);

    //@ts-ignore
    const applicationId = parseInt(req.params.id);
    const isSamityExistOnApplication = await InvestmentRequestService.isSamityExistOnApplication(
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

    const isSamityExistOnInvestment = await InvestmentRequestService.isSamityExistOnInvestment(
      value,
      "update"
    );
    if (isSamityExistOnInvestment.isExist) {
      throw new BadRequestError(isSamityExistOnInvestment.message);
    } else if (!isSamityExistOnInvestment.isExist) {
      return true;
    }
  }),
  body("data.content").optional(),
  body("data.documentInfo").optional(),
  body("data.applyDate").optional(),
];

export const investmentRequest = [...isInvestmentApplicationValid, ...samityIdValidate];

export const investmentRequestUpdate = [
  ...isInvestmentApplicationValid,
  ...samityIdValidateUpdate,
];




