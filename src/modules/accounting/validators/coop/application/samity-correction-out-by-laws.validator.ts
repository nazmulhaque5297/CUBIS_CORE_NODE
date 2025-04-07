import { body } from "express-validator";
import { BadRequestError } from "rdcd-common";
import Container from "typedi";
import { pgConnect } from "../../../../../../db-coop/factory/connection.db";
import ServiceInfoServices from "../../../services/service-info.service";
export const samityCorrectionOutBylaws = [
  body("samityId").custom(async (value, { req }) => {
    const doptorId = req.user.doptorId;
    const ServiceInfoService = Container.get(ServiceInfoServices);
    const serviceId: number = await ServiceInfoService.getServiceByNameAndDoptor(req.body.serviceName, doptorId);

    const query = `select count(id) from coop.application where samity_id=$1 and service_id=$2 and status in ('P','C')`;
    const isSamityExistOnApplication = await (
      await (await pgConnect.getConnection("slave")).query(query, [value, serviceId])
    ).rows[0];
    if (isSamityExistOnApplication.count > 0) {
      if (req?.params?.id) {
        return true;
      } else throw new BadRequestError("একটি আবেদন ইতিমধ্যে অপেক্ষমান রয়েছে!");
    } else return true;
  }),
  body("serviceName")
    .isString()
    .withMessage("ServiceName is invalid")
    .notEmpty()
    .withMessage("সার্ভিস নাম প্রদান করুন"),
  body("data.committeeContactPerson")
    .isInt()
    .withMessage("যোগাযোগের ব্যক্তি নির্বাচন করুন")
    .notEmpty()
    .withMessage("যোগাযোগের ব্যক্তির নির্বাচন করুন"),
  body("data.committeeOrganizer")
    .isInt()
    .withMessage("সংগঠক নির্বাচন করুন")
    .notEmpty()
    .withMessage("সংগঠক নির্বাচন করুন"),
  body("data.committeeSignatoryPerson")
    .isInt()
    .withMessage("সাক্ষরের ব্যাক্তি নির্বাচন করুন")
    .notEmpty()
    .withMessage("সাক্ষরের ব্যাক্তি নির্বাচন করুন"),
  body("data.isMember")
    .isBoolean()
    .withMessage("সদস্যভুক্ত হবে কিনা নির্বাচন করুন")
    .notEmpty()
    .withMessage("সদস্যভুক্ত হবে কিনা নির্বাচন করুন"),
  body("data.email")
    .isString()
    .withMessage("সঠিক ইমেইল আইডি প্রদান করুন")
    .notEmpty()
    .withMessage("সঠিক ইমেইল আইডি প্রদান করুন"),
  body("data.mobile")
    .isString()
    .withMessage("সঠিক মোবাইল নাম্বার প্রদান করুন")
    .notEmpty()
    .withMessage("সঠিক মোবাইল নাম্বার প্রদান করুন"),
  body("data.phone")
    .isString()
    .withMessage("সঠিক ফোন নাম্বার প্রদান করুন")
    .notEmpty()
    .withMessage("সঠিক ফোন নাম্বার প্রদান করুন"),
  body("data.samityFormationDate")
    .isString()
    .withMessage("সঠিক তারিখ প্রদান করুন")
    .notEmpty()
    .withMessage("তারিখ প্রদান করুন"),
  body("data.samityFormationDate")
    .isString()
    .withMessage("সঠিক তারিখ প্রদান করুন")
    .notEmpty()
    .withMessage("তারিখ প্রদান করুন"),
  body("data.website")
    .isString()
    .withMessage("সঠিক ওয়েবসাইট লিঙ্ক প্রদান করুন")
    .notEmpty()
    .withMessage("ওয়েবসাইট লিঙ্ক প্রদান করুন"),
];
