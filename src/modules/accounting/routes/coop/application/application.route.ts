import { NextFunction, Request, Response, Router } from "express";
import { toCamelKeys } from "keys-transform";
import { BadRequestError, validateRequest } from "rdcd-common";
import Container from "typedi";
import { validates } from "../../../../../../middlewares/express-validation.middle";
import { wrap } from "../../../../../../middlewares/wraps.middle";
import { AbasayanServices } from "../../../../../../modules/coop/coop/services/abasayan.service";
import { CommitteeRequestServices } from "../../../../../../modules/coop/coop/services/committee-request.service";
import { applicationQuery } from "../../../../../../modules/coop/coop/services/coop/application/application.query";
import { BylawsAmendmentServices } from "../../../../../../modules/coop/coop/services/coop/application/byLawsAmendment.service";
import { MemberInformationCorrectionServices } from "../../../../../../modules/coop/coop/services/coop/application/memberInformationCorrection.service.";
import { SamityInfoServices } from "../../../../../../modules/coop/coop/services/coop/samityInfo/samity-Info.service";
import { SamityMigrationServices } from "../../../../../../modules/coop/coop/services/samity-migration.service";
import ServiceInfoServices from "../../../../../../modules/coop/coop/services/service-info.service";
import { validationForSamityFinalSubmission } from "../../../../../../modules/coop/coop/validators/coop/application/samity-submit.validate";
import { validateCoopSamityId } from "../../../../../../modules/coop/coop/validators/coop/samity-info.validator";
import { EmployeeInformationServices } from "../../../../../../modules/coop/employee-management/services/employee-information.service";
import { auth } from "../../../../../../modules/user/middlewares/auth.middle";
import { citizenAuth } from "../../../../citizen/middlewares/citizen-auth.middle";
import { dynamicAuthorization } from "../../../middlewares/coop/application/application.middle";
import { dynamicValidates } from "../../../middlewares/dynamic-validation.middle";
import { ApplicationServices } from "../../../services/application.service";
import { AuditServices } from "../../../services/audit.service";
import { PendingApprovalServices, applicationGet } from "../../../services/coop/application/application-query.service";
import { AuditAccoutsServices } from "../../../services/coop/application/audit-accounts.service";
import { FeeCollectionServices } from "../../../services/feeCollection.service";
import { InvestmentServices } from "../../../services/investment.service";
import {
  applicationDeleteValidates,
  applicationIdValidates,
  validateApplication,
  validateApplicationGet,
  validateApplicationUpdate,
} from "../../../validators/application.validator";

const router = Router();
const ApplicationService = Container.get(ApplicationServices);
const PendingApprovalService = Container.get(PendingApprovalServices);

// pending approval
router.get(
  "/pending-approval-list",
  [auth(["*"])],
  wrap(async (req: Request, res: Response) => {
    const designationId: any = req.user.designationId;
    const result = await PendingApprovalService.getByType(designationId);
    res.status(200).send({
      message: "request successful",
      data: toCamelKeys(result),
    });
  })
);

router.get(
  "/pending-approval-list/serviceId",
  [auth(["*"])],
  wrap(async (req: Request, res: Response) => {
    const userId: any = req.user.userId;
    const designationId: any = req.user.designationId;
    const result = await PendingApprovalService.getByTypeServiceId(userId, designationId);
    res.status(200).send({
      message: "request successful",
      data: toCamelKeys(result),
    });
  })
);

router.get(
  "/pending-list/:officeId/:serviceId",
  [auth(["*"])],
  wrap(async (req: Request, res: Response) => {
    const officeId: any = req.params.officeId;
    const serviceId: any = req.params.serviceId;
    const result = await PendingApprovalService.getByServiceId(officeId, serviceId);
    res.status(200).send({
      message: "request successful",
      data: toCamelKeys(result),
    });
  })
);

router.get(
  "/division-samitee/:officeId",
  auth(["*"]),
  wrap(async (req: Request, res: Response) => {
    const officeId: any = req.params.officeId;
    const result = await PendingApprovalService.getByDivisionSamitee(officeId);
    res.status(200).send({
      message: "request successful",
      data: toCamelKeys(result),
    });
  })
);

router.get(
  "/pending-approval-list/citizen",
  citizenAuth(["*"]),
  wrap(async (req: Request, res: Response) => {
    const userId: any = req.user.userId;
    const result = await PendingApprovalService.getPendingListByCitizen(userId);
    res.status(200).send({
      message: "request successful",
      data: toCamelKeys(result),
    });
  })
);

router.get(
  "/samity-registration-summary",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const officeId = req.user.officeId;
    const result = await ApplicationService.ApplicationSamitySummary(officeId);
    res.status(200).send({
      message: "data serve sucessfully",
      data: result,
    });
  })
);

router.get(
  "/:type",
  citizenAuth(["*"]),
  dynamicValidates(validateApplicationGet, true, "get"),
  wrap(async (req: Request, res: Response) => {
    const userId: any = req.user.userId;
    const employeeId: any = req.user.designationId ? req.user.designationId : 23232;
    const param: any = {
      query: req.query,
      user: { userId: userId.toString() },
      employee: { employeeId: employeeId.toString() },
    };

    const type: string = req.params.type;
    let result: any;
    if (type === "name-clearance-citizen") {
      result = await ApplicationService.getByCitizen(applicationGet[type].query, param[applicationGet[type].param]);
    } else if (type === "all-data-byCitizen") {
      result = await ApplicationService.getAllDataBYCitizen(
        applicationGet[type].query,
        param[applicationGet[type].param]
      );
    } else {
      result = await ApplicationService.getByType(type, applicationGet[type].query, param[applicationGet[type].param]);
    }
    res.status(200).send({
      message: "request successful",
      data: toCamelKeys(result),
    });
  })
);

router.get(
  "/",
  dynamicAuthorization,
  validateApplicationGet,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    let applicationData;
    if (req.query.id && req.query.type == "memberInfoCorrection") {
      const MemberInformationCorrectionService = Container.get(MemberInformationCorrectionServices);
      applicationData = await MemberInformationCorrectionService.get(req.query.id);
    }
    if (req.query.samityId && req.query.type === "memberInfoCorrection") {
      const ServiceInfoService = Container.get(ServiceInfoServices);
      const serviceId = await ServiceInfoService.getServiceByNameAndDoptor(
        "member_information_correction",
        req.user.doptorId
      );
      const MemberInformationCorrectionService = Container.get(MemberInformationCorrectionServices);
      applicationData = await MemberInformationCorrectionService.getApplicationId(
        req.query.samityId,
        req.user.doptorId,
        serviceId
      );
    } else if (req.query.samityId && req.query.type === "bylawsAmendment") {
      // *********************** add by Md. Hasibuzzman *******************
      const ServiceInfoService = Container.get(ServiceInfoServices);
      const serviceId = await ServiceInfoService.getServiceByNameAndDoptor("bylaws_amendment", req.user.doptorId);
      const bylawsAmendmentService = Container.get(BylawsAmendmentServices);
      applicationData = await bylawsAmendmentService.getApplicationById(
        req.query.samityId,
        req.user.doptorId,
        serviceId
      );
    } else if (req.query.samityId && req.query.type === "samityCorrectionOutBylaws") {
      // *********************** added by Didarul islam shanto *********************

      const ServiceInfoService = Container.get(ServiceInfoServices);
      const serviceId = await ServiceInfoService.getServiceByNameAndDoptor(
        "samity_details_correction_outOfByLaws",
        req.user.doptorId
      );
      const samityId = req.query.samityId;

      applicationData = await PendingApprovalService.getByServiceSamityId(
        req.query.samityId,
        req.user.doptorId,
        serviceId
      );
    } else if (req.query.samityId && req.query.type === "auditAccounts") {
      // *********************** add by Md. Hasibuzzman *******************
      const ServiceInfoService = Container.get(ServiceInfoServices);
      const serviceId = await ServiceInfoService.getServiceByNameAndDoptor("audit_accounts", req.user.doptorId);
      const AuditAccoutsService = Container.get(AuditAccoutsServices);
      applicationData = await AuditAccoutsService.getApplicationById(req.query.samityId, req.user.doptorId, serviceId);
    } else if (req.query.samityId && req.query.type === "feeCollection") {
      const feeCollectionService = Container.get(FeeCollectionServices);
      applicationData = await feeCollectionService.getFeeCollection(
        req.query.samityId as unknown as number,
        req.query.startDate,
        req.query.endDate
      );
    } else {
      applicationData = await ApplicationService.get(req.query);
    }

    res.status(200).send({
      message: "সফল ভাবে তথ্য সরবরাহ করা হয়েছে",
      data: applicationData,
    });
  })
);

// wnen citizen finally submit for samity application

router.post(
  "/samity-final-submission/:id",
  [citizenAuth(["*"])],
  validationForSamityFinalSubmission,
  validateRequest,
  wrap(async (req: Request, res: Response) => {
    const doptorId: number = req.user.doptorId;
    const tempSamityId: number = parseInt(req.params.id);
    const { nextAppDesignationId, data } = await ApplicationService.getDataForSamitySubmission(tempSamityId);
    const createdBy = req.user.userId;
    const ServiceInfoService = Container.get(ServiceInfoServices);
    const serviceId: number = await ServiceInfoService.getServiceByNameAndDoptor("samity_registration", doptorId);

    data.userType = req.user.type;
    data.userId = req.user.type == "user" ? req.user.userId : req.user.userId;

    const result = await ApplicationService.createSamityFinalSunmission(
      {
        serviceId,
        doptorId,
        nextAppDesignationId,
        data,
        editEnable: true,
      },
      req.user,
      tempSamityId
    );

    res.status(200).send({
      message: "আবেদনটি সফলভাবে প্রেরণ করা হয়েছে ",
      data: result,
    });
  })
);

router.post(
  "/:type",
  [dynamicAuthorization],
  dynamicValidates(validateApplication, false, "post"),
  wrap(async (req: Request, res: Response) => {
    try {
      let { serviceName, data, samityId } = req.body;
      const type: string = req.params.type;
      const doptorId = req.user.doptorId;
      data.userType = req.user.type;
      data.userId = req.user.userId;
      let d: any;
      let createdBy = req.user.userId;

      const ServiceInfoService = Container.get(ServiceInfoServices);
      const serviceId: number = await ServiceInfoService.getServiceByNameAndDoptor(serviceName, doptorId);

      if (type == "samity-migration") {
        const SamityMigrationService = Container.get(SamityMigrationServices);
        data = await SamityMigrationService.create(req.body.data, req.user);
        d = { id: req.body.nextAppDesignationId };
        createdBy;
      }

      if (type == "committee-request") {
        const samityInfoService = Container.get(SamityInfoServices);
        const CommitteeRequestService = Container.get(CommitteeRequestServices);
        data = await CommitteeRequestService.create(req.body.data, req.user);
        if (samityId) {
          const officeId = await samityInfoService.getSamityOfficeId(samityId);
          d = await ApplicationService.getDesignationId(officeId);
        }
        createdBy;
      }

      if (type == "employee-information") {
        const EmployeeInformationService = Container.get(EmployeeInformationServices);
        data = await EmployeeInformationService.create(req.body.data, req.user);
        const samityInfoService = Container.get(SamityInfoServices);
        const officeId = await samityInfoService.getSamityOfficeId(req.body.samityId);
        d = await ApplicationService.getDesignationId(officeId);
        createdBy;
      }

      if (type == "abasayan") {
        const AbasayanService = Container.get(AbasayanServices);
        data = await AbasayanService.create(req.body.data, req.user);
        const samityInfoService = Container.get(SamityInfoServices);
        const officeId = await samityInfoService.getSamityOfficeId(data.samityInfo.samityId);
        d = await ApplicationService.getDesignationId(officeId);
        createdBy;
      }

      if (type == "investment") {
        const InvestmentService = Container.get(InvestmentServices);
        data = await InvestmentService.create(req.body.data, req.user);
        const samityInfoService = Container.get(SamityInfoServices);
        const officeId = await samityInfoService.getSamityOfficeId(data.samityInfo.samityId);
        d = await ApplicationService.getDesignationId(officeId);
        createdBy;
      }

      if (type == "feeCollection") {
        const FeeCollectionService = Container.get(FeeCollectionServices);
        data = await FeeCollectionService.create(req.body.data, req.user);
        const samityInfoService = Container.get(SamityInfoServices);
        const officeId = await samityInfoService.getSamityOfficeId(data.samityInfo.samityId);
        d = await ApplicationService.getDesignationId(officeId);
        createdBy;
      }

      if (type == "member-information-correction") {
        const MemberInformationCorrectionService = Container.get(MemberInformationCorrectionServices);
        data = await MemberInformationCorrectionService.create(req.body.data, req.user);
        createdBy;
      } else {
        if (data && data.officeId) {
          d = await ApplicationService.getDesignationId(data.officeId);
        }

        if (samityId) {
          const samityInfoService = Container.get(SamityInfoServices);
          const officeId = await samityInfoService.getSamityOfficeId(samityId);

          d = await ApplicationService.getDesignationId(officeId);
        }
        if (req.body.nextAppDesignationId) {
          d = { id: req.body.nextAppDesignationId };
        }

        if (!d) {
          throw new BadRequestError("No office head found");
        }
      }
      // *************************** by laws amendment part by Hasibuzzaman *************************
      // common OfficeId get
      if (type == "bylaws-amendment") {
        const samityInfoService = Container.get(SamityInfoServices);
        const officeId = await samityInfoService.getSamityOfficeId(req.body.samityId);
        const bylawsAmendmentService = Container.get(BylawsAmendmentServices);
        d = await ApplicationService.getDesignationId(officeId);
        data = await bylawsAmendmentService.create(req.body.data, req.user);
      }
      // *************************** by laws amendment part by Hasibuzzaman *************************
      // *************************** samity management correction out of by laws start  ******************
      if (type == "samity-correction-out-bylaws") {
        const samityInfoService = Container.get(SamityInfoServices);
        const officeId = await samityInfoService.getSamityOfficeId(req.body.samityId);
        d = await ApplicationService.getDesignationId(officeId);
        data = req.body.data;
      }
      // *************************** samity management correction out of by laws end ******************
      // *************************** audit Accounts part by Hasibuzzaman *************************
      if (type == "audit-accounts") {
        const samityInfoService = Container.get(SamityInfoServices);
        const officeId = await samityInfoService.getSamityOfficeId(req.body.samityId);
        const AuditAccoutsService = Container.get(AuditAccoutsServices);
        d = await ApplicationService.getDesignationId(officeId);
        data = await AuditAccoutsService.create(req.body.data, req.user);
      }
      // *************************** audit Accounts part by Hasibuzzaman *************************
      const result = await ApplicationService.create(
        {
          samityId: req.body.samityId ? req.body.samityId : null,
          doptorId,
          serviceId,
          data,
          nextAppDesignationId: d ? d.id : null,
          editEnable: true,
        },
        req.user
      );

      if (type == "audit") {
        const auditService = Container.get(AuditServices);
        await auditService.create(req.body.data, samityId, result.id, result.nextAppDesignationId, req.user);
      }

      res.status(201).send({
        message: "আবেদনটি সফলভাবে প্রেরণ করা হয়েছে",
        data: result,
      });
    } catch (ex: any) {
      throw new BadRequestError(ex);
    }
  })
);

router.post(
  "/archive/:id",
  validates(applicationIdValidates),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const id = parseInt(req.params.id);
    const archiveResult = await PendingApprovalService.delete(id);

    archiveResult
      ? res.status(200).send({
          message: "বাতিল সম্পূর্ণ হয়েছে ",
          data: archiveResult,
        })
      : res.status(400).send({
          message: "প্রক্রিয়াটি অকার্যকর হয়েছে ",
        });
  })
);

router.put(
  "/confirm-correction/:id",
  dynamicAuthorization,
  applicationIdValidates,
  validateRequest,
  wrap(async (req: Request, res: Response) => {
    const { comment } = req.body;
    const { id } = req.params;
    const updatedBy = req.user.type === "user" ? req.user.userId : req.user.userId;

    const result = await ApplicationService.correctionUpdate(Number(id), updatedBy, comment, req.user);
    res.status(200).send({
      message: "হালনাগাদ সম্পূর্ণ হয়েছে ",
      data: result,
    });
  })
);

router.patch(
  "/application-member-info-correction/:samityId",
  dynamicAuthorization,
  validateCoopSamityId,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const { samityId } = req.params;
    const result = await ApplicationService.update(
      "application-member-info-correction",
      Number(samityId),
      req.body,
      req.user
    );

    res.status(200).send({
      message: "হালনাগাদ সম্পূর্ণ হয়েছে ",
      data: result,
    });
  })
);

router.patch(
  "/samity-correction-out-bylaws/:id",
  dynamicAuthorization,
  validateCoopSamityId,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const result = await ApplicationService.update("samity-correction-out-bylaws", Number(id), req.body, req.user);

    res.status(200).send({
      message: "হালনাগাদ সম্পূর্ণ হয়েছে ",
      data: result,
    });
  })
);

router.put(
  "/temp-samity-edit/:applicationId",
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const result = await ApplicationService.tempSamityEditable(req.params.applicationId as unknown as number);

    res.status(200).send({
      message: "হালনাগাদ সম্পন্ন হয়েছে ",
      data: result,
    });
  })
);

router.put(
  "/:type/:id",
  [dynamicAuthorization, dynamicValidates(validateApplicationUpdate, true, "update")],
  wrap(async (req: Request, res: Response) => {
    const { type, id } = req.params;
    const result = await ApplicationService.update(type, Number(id), req.body, req.user);

    res.status(200).send({
      message: "হালনাগাদ সম্পূর্ণ হয়েছে ",
      data: result,
    });
  })
);

router.get("/type/:type", [dynamicAuthorization], async (req: Request, res: Response, next: NextFunction) => {
  const type = req.params.type;
  const userType = req.user.type;
  const doptorId = parseInt(req.user.doptorId);
  const userId = req.user.type == "user" ? req.user.userId : req.user.userId;
  const user = req.user;
  const allQuery = req.query;
  const queryObj = applicationQuery[type];
  const ServiceInfoService = Container.get(ServiceInfoServices);
  const serviceId: number = queryObj.serviceNameEnglish
    ? await ServiceInfoService.getServiceByNameAndDoptor(queryObj.serviceNameEnglish, doptorId)
    : 0;

  const result = await ApplicationService.getNewFormation(
    allQuery,
    queryObj,
    { userType, userId },
    user,
    serviceId,
    doptorId
  );
  res.status(200).send({
    message: "dataServe Successfully",
    data: result,
  });
});

router.delete(
  "/:id",
  dynamicAuthorization,
  validates(applicationDeleteValidates),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const ApplicationService = Container.get(ApplicationServices);
    const applicationId = await ApplicationService.delete(parseInt(req.params.id));
    res.status(200).send({
      message: "আবেদনটি বাতিল করা হয়েছে ",
      data: applicationId,
    });
  })
);

export { router as applicationRouter };
