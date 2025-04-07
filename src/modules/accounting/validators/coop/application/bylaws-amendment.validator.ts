import { body } from "express-validator";
import { BadRequestError } from "rdcd-common";
import Container from "typedi";
import { pgConnect } from "../../../../../../db-coop/factory/connection.db";
import ServiceInfoServices from "../../../services/service-info.service";
export const byLawsAmendment = [
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
];
