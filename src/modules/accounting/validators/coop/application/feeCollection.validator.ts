import { body, Meta } from "express-validator";
import { get, uniq } from "lodash";
import { BadRequestError, isExistsByColumn } from "rdcd-common";
import Container from "typedi";
import { pgConnect } from "../../../../../../db-coop/factory/connection.db";
import { FeeCollectionServices } from "../../../services/feeCollection.service";
import ServiceInfoServices from "../../../services/service-info.service";

const samityIdValidate = [
  body("samityId").custom(async (value, { req }) => {
    const FeeCollectionRequestService = Container.get(FeeCollectionServices);
    const ServiceInfoService = Container.get(ServiceInfoServices);
    const serviceId = await ServiceInfoService.getServiceByNameAndDoptor(req.body.serviceName, req.user.doptorId);

    const isSamityExistOnApplication = await FeeCollectionRequestService.isSamityExistOnApplication(
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
    const isSamityExistOnClose = await FeeCollectionRequestService.isSamityExistOnFeeCollection(value, "post");
    if (isSamityExistOnClose.isExist) {
      throw new BadRequestError(isSamityExistOnClose.message);
    } else if (!isSamityExistOnClose.isExist) {
      return true;
    }
  }),
  // body("data.content").optional(),
  body("data.documentInfo").optional(),
  body("data.applyDate").optional(),
];

//when serviceId 9 then it checks that is there any electedCommitteeOrNot
// const isFeeCollectionApplicationValid = [
//   body()
//     .custom(async (value, { req }) => {
//       const ServiceInfoService = Container.get(ServiceInfoServices);
//       const serviceId = await ServiceInfoService.getServiceByNameAndDoptor(value.serviceName, req.user.doptorId);

//       if (serviceId == 15) {
//         try {
//           const isFeeCollectionStatusExistOrNot = await isExistsByColumn(
//             "id",
//             "coop.application",
//             await pgConnect.getConnection("slave"),
//             {
//               status: "A",
//               samityId: value.samityId,
//             }
//           );
//           return isFeeCollectionStatusExistOrNot ? Promise.reject() : true;
//         } catch (error) {
//         }
//       } else {
//         return true;
//       }
//     })
//     .withMessage("সমিতিটি নিরীক্ষা ফি প্রদান করেছে"),
// ];

// const samityIdValidateUpdate = [
//   body("samityId").custom(async (value, { req }) => {
//     const InvestmentRequestService = Container.get(InvestmentServices);
//     const ServiceInfoService = Container.get(ServiceInfoServices);
//     const serviceId = await ServiceInfoService.getServiceByNameAndDoptor(req.body.serviceName, req.user.doptorId);

//     //@ts-ignore
//     const applicationId = parseInt(req.params.id);
//     const isSamityExistOnApplication = await InvestmentRequestService.isSamityExistOnApplication(
//       value,
//       serviceId,
//       "update",
//       applicationId
//     );
//     if (isSamityExistOnApplication.isExist) {
//       throw new BadRequestError(isSamityExistOnApplication.message);
//     } else if (!isSamityExistOnApplication.isExist) {
//       return true;
//     }

//     const isSamityExistOnInvestment = await InvestmentRequestService.isSamityExistOnInvestment(
//       value,
//       "update"
//     );
//     if (isSamityExistOnInvestment.isExist) {
//       throw new BadRequestError(isSamityExistOnInvestment.message);
//     } else if (!isSamityExistOnInvestment.isExist) {
//       return true;
//     }
//   }),
//   body("data.content").optional(),
//   body("data.documentInfo").optional(),
//   body("data.applyDate").optional(),
// ];

export const feeCollectionRequest = [...samityIdValidate];

// export const investmentRequestUpdate = [
//   ...isInvestmentApplicationValid,
//   ...samityIdValidateUpdate,
// ];
