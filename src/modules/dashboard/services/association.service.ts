/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-08-22 11:06:40
 * @modify date 2022-08-22 11:06:40
 * @desc [description]
 */

import axios from "axios";
import { pick } from "lodash";
import Container, { Service } from "typedi";
import { dashboardUrl } from "../../../configs/app.config";
import { ISamityAttrs } from "../../../modules/samity/interfaces/samity.interface";
import SamityService from "../../../modules/samity/services/samity.service";
import { ComponentType } from "./../../../interfaces/component.interface";
import { Dashboard } from "./dashboard.service";
import { BadRequestError, buildInsertSql, buildUpdateWithWhereSql } from "rdcd-common";
import db from "../../../db/connection.db";

@Service()
export class AssociationSyncService extends Dashboard {
  constructor(component: ComponentType = "coop") {
    super(component);
  }

  async sendSamityToDashboard(
    componentName: ComponentType,
    userId: number,
    doptorId?: number,
    officeId?: number | String
  ) {
    const dbConnection = db.getConnection("master");
    const samityService = Container.get(SamityService);
    const samityInfo = (await samityService.getSamityForSync(
      dbConnection,
      doptorId,
      officeId,
      this.component
    )) as Array<ISamityAttrs>;
    const samityData = samityInfo.map((s) => this.createSamityPayload(s)).filter((s) => s.members!.length > 0);
    const getMaxReqNoSql = `SELECT COALESCE(MAX(request_num), 0) max_request_num FROM logs.dashboard_api_log`;

    //calculate the api request number
    let requestNum = (await dbConnection.query(getMaxReqNoSql)).rows[0]?.max_request_num;
    requestNum = requestNum ? Number(requestNum) + 1 : 1;

    let syncedSamity = 0;
    let memberTableName = "";

    //member table name decision
    if (componentName === "coop") {
      memberTableName = "coop.member_info";
    } else if (componentName === "loan") {
      memberTableName = "samity.customer_info";
    } else {
      throw new BadRequestError("Invalid Component");
    }
    try {
      for await (const samity of samityData) {
        try {
          // console.log({ beneficiaries: samity.members && samity.members[0].addresses });

          const res = await axios.post(`${dashboardUrl}/api/v1/associations`, samity, await this.getConfig());
          // console.log({ response: res });

          if (res.status == 200) {
            //beneficiary user id save
            if (res?.data?.beneficiaries && res.data.beneficiaries.length > 0) {
              for await (let singleBeneficiary of res.data.beneficiaries) {
                let { sql: beneficiaryUpdateSql, params: beneficiaryUpdateParams } = buildUpdateWithWhereSql(
                  memberTableName,
                  { id: singleBeneficiary.local_id },
                  { dashboardUserId: singleBeneficiary.local_user_id, updatedBy: userId, updatedAt: new Date() }
                );
                let beneficiaryUpdateRes = (await dbConnection.query(beneficiaryUpdateSql, beneficiaryUpdateParams))
                  .rows[0];
              }
            }
            await samityService.updateSyncTime(samity.local_id as number, componentName, userId, dbConnection);
            syncedSamity += 1;
          }
          let { sql: successLogSql, params: successLogParams } = buildInsertSql("logs.dashboard_api_log", {
            requestNum,
            requestDate: new Date(),
            requestType: "send_samity_to_dashboard",
            userId: userId,
            requestInfo: JSON.stringify(samity),
            responseInfo: JSON.stringify(res.data),
            requestStatus: "SUCCESS",
            resStatusCode: res.status,
            createdBy: userId,
            createdAt: new Date(),
          });
          let successLog = (await dbConnection.query(successLogSql, successLogParams)).rows[0];
        } catch (error: any) {
          // console.log({ error });

          let { sql: errorLogSql, params: errorLogParams } = buildInsertSql("logs.dashboard_api_log", {
            requestNum,
            requestDate: new Date(),
            requestType: "send_samity_to_dashboard",
            userId: userId,
            requestInfo: JSON.stringify(samity),
            errorMessage: JSON.stringify(error?.response?.data?.errors ? error.response.data.errors : error),
            requestStatus: "FAIL",
            resStatusCode: error?.response?.status,
            createdBy: userId,
            createdAt: new Date(),
          });
          let errorLog = (await dbConnection.query(errorLogSql, errorLogParams)).rows[0];
        }
      }
      return `${syncedSamity} samity synced`;
    } catch (error: any) {
      let { sql: errorLogSql, params: errorLogParams } = buildInsertSql("logs.dashboard_api_log", {
        requestNum,
        requestDate: new Date(),
        requestType: "send_samity_to_dashboard",
        userId: userId,
        requestInfo: JSON.stringify(samityData),
        errorMessage: JSON.stringify(error),
        requestStatus: "FAIL",
        resStatusCode: error?.response?.status,
        createdBy: userId,
        createdAt: new Date(),
      });
      let errorLog = (await dbConnection.query(errorLogSql, errorLogParams)).rows[0];
      // console.log({ sysError: error });
    }
  }

  createSamityPayload(samity: ISamityAttrs) {
    console.log({ samity });
    console.log("***************************************************************");

    return {
      local_id: samity.id,
      name_en: samity.samityName,
      name_bn: samity.samityName,
      origin_doptor_id: samity.doptorId,
      office_id: samity.officeId,
      code: samity.samityCode,
      status: "temporary_approved",
      geo_division_id: samity.districtId,
      geo_district_id: samity.districtId,
      geo_upazila_id: samity.upaCityId,
      detail_address: samity.address,
      per_share_price: samity.shareAmount,
      members: samity.members?.map((m) => this.createMemberPayload(m)),
    };
  }

  createMemberPayload(member: any) {
    console.log(
      "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
    );

    console.log({ member });
    console.log("************************************************************");
    console.log({ memberAddresses: member.addresses?.map((a: any) => this.createAddressPayload(a)) });
    console.log("************************************************************");

    return {
      name_bn: member.nameBn,
      name_en: member.nameEn,
      code: member.customerCode,
      local_id: member.id,
      mobile: member.mobile,
      gender_id: member.gender,
      occupation_id: member.occupation,
      dob: member.birthDate,
      email: member.email,
      father_name_bn: member.fatherName,
      mother_name_bn: member.motherName,
      user: {
        id: member.id,
        role_id: 72,
      },
      addresses: member.addresses?.map((a: any) => this.createAddressPayload(a)),
    };
  }

  createAddressPayload(address: any) {
    console.log({ address });
    console.log("****************************************************");

    return {
      address_type: address?.addressType ? address.addressType : address.address_type_id == 1 ? "PRE" : "PER",
      geo_division_id: address?.divisionId ? address.divisionId : null,
      geo_district_id: address.districtId,
      geo_upazila_id: address.upaCityId,
      detail_address: JSON.stringify(pick(address, ["holdingNo", "roadNo", "wardNo", "village", "postCode"])),
    };
  }
}
