import express, { NextFunction, Request, Response, Router } from "express";
import Container from "typedi";
import { getComponentId } from "../../../configs/app.config";
import { ComponentType } from "../../../interfaces/component.interface";
import { wrap } from "../../../middlewares/wraps.middle";
import { auth } from "../../../modules/user/middlewares/auth.middle";
import { dynamicValidates } from "../middlewares/dynamic-validation.middle";
import { ApplicationServices } from "../services/application.service";
import ServiceInfoServices from "../services/service-info.service";
import { validateApplication, validateUpdateApplication } from "../validators/application.validator";

const router: Router = express.Router();
const ApplicationService = Container.get(ApplicationServices);
const serviceInfoService: ServiceInfoServices = Container.get(ServiceInfoServices);

export const getServiceName: any = {
  projectAssign: {
    serviceNameBn: "ব্যবহারকারীকে প্রকল্প বরাদ্দ",
    serviceId: 4,
  },
  sanction: {
    serviceNameBn: "ঋণের  অনুমোদন",
    serviceId: 7,
  },
  fieldOfficer: {
    serviceNameBn: "মাঠকর্মী নির্বাচন অনুমোদন",
    serviceId: 8,
  },
  loanSchedule: {
    serviceNameBn: "ঋণ বিতরণ অনুমোদন",
    serviceId: 9,
  },
  subGl: {
    serviceNameBn: "সাব জিএল তৈরি/সংশোধনের অনুমোদন",
    serviceId: 10,
  },
  product: {
    serviceNameBn: "প্রোডাক্ট তৈরি",
    serviceId: 11,
  },
  updateProduct: {
    serviceNameBn: "প্রোডাক্টের তথ্য সংশোধন",
    serviceId: 12,
  },
  updateFieldOfficer: {
    serviceNameBn: "মাঠকর্মী নির্বাচন সম্পাদন অনুমোদন",
    serviceId: 13,
  },
  memberCreate: {
    serviceNameBn: "সদস্য ভর্তি",
    serviceId: 14,
  },
  samityCreate: {
    serviceNameBn: "সমিতি তৈরি",
    serviceId: 15,
  },
  balanceMigration: {
    serviceNameBn: "ব্যালেন্স মাইগ্রেশন অনুমোদন",
    serviceId: 16,
  },
  memberUpdate: {
    serviceNameBn: "সদস্যের তথ্য সংশোধন",
    serviceId: 18,
  },
  loanMigrationCreate: {
    serviceNameBn: "ঋণের তথ্য মাইগ্রেশন অনুমোদন",
    serviceId: 17,
  },
  samityUpdate: {
    serviceNameBn: "সমিতি আপডেট",
    serviceId: 2,
  },
  dpsApplication: {
    serviceNameBn: "ডি পি এস এর আবেদন",
    serviceId: 19,
  },
  savingsProduct: {
    serviceNameBn: "সঞ্চয়ী প্রোডাক্ট এর আবেদন",
    serviceId: 20,
  },
  storeInMigration: {
    serviceNameBn: "স্টোরের আইটেম মাইগ্রেশন",
    serviceId: 21,
  },
  inventoryItemRequisition: {
    serviceNameBn: "মালামালের আবেদন",
    serviceId: 22,
  },
  purchaseOrder: {
    serviceNameBn: "ক্রয় আদেশ",
    serviceId: 23,
  },
  cashWithdraw: {
    serviceNameBn: "নগদ উত্তোলন",
    serviceId: 24,
  },
  reverseTransaction: {
    serviceNameBn: "লেনদেন সংশোধন",
    serviceId: 25,
  },
  dpsClose: {
    serviceNameBn: "ডিপিএস ক্লোজ",
    serviceId: 26,
  },
  fdrApplication: {
    serviceNameBn: "এফডিআর এর আবেদন",
    serviceId: 27,
  },
  loanSettlement: {
    serviceNameBn: "ঋণ অগ্রিম পরিশোধ/ ক্লোজ এর আবেদন",
    serviceId: 28,
  },
  fdrClose: {
    serviceNameBn: "এফডিআর ক্লোজ এর আবেদন",
    serviceId: 29,
  },
  savingsProductUpdate: {
    serviceNameBn: "সঞ্চয়ী প্রোডাক্ট এর তথ্য সংশোধন",
    serviceId: 30,
  },
  inventoryItemReturn: {
    serviceNameBn: "স্টোরে ফেরত অনুরোধ",
    serviceId: 31,
  },
  loanAdjustment: {
    serviceNameBn: "সঞ্চয়ের মাধ্যমে ঋণের সমন্বয়",
    serviceId: 32,
  },
};

/**
 * Get All Pending Application List
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/pending-approval-list/:component",
  [auth(["*"])],
  wrap(async (req: Request<{ component: ComponentType }>, res: Response) => {
    const componentId = getComponentId(req.params.component);
    const applicationServices: ApplicationServices = Container.get(ApplicationServices);
    let result;

    if (req.query.projectId && !req.query.serviceId) {
      result = await applicationServices.getPendingApplication(
        Number(req.user.designationId),
        Number(req.user.doptorId),
        Number(req.query.projectId),
        0,
        null,
        componentId
      );
    } else if (req.query.serviceId && !req.query.projectId) {
      result = await applicationServices.getPendingApplication(
        Number(req.user.designationId),
        Number(req.user.doptorId),
        0,
        Number(req.query.serviceId),
        null,
        componentId
      );
    } else if (req.query.projectId && req.query.serviceId) {
      result = await applicationServices.getPendingApplication(
        Number(req.user.designationId),
        Number(req.user.doptorId),
        Number(req.query.projectId),
        Number(req.query.serviceId),
        null,
        componentId
      );
    } else {
      result = await applicationServices.getPendingApplication(
        Number(req.user.designationId),
        Number(req.user.doptorId),
        0,
        0,
        req.user.projects,
        componentId
      );
    }

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

router.post(
  "/:type/:component",
  [auth(["*"])],
  dynamicValidates(validateApplication, true),
  wrap(async (req: Request<{ component: ComponentType; type: string }>, res: Response, next: NextFunction) => {
    const componentId = getComponentId(req.params.component);
    const payload = {
      doptorId: req.user.doptorId,
      officeId: req.user.officeId,
      ...req.body,
      serviceId: getServiceName[req.params.type].serviceId,
      serviceName: req.params.type,
      status: "P",
      createdBy: req.user.userId,
      createdAt: new Date(),
      componentId,
      editEnable: true,
    };
    ///Create Appp
    const result = await ApplicationService.create(payload, next);

    res.status(201).send({
      message: "আবেদনটি সফলভাবে প্রেরণ করা হয়েছে",
      data: result,
    });
  })
);

/**
 * Update application
 * Author: Adnan
 * Updater:
 * authId:
 */
router.put(
  "/updateApplication/:type/:appId",
  [auth(["*"])],
  dynamicValidates(validateUpdateApplication, true),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const payload = {
      ...req.body,
      serviceId: getServiceName[req.params.type] ? getServiceName[req.params.type].serviceId : null,
      serviceName: req.params.type,
      updatedBy: req.user.userId,
      updatedAt: new Date(),
      doptorId: req.user.doptorId,
    };

    const result = await ApplicationService.updateApplication(payload, Number(req.params.appId), next);

    res.status(200).send({
      message: "আবেদনটি অনুমোদনের জন্য পাঠানো হলো",
      data: result,
    });
  })
);

/**
 * Get application Details by applicationId
 * Author: Adnan
 * Updater:
 * authId:
 */
router.get(
  "/:serviceId/:id/:component",
  wrap(async (req: Request<{ component: ComponentType; id: number; serviceId: number }>, res: Response) => {
    const componentId = getComponentId(req.params.component);
    const applicationServices: ApplicationServices = Container.get(ApplicationServices);
    const result = await applicationServices.getSingleApplicationDetails(
      Number(req.params.id),
      Number(req.params.serviceId),
      componentId,
      req.query.isDataFromArchive?.toString()
    );

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * Get application data by application id
 * Author:
 * Updater:
 * authId:
 */
router.get(
  "/:id",
  [auth(["*"])],
  wrap(async (req: Request, res: Response) => {
    const applicationServices: ApplicationServices = Container.get(ApplicationServices);

    const result = await applicationServices.getAppInitialData(Number(req.params.id));
    result.officeId = req?.user?.officeId;
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * Get member credit rating
 * Author: Hrithik
 * Updater:
 * authId:
 */
router.get(
  "/member/account/credit/rating",
  [auth(["*"])],
  wrap(async (req: Request, res: Response) => {
    const applicationServices: ApplicationServices = Container.get(ApplicationServices);
    const result = await applicationServices.getCustomerInfo(
      Number(req.query.customerId),
      Number(req.query.creditRatingStatus),
      req.query.productId ? Number(req.query.productId) : 0,
      req.query.accountId ? Number(req.query.accountId) : 0
    );

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

router.get(
  "/user/application/allList/:component",
  [auth(["*"])],
  wrap(async (req: Request<{ component: ComponentType }>, res: Response) => {
    const componentId = getComponentId(req.params.component);

    const applicationServices: ApplicationServices = Container.get(ApplicationServices);
    let result;
    if (req.query.serviceId) {
      result = await applicationServices.getAllCreatingAppByUser(
        Number(req.user.doptorId),
        componentId,
        Number(req.user.userId),
        Number(req.query.serviceId)
      );
    } else {
      result = await applicationServices.getAllCreatingAppByUser(
        Number(req.user.doptorId),
        componentId,
        Number(req.user.userId),
        null
      );
    }

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * Get application data by application id
 * Author:
 * Updater:
 * authId:
 */
router.get(
  "/temp-samity/members",
  [auth(["*"])],
  wrap(async (req: Request, res: Response) => {
    const applicationServices: ApplicationServices = Container.get(ApplicationServices);

    const result = await applicationServices.getTempSamityMembers(
      Number(req.user.doptorId),
      Number(getServiceName["memberCreate"].serviceId),
      Number(req.query.samityId)
    );
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

export default router;
