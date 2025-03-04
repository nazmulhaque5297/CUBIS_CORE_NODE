import { NextFunction } from "express";
import { toCamelKeys } from "keys-transform";
import { default as lo, default as lodash } from "lodash";
import moment from "moment";
import { Pool, PoolClient } from "pg";
import Container, { Service } from "typedi";
import db from "../../../db/connection.db";
import BadRequestError from "../../../errors/bad-request.error";
import { StoreInMigrationService } from "../../../modules/inventory/services/store-in-migration.service";
import ProjectService from "../../../modules/master/services/project.service";
import { SamityMigrationService } from "../../../modules/migration/services/samity-migration.service";
import SamityService from "../../../modules/samity/services/samity.service";
import ScheduleService from "../../../modules/schedule/services/schedule.service";
import { ScheduleCalculator } from "../../../modules/schedule/utils/schedule.util";
import { minioPresignedGet, uploadObject as upload } from "../../../utils/minio.util";
import { buildInsertSql, buildUpdateWithWhereSql } from "../../../utils/sql-builder.util";
import { ItemRequisitionService } from "../../inventory/services/item-requisition.service";
import { PurchaseOrderService } from "../../inventory/services/purchase-order.service";
import DataService from "../../master/services/master-data.service";
import memberDocumentValidation from "../../samity/middlewares/member-documents-validation";
import nomineeDocumentValidation from "../../samity/middlewares/nominee-documents-validation";
import { ApplicationAttrs } from "../interfaces/application.interface";
import projectAssignValidation from "../middlewares/project-assign.middle";
import { CashWithdrawApplicationServices } from "./cash-withdraw-application.service";
import { DpsApplicationServices } from "./dps-application.service";
import { FdrApplicationServices } from "./fdr-application.service";
import { SavingsProductUpdateApplicationService } from "./savings-product-update-application.service";

import SavingsProductService from "../../../modules/savings/services/savings-product.service";
import { LoanDisbursementApplicationService } from "./loan-disbursement-application.service.";
import { LoanSettlementApplicationServices } from "./loan-settlement-application.service";
import { ProductCreateApplicationService } from "./product-create-application.service";
import { ProjectAssignApplicationService } from "./project-assign-application.service";
import { ReverseTranApplicationService } from "./reverse-tran-application.service";
import { SamityApplicationService } from "./samity-application-service";
import { SanctionApplicationValidationService } from "./sanction-application-validation.service";
import { SanctionApplicationService } from "./sanction-application.service";
import { ItemReturnService } from "../../inventory/services/item-return.service";
import { LoanAdjustmentApplicationServices } from "./loan-adjustment-application.service";
import DpsService from "../../savings/services/dps.service";
import { NotificationService } from "../../../modules/notification/services/base-notification.service";
import { ServiceInfoService } from "../../../modules/coop/coop/validators/application.validator";
import { notificationObject } from "../../../modules/notification/interfaces/component.interface";
export const serviceType = {
  2: "samityUpdate",
  4: "projectAssign",
  7: "sanctionApply",
  8: "fieldOfficer",
  9: "loanSchedule",
  10: "subGl",
  11: "product",
  12: "updateProduct",
  13: "updateFieldOfficer",
  14: "memberCreate",
  15: "samityCreate",
  16: "balanceMigration",
  17: "loanInfoMigration",
  18: "memberUpdate",
  19: "dpsApplication",
  20: "savingsProduct",
  21: "storeInMigration",
  22: "inventoryItemRequisition",
  23: "purchaseOrder",
  24: "cashWithdraw",
  25: "reverseTransaction",
  26: "dpsClose",
  27: "fdrApplication",
  28: "loanSettlement",
  29: "fdrClose",
  30: "savingsProductUpdate",
  31: "inventoryItemReturn",
  32: "loanAdjustment",
};

const findUniqueValueFromAnArrayOfInteger = (array: any) => {
  let uniqueArray: any = [];
  let uniqueObj: any = {};
  for (const arr of array) {
    if (!uniqueObj[arr]) {
      uniqueObj[arr] = true;
      uniqueArray.push(arr);
    }
  }
  return uniqueArray;
};
@Service()
export class ApplicationServices {
  constructor() {}

  //create application
  async create(payload: any, next: NextFunction): Promise<ApplicationAttrs> {
    const pool = db.getConnection("master");
    let result;
    let checkVal;
    const balanceData = payload.data; //for use in balance migration
    payload.data = { ...payload.data, officeId: payload.officeId };
    //for sanction application
    if (payload.serviceName === "sanction") {
      //service level validation checking
      const productMstSql = "Select * from loan.product_mst where id=$1";

      const productMstInfo = (await pool.query(productMstSql, [payload.data.productId])).rows[0];
      const sanctionValidate: SanctionApplicationValidationService = Container.get(
        SanctionApplicationValidationService
      );
      await sanctionValidate.customerDocumentsValidate(payload);
      await sanctionValidate.isCustomerActive(payload);
      await sanctionValidate.hasAnyLoanAccount(payload, productMstInfo?.is_multiple_loan_allow);
      productMstInfo?.is_multiple_loan_allow == true && (await sanctionValidate.multipleDisbursed(payload));
      await sanctionValidate.loanAmountChecking(payload);
      await sanctionValidate.defaultProductChecking(payload);
      checkVal = await sanctionValidate.getCustomerLoanDetails(payload);
      //application create
      const sanctionApplicationService: SanctionApplicationService = Container.get(SanctionApplicationService);
      result = await sanctionApplicationService.createSanctionApplication(payload, checkVal, pool);
    }

    //for project assign application
    else if (payload.serviceName === "projectAssign") {
      //service level validation checking
      const projectService: ProjectService = Container.get(ProjectService);
      await projectAssignValidation(payload);
      //application create
      const projectAssignApplicationService: ProjectAssignApplicationService = Container.get(
        ProjectAssignApplicationService
      );
      result = await projectAssignApplicationService.createProjectAssignApplication(payload, checkVal, pool);
    }

    //for loan schedule application
    else if (payload.serviceName === "loanSchedule") {
      //service level validation checking
      const scheduleService: ScheduleService = Container.get(ScheduleService);
      checkVal = await scheduleService.scheduleApplicationValidate(payload, pool);
      //application create
      const loanDisbursementApplicationService: LoanDisbursementApplicationService = Container.get(
        LoanDisbursementApplicationService
      );
      result = await loanDisbursementApplicationService.createLoanDisbursementApplication(payload, checkVal, pool);
    }

    //create subGL application
    else if (payload.serviceName === "subGl") {
      payload.data.userId = payload.createdBy;
      payload.data.userType = "user";
      let { sql, params } = buildInsertSql("temps.application", {
        ...lodash.omit(payload, ["officeId", "serviceName"]),
        remarks: "সাব জিএল তৈরি/সংশোধন অ্যাপ্লিকেশন সম্পন্ন হয়েছে",
      });
      result = await (await pool.query(sql, params)).rows[0];
    }

    //create product application
    else if (payload.serviceName === "product") {
      const productCreateApplicationService: ProductCreateApplicationService = Container.get(
        ProductCreateApplicationService
      );
      //service level validation checking
      checkVal = await productCreateApplicationService.productCreateValidation(payload);
      //application create
      result = await productCreateApplicationService.createProductApplication(payload, pool);
    }

    //update product application
    else if (payload.serviceName === "updateProduct") {
      result = await this.updateMainProduct(payload, pool);
    } else if (payload.serviceName === "updateFieldOfficer") {
      payload.data = {
        ...payload.data,
        userId: payload.createdBy,
        userType: "user",
      };
      let { sql, params } = buildInsertSql("temps.application", {
        ...lodash.omit(payload, ["officeId", "serviceName"]),
      });
      result = await (await pool.query(sql, params)).rows[0];
    } else if (payload.serviceName === "savingsProductUpdate") {
      payload.data.userId = payload.createdBy;
      payload.data.userType = "user";
      let { sql, params } = buildInsertSql("temps.application", {
        ...lodash.omit(payload, ["officeId", "serviceName"]),
        remarks: "সঞ্চয়ী প্রোডাক্ট এর তথ্য সংশোধন এর জন্য আবেদন সম্পন্ন হয়েছে",
      });
      result = await (await pool.query(sql, params)).rows[0];
    }
    //create samity
    else if (payload.serviceName === "samityCreate") {
      payload.data.remarks = `নতুন সমিতি তৈরি। সমিতির নাম: ${payload.data.basic.samityName}`;
      payload.data.userId = payload.createdBy;
      payload.data.userType = "user";

      if (payload.data.basic.flag == 1) {
        payload.data.basic.coopStatus = true;
      }
      payload.data.setup = {
        samityMinMember: payload.data.setup.samityMinMember ? payload.data.setup.samityMinMember : 0,
        samityMaxMember: payload.data.setup.samityMaxMember ? payload.data.setup.samityMaxMember : 0,
        groupMinMember: payload.data.setup.groupMinMember ? payload.data.setup.groupMinMember : 0,
        groupMaxMember: payload.data.setup.groupMaxMember ? payload.data.setup.groupMaxMember : 0,
        shareAmount: payload.data.setup.shareAmount ? payload.data.setup.shareAmount : 0,
        samityMemberType: (
          await pool.query("SELECT id FROM master.code_master WHERE return_value = $1", [
            payload.data.setup.samityMemberType,
          ])
        ).rows[0]?.id,
        memberMinAge: payload.data.setup.memberMinAge ? payload.data.setup.memberMinAge : 0,
        memberMaxAge: payload.data.setup.memberMaxAge ? payload.data.setup.memberMaxAge : 0,
      };

      let { sql, params } = buildInsertSql("temps.application", {
        ...lodash.omit(payload, ["officeId", "serviceName"]),
        remarks: `নতুন সমিতি তৈরি। সমিতির নাম: ${payload.data.basic.samityName}`,
        editEnable: true,
      });
      const response = await (await pool.query(sql, params)).rows[0];
      result = {
        id: parseInt(response.id),
        samityMinMember: parseInt(response.data.setup.samity_min_member),
        samityMaxMember: parseInt(response.data.setup.samity_max_member),
        memberMinAge: parseInt(response.data.setup.member_min_age),
        memberMaxAge: response.data.setup.member_max_age,
        projectId: parseInt(response.project_id),
      };
    } else if (payload.serviceName === "memberCreate") {
      await memberDocumentValidation(payload.memberInfo, payload?.doptorId, payload.memberInfo[0].memberType, pool);
      const status = await this.getProjectConfig(payload.memberInfo[0].data.projectId);
      if (status) await nomineeDocumentValidation(payload.memberInfo, payload?.doptorId);
      let buffer: any;
      let fileName: any;
      let mRes;
      if (payload.memberInfo[0].memberType == "new") {
        const samityService: SamityService = Container.get(SamityService);

        const memberNoValidate = await samityService.validateMember(0, null, payload.memberInfo);
        for (let [memberIndex, value] of payload.memberInfo.entries()) {
          if (value.data.memberDocuments) {
            for (let [index, memberDoc] of value.data.memberDocuments.entries()) {
              if (memberDoc.documentFront && memberDoc.documentFrontType) {
                buffer = Buffer.from(memberDoc.documentFront, "base64");
                if (buffer) {
                  fileName = `member-${new Date().getTime()}.${String(memberDoc.documentFrontType).split("/")[1]}`;
                  mRes = await upload({
                    fileName: fileName,
                    buffer: buffer,
                  });
                }
                if (mRes) {
                  value.data.memberDocuments[index].documentFront = fileName;
                }
              }
              if (memberDoc.documentBack && memberDoc.documentBackType) {
                buffer = Buffer.from(memberDoc.documentBack, "base64");
                if (buffer) {
                  fileName = `member-${new Date().getTime()}.${String(memberDoc.documentBackType).split("/")[1]}`;
                  mRes = await upload({
                    fileName: fileName,
                    buffer: buffer,
                  });
                }
                if (mRes) {
                  value.data.memberDocuments[index].documentBack = fileName;
                }
              }
            }
          }
          if (value.memberPicture && value.memberPictureType) {
            buffer = Buffer.from(value.memberPicture, "base64");
            if (buffer) {
              fileName = `member-${new Date().getTime()}.${String(value.memberPictureType).split("/")[1]}`;
              mRes = await upload({
                fileName: fileName,
                buffer: buffer,
              });
            }
            if (mRes) {
              value.memberPicture = fileName;
            }
          }

          if (value.memberSign && value.memberSignType) {
            buffer = Buffer.from(value.memberSign, "base64");
            if (buffer) {
              fileName = `member-${new Date().getTime()}.${String(value.memberSignType).split("/")[1]}`;
              mRes = await upload({
                fileName: fileName,
                buffer: buffer,
              });
            }
            if (mRes) {
              value.memberSign = fileName;
            }
          }
          if (value.nominee && value.nominee[0]) {
            for (const [nomineeIndex, nomineeValue] of value.nominee.entries()) {
              if (nomineeValue.nomineePicture && nomineeValue.nomineePictureType) {
                buffer = Buffer.from(nomineeValue.nomineePicture, "base64");
                if (buffer) {
                  fileName = `nominee-${new Date().getTime()}.${String(nomineeValue.nomineePictureType).split("/")[1]}`;
                  mRes = await upload({
                    fileName: fileName,
                    buffer: buffer,
                  });
                }
                if (mRes) {
                  nomineeValue.nomineePicture = fileName;
                }
              }
              if (nomineeValue.nomineeSign && nomineeValue.nomineeSignType) {
                buffer = Buffer.from(nomineeValue.nomineeSign, "base64");
                if (buffer) {
                  fileName = `nominee-${new Date().getTime()}.${String(nomineeValue.nomineeSignType).split("/")[1]}`;
                  mRes = await upload({
                    fileName: fileName,
                    buffer: buffer,
                  });
                }
                if (mRes) {
                  nomineeValue.nomineeSign = fileName;
                }
              }
              value.nominee[nomineeIndex] = nomineeValue;
            }
          }
          payload.memberInfo[memberIndex] = value;
        }
      } else if (payload.memberInfo[0].memberType == "update") {
        const samityService: SamityService = Container.get(SamityService);
        const memberDocsSql = `SELECT document_data FROM loan.document_info WHERE ref_no = $1`;
        const memberDocsInfo = (await pool.query(memberDocsSql, [payload.memberInfo[0].data.memberId])).rows[0];
        if (payload.memberInfo[0].data.memberDocuments) {
          for (let [index, memberDoc] of payload.memberInfo[0].data.memberDocuments.entries()) {
            //document front image handle
            const documentFrontTypeKeyCheck = "documentFrontType" in memberDoc;
            if (memberDoc.documentFront && memberDoc.documentFrontType) {
              buffer = Buffer.from(memberDoc.documentFront, "base64");
              if (buffer) {
                fileName = `member-${new Date().getTime()}.${String(memberDoc.documentFrontType).split("/")[1]}`;
                mRes = await upload({
                  fileName: fileName,
                  buffer: buffer,
                });
              }
              if (mRes) {
                payload.memberInfo[0].data.memberDocuments[index].documentFront = fileName;
              }
            } else if (documentFrontTypeKeyCheck && !memberDoc.documentFrontType) {
              payload.memberInfo[0].data.memberDocuments[index].documentFront = "";
            } else {
              let docData = memberDocsInfo.document_data.own.filter(
                (value: any) => value.document_type == memberDoc.documentType
              );
              payload.memberInfo[0].data.memberDocuments[index].documentFront = docData[0].document_front;
            }

            //document back image handle
            const documentBackTypeKeyCheck = "documentBackType" in memberDoc;
            if (memberDoc.documentBack && memberDoc.documentBackType) {
              buffer = Buffer.from(memberDoc.documentBack, "base64");
              if (buffer) {
                fileName = `member-${new Date().getTime()}.${String(memberDoc.documentBackType).split("/")[1]}`;
                mRes = await upload({
                  fileName: fileName,
                  buffer: buffer,
                });
              }
              if (mRes) {
                payload.memberInfo[0].data.memberDocuments[index].documentBack = fileName;
              }
            } else if (documentFrontTypeKeyCheck && !memberDoc.documentBackType) {
              payload.memberInfo[0].data.memberDocuments[index].documentBack = "";
            } else {
              let docData = memberDocsInfo.document_data.own.filter(
                (value: any) => value.document_type == memberDoc.documentType
              );
              payload.memberInfo[0].data.memberDocuments[index].documentBack = docData[0].document_back;
            }
          }
        }

        //member picture handle
        const memberPictureTypeKeyCheck = "memberPictureType" in payload.memberInfo[0];
        if (payload.memberInfo[0].memberPicture && payload.memberInfo[0].memberPictureType) {
          buffer = Buffer.from(payload.memberInfo[0].memberPicture, "base64");
          if (buffer) {
            fileName = `member-${new Date().getTime()}.${
              String(payload.memberInfo[0].memberPictureType).split("/")[1]
            }`;
            mRes = await upload({
              fileName: fileName,
              buffer: buffer,
            });
          }
          if (mRes) {
            payload.memberInfo[0].memberPicture = fileName;
          }
        } else if (memberPictureTypeKeyCheck && !payload.memberInfo[0].memberPictureType) {
          payload.memberInfo[0].memberPicture = "";
        } else {
          payload.memberInfo[0].memberPicture = memberDocsInfo.document_data.member_picture;
        }
        const memberSignTypeKeyCheck = "memberSignType" in payload.memberInfo[0];

        if (payload.memberInfo[0].memberSign && payload.memberInfo[0].memberSignType) {
          buffer = Buffer.from(payload.memberInfo[0].memberSign, "base64");
          if (buffer) {
            fileName = `member-${new Date().getTime()}.${String(payload.memberInfo[0].memberSignType).split("/")[1]}`;
            mRes = await upload({
              fileName: fileName,
              buffer: buffer,
            });
          }
          if (mRes) {
            payload.memberInfo[0].memberSign = fileName;
          }
        } else if (memberSignTypeKeyCheck && !payload.memberInfo[0].memberSignType) {
          payload.memberInfo[0].memberSign = "";
        } else {
          payload.memberInfo[0].memberSign = memberDocsInfo.document_data.member_sign;
        }
        if (payload.memberInfo[0].nominee && payload.memberInfo[0].nominee[0]) {
          for (const [nomineeIndex, nomineeValue] of payload.memberInfo[0].nominee.entries()) {
            //nominee picyure handle
            const nomineePictureTypeKeyCheck = "nomineePictureType" in nomineeValue;
            const nomineeSignTypeKeyCheck = "nomineeSignType" in nomineeValue;
            if (nomineeValue.nomineePicture && nomineeValue.nomineePictureType) {
              buffer = Buffer.from(nomineeValue.nomineePicture, "base64");
              if (buffer) {
                fileName = `nominee-${new Date().getTime()}.${String(nomineeValue.nomineePictureType).split("/")[1]}`;
                mRes = await upload({
                  fileName: fileName,
                  buffer: buffer,
                });
              }
              if (mRes) {
                nomineeValue.nomineePicture = fileName;
              }
            } else if (nomineePictureTypeKeyCheck && !nomineeValue.nomineePictureType) {
              nomineeValue.nomineePicture = "";
            } else {
              let docData = memberDocsInfo.document_data.nominee.filter(
                (value: any) => value.nominee_id == nomineeValue.id
              );
              nomineeValue.nomineePicture = docData[0]?.nominee_picture ? docData[0].nominee_picture : "";
            }

            if (nomineeValue.nomineeSign && nomineeValue.nomineeSignType) {
              buffer = Buffer.from(nomineeValue.nomineeSign, "base64");
              if (buffer) {
                fileName = `nominee-${new Date().getTime()}..${String(nomineeValue.nomineeSignType).split("/")[1]}`;
                mRes = await upload({
                  fileName: fileName,
                  buffer: buffer,
                });
              }
              if (mRes) {
                nomineeValue.nomineeSign = fileName;
              }
            } else if (nomineeSignTypeKeyCheck && !nomineeValue.nomineeSignType) {
              nomineeValue.nomineeSign = "";
            } else {
              let docData = memberDocsInfo.document_data.nominee.filter(
                (value: any) => value.nominee_id == nomineeValue.id
              );
              nomineeValue.nomineeSign = docData[0]?.nominee_sign ? docData[0].nominee_sign : "";
            }
            payload.memberInfo[0].nominee[nomineeIndex] = nomineeValue;
          }
        }
      }
      payload = lodash.omit(payload, ["memberType"]);
      const appCountSql = `SELECT 
                            id, 
                            data 
                          FROM 
                            temps.application 
                          WHERE 
                            service_id = $1 
                            AND status = 'P'
                            AND samity_id = $2
                            AND next_app_designation_id IS NULL`;
      let appCountInfo = (await pool.query(appCountSql, [payload.serviceId, payload?.memberInfo[0]?.data?.samityId]))
        .rows[0];
      if (appCountInfo?.id) {
        appCountInfo = toCamelKeys(appCountInfo);
        for (let [payloadMemberIndex, payloadSingleMember] of payload.memberInfo.entries()) {
          if (payloadSingleMember.memberType == "update") {
            let previousUpdateDataIndex = appCountInfo.data.memberInfo.findIndex(
              (value: any) => value.data.memberId == payloadSingleMember.data.memberId
            );
            if (previousUpdateDataIndex != -1) {
              appCountInfo.data.memberInfo[previousUpdateDataIndex] = payloadSingleMember;
              payload.memberInfo.splice(payloadMemberIndex, 1);
            }
          }
        }
        appCountInfo.data.memberInfo = [...appCountInfo.data.memberInfo, ...payload.memberInfo];
        const { sql, params } = buildUpdateWithWhereSql(
          "temps.application",
          { id: appCountInfo.id },
          {
            data: appCountInfo.data,
            updatedBy: payload.createdBy,
            updatedAt: payload.createdAt,
          }
        );
        result = (await pool.query(sql, params)).rows[0];
      } else {
        let { sql, params } = buildInsertSql("temps.application", {
          data: lodash.omit(payload, [
            "officeId",
            "serviceName",
            "doptorId",
            "serviceId",
            "status",
            "createdBy",
            "createdAt",
          ]),
          samityId: payload?.memberInfo[0]?.data?.samityId,
          projectId: payload?.memberInfo[0]?.data?.projectId,
          serviceId: payload?.serviceId,
          doptorId: payload?.doptorId,
          componentId: payload?.componentId,
          status: payload?.status,
          createdBy: payload?.createdBy,
          createdAt: payload?.createdAt,
          remarks: checkVal,
        });
        result = (await pool.query(sql, params)).rows[0];
      }
    } else if (payload.serviceName === "balanceMigration") {
      let { sql, params } = buildInsertSql("temps.application", {
        ...lo.omit(payload, ["officeId", "serviceName", "data"]),
        data: { glDetails: balanceData, officeId: payload.officeId },
      });

      const response = await (await pool.query(sql, params)).rows[0];

      result = response;
    } else if (payload.serviceName === "loanMigrationCreate") {
      const samityMigrationService = Container.get(SamityMigrationService);
      try {
        const migrationResult = await samityMigrationService.storeLoanInfo(payload);
        result = migrationResult;
      } catch (error: any) {
        throw new BadRequestError(error);
      }
    }
    //Samity Update application
    else if (payload.serviceName === "samityUpdate") {
      payload.data.userId = payload.createdBy;
      payload.data.userType = "user";
      payload.data.remarks = checkVal;
      payload.data = {
        ...payload.data,
        samityMinMember: payload.data.samityMinMember ? payload.data.samityMinMember : 0,
        samityMaxMember: payload.data.samityMaxMember ? payload.data.samityMaxMember : 0,
        groupMinMember: payload.data.groupMinMember ? payload.data.groupMinMember : 0,
        groupMaxMember: payload.data.groupMaxMember ? payload.data.groupMaxMember : 0,
        samityMemberType: (
          await pool.query("SELECT id FROM master.code_master WHERE return_value = $1", [payload.data.samityMemberType])
        ).rows[0]?.id,
        memberMinAge: payload.data.memberMinAge ? payload.data.memberMinAge : 0,
        memberMaxAge: payload.data.memberMaxAge ? payload.data.memberMaxAge : 0,
      };

      const checkExistingSamityUpdateApplicationSql = `SELECT 
                                                        id, 
                                                        data 
                                                      FROM 
                                                        temps.application 
                                                      WHERE 
                                                        samity_id = $1 
                                                        AND service_id = $2 
                                                        AND status = 'P'`;
      const checkExistingSamityUpdateApplication = (
        await pool.query(checkExistingSamityUpdateApplicationSql, [payload.samityId, payload.serviceId])
      ).rows[0];
      if (checkExistingSamityUpdateApplication?.id) {
        let { sql, params } = buildUpdateWithWhereSql(
          "temps.application",
          { id: checkExistingSamityUpdateApplication.id },
          {
            data: { ...checkExistingSamityUpdateApplication.data, ...payload.data },
            nextAppDesignationId: payload.nextAppDesignationId,
          }
        );
        result = await (await pool.query(sql, params)).rows[0];
      } else {
        let { sql, params } = buildInsertSql("temps.application", {
          ...lodash.omit(payload, ["officeId", "serviceName"]),
          remarks: checkVal,
        });

        result = await (await pool.query(sql, params)).rows[0];
      }
    }

    // DPS Application
    else if (payload.serviceName === "dpsApplication") {
      payload.data = {
        ...payload.data,
        userId: payload.createdBy,
        userType: "user",
      };
      const dpsApplication: DpsApplicationServices = Container.get(DpsApplicationServices);
      result = await dpsApplication.dpsApplicationCreate(payload, pool);
    } else if (payload.serviceName === "storeInMigration") {
      payload.data.remarks = payload?.data?.storeInType?.name;
      const arrayOfStoreId = payload?.data?.itemData?.map((item: any) => item.storeId);
      const uniqueStoreIds = findUniqueValueFromAnArrayOfInteger(arrayOfStoreId);
      for (const storeId of uniqueStoreIds) {
        const validationSql = `SELECT count(id)
        FROM temps.application
        WHERE data -> 'item_data' -> 0 ->> 'store_id' = $1 
        and status ='P' and service_id =21`;
        const validationQueryResultCount = (await pool.query(validationSql, [storeId])).rows[0].count;

        if (validationQueryResultCount > 0) {
          throw new BadRequestError("ইতিমধ্যে একটি আবেদন অনুমোদনের জন্য অপেক্ষমান রয়েছে");
        }
      }

      let { sql, params } = buildInsertSql("temps.application", {
        ...lodash.omit(payload, ["officeId", "serviceName"]),
      });
      result = await (await pool.query(sql, params)).rows[0];
    } else if (payload.serviceName === "inventoryItemRequisition") {
      let { sql, params } = buildInsertSql("temps.application", {
        ...lodash.omit(payload, ["officeId", "serviceName"]),
      });
      result = await (await pool.query(sql, params)).rows[0];
    } else if (payload.serviceName === "inventoryItemReturn") {
      let { sql, params } = buildInsertSql("temps.application", {
        ...lodash.omit(payload, ["officeId", "serviceName"]),
      });
      result = await (await pool.query(sql, params)).rows[0];
    } else if (payload.serviceName === "savingsProduct") {
      payload.data = {
        ...payload.data,
        userId: payload.createdBy,
        userType: "user",
      };
      let { sql, params } = buildInsertSql("temps.application", {
        ...lodash.omit(payload, ["officeId", "serviceName"]),
      });
      result = await (await pool.query(sql, params)).rows[0];
      // !result.next_app_designation_id ? result.message="আবেদনটি সফলভাবে সংরক্ষণ করা হয়েছে":"";
    } else if (payload.serviceName === "purchaseOrder") {
      for (const [index, value] of payload.data.documentList.entries()) {
        let buffer: any;
        let fileName: any;
        let mRes;
        let documentFront = "";
        let documentBack = "";
        if (value.documentPictureFront && value.documentPictureFrontType) {
          buffer = Buffer.from(value.documentPictureFront, "base64");
          if (buffer) {
            fileName = `purchase-order-${payload.data.purchaseDetailInfo.orderNumber}-${new Date().getTime()}.${
              String(value.documentPictureFrontType).split("/")[1]
            }`;
            mRes = await upload({
              fileName: fileName,
              buffer: buffer,
            });
          }
          if (mRes) documentFront = fileName;

          buffer = "";
          fileName = "";
          mRes = "";
        }
        if (value.documentPictureBack && value.documentPictureBackType) {
          buffer = Buffer.from(value.documentPictureBack, "base64");
          if (buffer) {
            fileName = `purchase-order-${payload.data.purchaseDetailInfo.orderNumber}-${new Date().getTime()}.${
              String(value.documentPictureBackType).split("/")[1]
            }`;
            mRes = await upload({
              fileName: fileName,
              buffer: buffer,
            });
          }
          if (mRes) documentBack = fileName;
          buffer = "";
          fileName = "";
          mRes = "";
        }

        const dataService: DataService = Container.get(DataService);
        const docTypeId = await dataService.getDocTypeId(value.documentType.toString(), pool);
        payload.data.documentList[index] = {
          documentTypeId: docTypeId,
          documentType: value.documentType.toString(),
          documentNumber: value.documentNumber ? value.documentNumber : null,
          documentFront: documentFront ? documentFront : "",
          documentBack: documentBack ? documentBack : "",
          docTypeDesc: value.docTypeDesc ? value.docTypeDesc : "",
          status: true,
        };
      }
      let { sql, params } = buildInsertSql("temps.application", {
        ...lodash.omit(payload, ["officeId", "serviceName"]),
      });
      result = await (await pool.query(sql, params)).rows[0];
    } else if (payload.serviceName === "cashWithdraw") {
      payload.data = {
        ...payload.data,
        userId: payload.createdBy,
        userType: "user",
      };
      const cashWithdrawApplicationServices: CashWithdrawApplicationServices = Container.get(
        CashWithdrawApplicationServices
      );
      result = await cashWithdrawApplicationServices.createCashWithdrawApplication(payload, pool);

      //update product application
    } else if (payload.serviceName === "reverseTransaction") {
      payload.data = {
        ...payload.data,
        userId: payload.createdBy,
        userType: "user",
      };

      const reverseTranApplicationService: ReverseTranApplicationService = Container.get(ReverseTranApplicationService);
      result = await reverseTranApplicationService.createReverseApplication(payload, pool);
    }
    // dps close
    else if (payload.serviceName === "dpsClose") {
      if (payload?.data) {
        const dpsService: DpsService = Container.get(DpsService);
        const dpsInfo = (await dpsService.getAccountDetails(payload.data.customerAcc)) as any;

        payload.data = {
          ...payload.data,
          unpaidInsNumber: Number(dpsInfo?.totalIns) - Number(dpsInfo?.paidIns),
          maturityAmount: Number(dpsInfo?.maturityAmount),
        };
      }
      payload.data = {
        ...payload.data,
        userId: payload.createdBy,
        userType: "user",
      };

      let { sql, params } = buildInsertSql("temps.application", {
        ...lodash.omit(payload, ["officeId", "serviceName"]),
      });
      result = await (await pool.query(sql, params)).rows[0];
    } else if (payload.serviceName === "fdrApplication") {
      payload.data = {
        ...payload.data,
        userId: payload.createdBy,
        userType: "user",
      };
      let fileName, buffer, mRes;
      for (const [nomineeIndex, nomineeValue] of payload.data.nomineeInfo.entries()) {
        if (nomineeValue.nomineePicture && nomineeValue.nomineePictureType) {
          buffer = Buffer.from(nomineeValue.nomineePicture, "base64");
          if (buffer) {
            fileName = `nominee-${new Date().getTime()}.${String(nomineeValue.nomineePictureType).split("/")[1]}`;
            mRes = await upload({
              fileName: fileName,
              buffer: buffer,
            });
          }
          if (mRes) {
            nomineeValue.nomineePicture = fileName;
          }
        }
        if (nomineeValue.nomineeSign && nomineeValue.nomineeSignType) {
          buffer = Buffer.from(nomineeValue.nomineeSign, "base64");
          if (buffer) {
            fileName = `nominee-${new Date().getTime()}..${String(nomineeValue.nomineeSignType).split("/")[1]}`;
            mRes = await upload({
              fileName: fileName,
              buffer: buffer,
            });
          }
          if (mRes) {
            nomineeValue.nomineeSign = fileName;
          }
        }
        payload.data.nomineeInfo[nomineeIndex] = nomineeValue;
      }
      let { sql, params } = buildInsertSql("temps.application", {
        ...lodash.omit(payload, ["officeId", "serviceName"]),
      });
      result = await (await pool.query(sql, params)).rows[0];
    } else if (payload.serviceName === "loanSettlement") {
      payload.data = {
        ...payload.data,
        userId: payload.createdBy,
        userType: "user",
      };
      const loanSettlementApplicationServices: LoanSettlementApplicationServices = Container.get(
        LoanSettlementApplicationServices
      );
      result = await loanSettlementApplicationServices.createLoanSettlementApplication(payload, pool);
    } else if (payload.serviceName === "fdrClose") {
      payload.data = {
        ...payload.data,
        userId: payload.createdBy,
        userType: "user",
      };
      let { sql, params } = buildInsertSql("temps.application", {
        ...lodash.omit(payload, ["officeId", "serviceName"]),
      });
      result = await (await pool.query(sql, params)).rows[0];
    } else if (payload.serviceName === "loanAdjustment") {
      payload.data = {
        ...payload.data,
        userId: payload.createdBy,
        userType: "user",
      };
      const loanAdjustmentApplicationServices: LoanAdjustmentApplicationServices = Container.get(
        LoanAdjustmentApplicationServices
      );
      result = await loanAdjustmentApplicationServices.createLoanAdjustmentApplication(payload, pool);
    }
    //for others
    else {
      throw new BadRequestError("সেবাটি খুঁজে পাওয়া যায়নি");
    }
    // const serviceAction = await ServiceInfoService.getServiceActionById(payload.serviceId, data.serviceActionId);
    // const notificationService = Container.get(NotificationService);
    // await notificationService.create(serviceAction.notification as notificationObject, {
    //   userType: applicationData.data.userType,
    //   userId: applicationData.data.userId,
    //   doptorId: data.doptorId,
    //   payload.serviceId,
    //   componentId: 1,
    //   message: await notificationService.createCustomNotificationMessageForLoan(serviceId, data.applicationId),
    //   applicationStatus: applicationData.status,
    //   applicationId: applicationData.id,
    //   serviceActionId: data.serviceActionId,
    //   createdBy: userId.toString(),
    // });

    return result ? (toCamelKeys(result) as any) : new BadRequestError("অসফল");
  }

  async getLoanInfoMigrationOfMembersDe(appId: number, type: string, componentId: number, pool: Pool | PoolClient) {
    const sql = `select 
                  arr.items -> 'loan_info' as loanInfo, 
                  arr.items -> 'schedule_info' as scheduleInfo, 
                  b.name_bn, 
                  b.father_name, 
                  b.customer_code, 
                  b.customer_old_code 
                from 
                  temps.application a, 
                  jsonb_array_elements (data -> 'loan_info_schedules') with ordinality arr(items, position) 
                  inner join samity.customer_info b on arr.items -> 'loan_info' ->> 'customer_old_code' = b.customer_old_code 
                where 
                  a.samity_id = b.samity_id 
                  and a.id = $1 
                  and a.component_id = $2`;
    let data: any = (await pool.query(sql, [appId, componentId])).rows;
    data = data ? toCamelKeys(data) : data;
    const samitySql = `	select b.id,b.samity_code, b.samity_name,b.project_id,b.doptor_id,b.office_id, b.address,a.service_id from temps.application a
    inner join samity.samity_info b on b.id = a.samity_id where a.id = $1 and a.component_id =$2`;
    let samityData = (await pool.query(samitySql, [appId, componentId])).rows[0];
    samityData = samityData ? toCamelKeys(samityData) : {};

    const finalInfo = {
      serviceId: samityData.serviceId,
      samityInfo: { ...samityData },
      type: type,
      details: {
        data,
        applicationId: appId,
        serviceId: data.serviceId,
      },
    };

    return finalInfo ? toCamelKeys(finalInfo) : {};
  }
  async updateApplication(payload: any, id: number, next: NextFunction) {
    if (!id) throw new BadRequestError(`আবেদনটি বিদ্যমান নেই`);
    const pool = db.getConnection();
    const getAppSql = `SELECT project_id, doptor_id, data FROM temps.application WHERE id = $1`;
    const getApp = (await pool.query(getAppSql, [id])).rows[0].data;
    const doptorId = (await pool.query(getAppSql, [id])).rows[0].doptor_id;
    const projectId = (await pool.query(getAppSql, [id])).rows[0].project_id;
    let result;
    if (payload.serviceName === "memberCreate") {
      const samityApplicationService: SamityApplicationService = Container.get(SamityApplicationService);
      let buffer: any;
      let fileName: any;
      let mRes;
      const samityService: SamityService = Container.get(SamityService);
      const nextAppDesignationIdKeyCheckInPayload = "nextAppDesignationId" in payload;
      if (nextAppDesignationIdKeyCheckInPayload) {
        const projectIds = await this.getPermitProjectIds(payload.nextAppDesignationId);

        if (projectId && !projectIds.includes(Number(projectId)))
          throw new BadRequestError(`বাছাইকৃত প্রকল্পটিতে পর্যবেক্ষক/ অনুমোদনকারীর অনুমতি নেই`);

        const { sql: samityAppUpdateSql, params: samityAppUpdateParams } = buildUpdateWithWhereSql(
          "temps.application",
          { id },
          { nextAppDesignationId: payload.nextAppDesignationId }
        );
        result = (await pool.query(samityAppUpdateSql, samityAppUpdateParams)).rows[0];
        if (doptorId != 3 && doptorId != 10) return result ? (toCamelKeys(result) as any) : {};
      }

      await memberDocumentValidation(payload.memberInfo, payload.doptorId, payload.operation, pool);
      const status = await this.getProjectConfig(payload.memberInfo[0].data.projectId);
      if (status) await nomineeDocumentValidation(payload.memberInfo, payload.doptorId);
      // const memberDocumentsValidate = samityApplicationService.memberDocumentsValidate(payload.memberInfo, doptorId);
      if (payload.operation == "edit") {
        if (payload.memberInfo[0].data.memberDocuments) {
          for (let [memberDocIndex, memberDoc] of payload.memberInfo[0].data.memberDocuments.entries()) {
            //document front image
            if (memberDoc.documentFront && memberDoc.documentFrontType) {
              buffer = Buffer.from(memberDoc.documentFront, "base64");
              if (buffer) {
                fileName = `member-${new Date().getTime()}.${String(memberDoc.documentFrontType).split("/")[1]}`;
                mRes = await upload({
                  fileName: fileName,
                  buffer: buffer,
                });
              }
              if (mRes) {
                memberDoc.documentFront = fileName;
              }
            } else {
              let docData = getApp.member_info[payload.index].data.member_documents.filter(
                (value: any) => value.document_type == memberDoc.documentType
              );
              memberDoc.documentFront = docData[0]?.document_front ? docData[0].document_front : "";
            }
            //document back image
            if (memberDoc.documentBack && memberDoc.documentBackType) {
              buffer = Buffer.from(memberDoc.documentBack, "base64");
              if (buffer) {
                fileName = `member-${new Date().getTime()}.${String(memberDoc.documentBackType).split("/")[1]}`;
                mRes = await upload({
                  fileName: fileName,
                  buffer: buffer,
                });
              }
              if (mRes) {
                memberDoc.documentBack = fileName;
              }
            } else {
              let docData = getApp.member_info[payload.index].data.member_documents.filter(
                (value: any) => value.document_type == memberDoc.documentType
              );
              memberDoc.documentBack = docData[0]?.document_back ? docData[0].document_back : "";
            }

            payload.memberInfo[0].data.memberDocuments[memberDocIndex] = memberDoc;
          }
        }

        //member image
        if (payload.memberInfo[0].memberPicture && payload.memberInfo[0].memberPictureType) {
          buffer = Buffer.from(payload.memberInfo[0].memberPicture, "base64");
          if (buffer) {
            fileName = `member-${new Date().getTime()}.${
              String(payload.memberInfo[0].memberPictureType).split("/")[1]
            }`;
            mRes = await upload({
              fileName: fileName,
              buffer: buffer,
            });
          }
          if (mRes) {
            payload.memberInfo[0].memberPicture = fileName;
          }
        } else {
          let memberPictureName = getApp.member_info[payload.index]?.member_picture;
          payload.memberInfo[0].memberPicture = memberPictureName ? memberPictureName : "";
        }

        //member sign image
        if (payload.memberInfo[0].memberSign && payload.memberInfo[0].memberSignType) {
          buffer = Buffer.from(payload.memberInfo[0].memberSign, "base64");
          if (buffer) {
            fileName = `member-${new Date().getTime()}.${String(payload.memberInfo[0].memberSignType).split("/")[1]}`;
            mRes = await upload({
              fileName: fileName,
              buffer: buffer,
            });
          }
          if (mRes) {
            payload.memberInfo[0].memberSign = fileName;
          }
        } else {
          let memberSignName = getApp.member_info[payload.index]?.member_sign;
          payload.memberInfo[0].memberSign = memberSignName ? memberSignName : "";
        }

        for (let [nomineeIndex, nominee] of payload.memberInfo[0].nominee.entries()) {
          //nominee picture
          if (nominee.nomineePicture && nominee.nomineePictureType) {
            buffer = Buffer.from(nominee.nomineePicture, "base64");
            if (buffer) {
              fileName = `nominee-${new Date().getTime()}.${String(nominee.nomineePictureType).split("/")[1]}`;
              mRes = await upload({
                fileName: fileName,
                buffer: buffer,
              });
            }
            if (mRes) {
              nominee.nomineePicture = fileName;
            }
          } else {
            let nomineePictureName = getApp.member_info[payload.index].nominee[nomineeIndex]?.nominee_picture;
            nominee.nomineePicture = nomineePictureName ? nomineePictureName : "";
          }

          //nominee sign
          if (nominee.nomineeSign && nominee.nomineeSignType) {
            buffer = Buffer.from(nominee.nomineeSign, "base64");
            if (buffer) {
              fileName = `nominee-${new Date().getTime()}.${String(nominee.nomineeSignType).split("/")[1]}`;
              mRes = await upload({
                fileName: fileName,
                buffer: buffer,
              });
            }
            if (mRes) {
              nominee.nomineeSign = fileName;
            }
          } else {
            let nomineeSignName = getApp.member_info[payload.index].nominee[nomineeIndex]?.nominee_sign;
            nominee.nomineeSign = nomineeSignName ? nomineeSignName : "";
          }
        }
        getApp.member_info[payload.index] = payload.memberInfo[0];
        const { sql, params } = buildUpdateWithWhereSql("temps.application", { id }, { data: getApp });
        result = (await pool.query(sql, params)).rows[0];
        return result ? toCamelKeys(result) : {};
      }
      if (payload.operation == "delete") {
        getApp.member_info.splice(payload.index, 1);
        const { sql, params } = buildUpdateWithWhereSql("temps.application", { id }, { data: getApp });
        result = (await pool.query(sql, params)).rows[0];
        return result ? toCamelKeys(result) : {};
      }
      const memberNoValidate = await samityService.validateMember(id, getApp, payload.memberInfo);
      for (let [memberIndex, value] of payload.memberInfo.entries()) {
        if (value.data.memberDocuments) {
          for (let [index, memberDoc] of value.data.memberDocuments.entries()) {
            if (memberDoc.documentFront && memberDoc.documentFrontType) {
              buffer = Buffer.from(memberDoc.documentFront, "base64");
              if (buffer) {
                fileName = `member-${new Date().getTime()}.${String(memberDoc.documentFrontType).split("/")[1]}`;
                mRes = await upload({
                  fileName: fileName,
                  buffer: buffer,
                });
              }
              if (mRes) {
                value.data.memberDocuments[index].documentFront = fileName;
              }
            }
            if (memberDoc.documentBack && memberDoc.documentBackType) {
              buffer = Buffer.from(memberDoc.documentBack, "base64");
              if (buffer) {
                fileName = `member-${new Date().getTime()}.${String(memberDoc.documentBackType).split("/")[1]}`;
                mRes = await upload({
                  fileName: fileName,
                  buffer: buffer,
                });
              }
              if (mRes) {
                value.data.memberDocuments[index].documentBack = fileName;
              }
            }
          }
        }

        if (value.memberPicture && value.memberPictureType) {
          buffer = Buffer.from(value.memberPicture, "base64");
          if (buffer) {
            fileName = `member-${new Date().getTime()}.${String(value.memberPictureType).split("/")[1]}`;
            mRes = await upload({
              fileName: fileName,
              buffer: buffer,
            });
          }
          if (mRes) {
            value.memberPicture = fileName;
          }
        }

        if (value.memberSign && value.memberSignType) {
          buffer = Buffer.from(value.memberSign, "base64");
          if (buffer) {
            fileName = `member-${new Date().getTime()}.${String(value.memberSignType).split("/")[1]}`;
            mRes = await upload({
              fileName: fileName,
              buffer: buffer,
            });
          }
          if (mRes) {
            value.memberSign = fileName;
          }
        }
        if (value.nominee && value.nominee[0]) {
          for (const [nomineeIndex, nomineeValue] of value.nominee.entries()) {
            if (nomineeValue.nomineePicture && nomineeValue.nomineePictureType) {
              buffer = Buffer.from(nomineeValue.nomineePicture, "base64");
              if (buffer) {
                fileName = `nominee-${new Date().getTime()}.${String(nomineeValue.nomineePictureType).split("/")[1]}`;
                mRes = await upload({
                  fileName: fileName,
                  buffer: buffer,
                });
              }
              if (mRes) {
                nomineeValue.nomineePicture = fileName;
              }
            }
            if (nomineeValue.nomineeSign && nomineeValue.nomineeSignType) {
              buffer = Buffer.from(nomineeValue.nomineeSign, "base64");
              if (buffer) {
                fileName = `nominee-${new Date().getTime()}..${String(nomineeValue.nomineeSignType).split("/")[1]}`;
                mRes = await upload({
                  fileName: fileName,
                  buffer: buffer,
                });
              }
              if (mRes) {
                nomineeValue.nomineeSign = fileName;
              }
            }
            value.nominee[nomineeIndex] = nomineeValue;
          }
        }
        payload.memberInfo[memberIndex] = value;
      }
      const members = [...getApp.member_info, ...payload.memberInfo];

      getApp.member_info = members;
      const { sql, params } = buildUpdateWithWhereSql("temps.application", { id }, { data: getApp });
      result = (await pool.query(sql, params)).rows[0];
    } else if (payload.serviceName === "loanMigrationUpdate") {
      const migrationService = Container.get(SamityMigrationService);
      migrationService.updateLoanInfo(Number(id), payload, pool);
      return;
    } else {
      if (payload.serviceName === "samityCreate") {
        if (payload?.data?.basic?.flag && payload.data.basic.flag == 1) {
          payload.data.basic.coopStatus = true;
        }
        payload.data.setup = {
          samityMinMember: payload.data.setup.samityMinMember ? payload.data.setup.samityMinMember : 0,
          samityMaxMember: payload.data.setup.samityMaxMember ? payload.data.setup.samityMaxMember : 0,
          groupMinMember: payload.data.setup.groupMinMember ? payload.data.setup.groupMinMember : 0,
          groupMaxMember: payload.data.setup.groupMaxMember ? payload.data.setup.groupMaxMember : 0,
          shareAmount: payload.data.setup.shareAmount ? payload.data.setup.shareAmount : 0,
          samityMemberType: (
            await pool.query("SELECT id FROM master.code_master WHERE return_value = $1", [
              payload.data.setup.samityMemberType,
            ])
          ).rows[0]?.id,
          memberMinAge: payload.data.setup.memberMinAge ? payload.data.setup.memberMinAge : 0,
          memberMaxAge: payload.data.setup.memberMaxAge ? payload.data.setup.memberMaxAge : 0,
        };
      }
      const data = {
        ...getApp,
        ...lodash.omit(payload.data, ["updatedBy", "updatedAt"]),
      };
      const nextAppDesignationId = payload.nextAppDesId ? Number(payload.nextAppDesId) : null;
      if (payload.nextAppDesId) {
        const projectIds = await this.getPermitProjectIds(payload.nextAppDesId);
        if (!projectIds.includes(Number(payload.projectId)))
          throw new BadRequestError(`বাছাইকৃত প্রকল্পটিতে পর্যবেক্ষক/ অনুমোদনকারীর অনুমতি নেই`);
      }
      const { sql, params } = buildUpdateWithWhereSql(
        "temps.application",
        { id },
        {
          data,
          nextAppDesignationId,
          updatedBy: payload.updatedBy,
          updatedAt: payload.updatedAt,
        }
      );
      result = (await pool.query(sql, params)).rows[0];
    }

    return result ? (toCamelKeys(result) as any) : {};
  }

  async getPendingApplication(
    userId: number,
    doptorId: number,
    projectId: number,
    serviceId: number,
    allProjects: number[] | null,
    componentId: number
  ) {
    const pool = db.getConnection("slave");
    let sql;
    let appList;
    const senderDetailsSql = `SELECT 
                                a.id, 
                                a.user_id, 
                                b.name 
                              FROM 
                                temps.application_approval a 
                                INNER JOIN users.user b ON a.user_id = b.id 
                              WHERE 
                                a.id =(
                                  SELECT 
                                    Max (a.id) 
                                  FROM 
                                    temps.application_approval a 
                                  WHERE 
                                    a.application_id = $1
                                ) 
                                AND a.application_id = $1`;
    let userInfoSql = `SELECT name FROM users.user WHERE id = $1`;
    if (projectId > 0 && serviceId === 0) {
      sql = `SELECT 
              a.id, 
              COALESCE(
                c.samity_name, data -> 'basic' ->> 'samity_name', 
                ''
              ) samity_name, 
              d.project_name_bangla, 
              b.id as service_id, 
              b.service_name, 
              data ->> 'remarks' as description, 
              TO_CHAR(a.created_at, 'dd/mm/yyyy') AS application_date, 
              a.created_by 
            FROM 
              temps.application a 
              INNER JOIN master.service_info b ON a.service_id = b.id FULL 
              OUTER JOIN samity.samity_info c ON a.samity_id = c.id FULL 
              OUTER JOIN master.project_info d ON a.project_id = d.id 
            WHERE 
              a.next_app_designation_id = $1 
              AND a.doptor_id = $2 
              AND a.project_id = $3
              AND a.component_id = $4
            ORDER BY 
              a.id ASC`;
      appList = (await pool.query(sql, [userId, doptorId, projectId, componentId])).rows;
      for (let [index, singleApp] of appList.entries()) {
        let senderInfo = (await pool.query(senderDetailsSql, [singleApp.id])).rows[0]?.name;
        if (!senderInfo) senderInfo = (await pool.query(userInfoSql, [singleApp.created_by])).rows[0]?.name;
        appList[index] = { ...appList[index], sender: senderInfo };
      }
    } else if (projectId === 0 && serviceId > 0) {
      sql = `
          SELECT 
            a.id, 
            COALESCE(
              c.samity_name, data -> 'basic' ->> 'samity_name', 
              ''
            ) samity_name, 
            d.project_name_bangla, 
            b.id as service_id, 
            b.service_name, data ->> 'remarks' as description,
            TO_CHAR(a.created_at, 'dd/mm/yyyy') AS application_date,
            a.created_by
          FROM temps.application a 
            INNER JOIN master.service_info b ON a.service_id = b.id 
            FULL OUTER JOIN samity.samity_info c ON a.samity_id = c.id 
            FULL OUTER JOIN master.project_info d ON a.project_id = d.id 
          WHERE 
            a.next_app_designation_id = $1 AND 
            a.doptor_id = $2 AND 
            a.service_id = $3 AND 
            a.component_id = $4
          ORDER BY a.id ASC`;
      appList = await (await pool.query(sql, [userId, doptorId, serviceId, componentId])).rows;
      for (let [index, singleApp] of appList.entries()) {
        let senderInfo = (await pool.query(senderDetailsSql, [singleApp.id])).rows[0]?.name;
        if (!senderInfo) senderInfo = (await pool.query(userInfoSql, [singleApp.created_by])).rows[0]?.name;
        appList[index] = { ...appList[index], sender: senderInfo };
      }
    } else if (projectId > 0 && serviceId > 0) {
      sql = `
          SELECT 
            a.id, 
            COALESCE(
              c.samity_name, data -> 'basic' ->> 'samity_name', 
              ''
            ) samity_name,
            d.project_name_bangla, 
            b.id as service_id, 
            b.service_name, data ->> 'remarks' as description,
            TO_CHAR(a.created_at, 'dd/mm/yyyy') AS application_date,
            a.created_by
          FROM temps.application a 
            INNER JOIN master.service_info b ON a.service_id = b.id 
            FULL OUTER JOIN samity.samity_info c ON a.samity_id = c.id 
            FULL OUTER JOIN master.project_info d ON a.project_id = d.id 
          WHERE 
            a.next_app_designation_id = $1 AND 
            a.doptor_id = $2 AND 
            a.project_id = $3 AND 
            a.service_id = $4 AND 
            a.component_id = $5
          ORDER BY a.id ASC`;
      appList = (await pool.query(sql, [userId, doptorId, projectId, serviceId, componentId])).rows;
      for (let [index, singleApp] of appList.entries()) {
        let senderInfo = (await pool.query(senderDetailsSql, [singleApp.id])).rows[0]?.name;
        if (!senderInfo) senderInfo = (await pool.query(userInfoSql, [singleApp.created_by])).rows[0]?.name;
        appList[index] = { ...appList[index], sender: senderInfo };
      }
    } else {
      sql = `
          SELECT 
            a.id, 
            COALESCE(
              c.samity_name, data -> 'basic' ->> 'samity_name', 
              ''
            ) samity_name, 
            d.project_name_bangla, 
            b.id as service_id, 
            b.service_name, 
            data ->> 'remarks' as description, 
            TO_CHAR(a.created_at, 'dd/mm/yyyy') AS application_date,
            a.created_by
          FROM 
            temps.application a 
            INNER JOIN master.service_info b ON a.service_id = b.id FULL 
            OUTER JOIN samity.samity_info c ON a.samity_id = c.id FULL 
            OUTER JOIN master.project_info d ON a.project_id = d.id 
          WHERE 
            a.next_app_designation_id = $1 
            AND a.doptor_id = $2 
            AND (
              a.project_id = ANY($3 :: int[]) 
              OR a.project_id is NULL
            )
            AND a.component_id = $4 
          ORDER BY 
            a.id ASC`;
      appList = (await pool.query(sql, [userId, doptorId, allProjects, componentId])).rows;
      for (let [index, singleApp] of appList.entries()) {
        let senderInfo = (await pool.query(senderDetailsSql, [singleApp.id])).rows[0]?.name;
        if (!senderInfo) senderInfo = (await pool.query(userInfoSql, [singleApp.created_by])).rows[0]?.name;
        appList[index] = { ...appList[index], sender: senderInfo };
      }
    }

    return appList.length > 0 ? (toCamelKeys(appList) as any) : [];
  }

  async getAppInitialData(id: number) {
    const pool = db.getConnection("slave");
    const appDataSql = `
            SELECT project_id, service_id,samity_id, data FROM temps.application WHERE id = $1`;
    const appData = (await pool.query(appDataSql, [id])).rows[0];
    if (appData?.data) {
      appData.data["projectId"] = appData?.project_id;
      appData.data["samityId"] = appData?.samity_id;
    }
    const camelCaseAppData = toCamelKeys(appData.data) as any;

    const getGlNameSql = `SELECT glac_name FROM loan.glac_mst WHERE id = $1`;
    const getDocTypeNameSql = `SELECT doc_type_desc FROM master.document_type WHERE id = $1`;
    const getChargeTypeNameSql = `SELECT charge_type_desc FROM loan.product_charge_type WHERE id = $1`;
    const getSegregationSectorNameSql = `SELECT segregation_sector_name FROM loan.service_charge_seg_list WHERE id = $1`;
    let productCharge = [] as any;
    if (camelCaseAppData?.productCharge) {
      camelCaseAppData.productCharge?.map(async (value: any, index: number) => {
        let chargeCreditglName = (await pool.query(getGlNameSql, [value.chargeCreditgl])).rows[0].glac_name;

        let chargeFullName = (await pool.query(getChargeTypeNameSql, [value.chargeName])).rows[0].charge_type_desc;
        value[chargeCreditglName] = chargeCreditglName;
        value[chargeFullName] = chargeFullName;
        productCharge.push(value);
      });
    }

    return camelCaseAppData;
  }
  async getCustomerInfo(
    customerId: number,
    creditRatingStatus: number,
    productId?: number | null,
    accountId?: number | null
  ) {
    const pool = db.getConnection("slave");
    let sql = "";
    let service;

    if (creditRatingStatus == 1) {
      sql = `
        SELECT 
          a.account_status, 
          a.close_date, 
          a.id account_id, 
          b.product_name, 
          b.product_type,
          a.account_no, 
          c.current_balance, 
          a.open_date 
        FROM 
          loan.account_info a 
          INNER JOIN loan.product_mst b ON a.product_id = b.id 
          INNER JOIN loan.account_balance c ON a.id = c.account_id 
        WHERE 
          a.customer_id = $1`;
      service = (await pool.query(sql, [customerId])).rows;
    } else if (creditRatingStatus == 2) {
      sql = `SELECT * FROM loan.schedule_info WHERE customer_id=$1 AND product_id=$2 AND account_id=$3 ORDER BY installment_no`;
      service = await (await pool.query(sql, [customerId, productId, accountId])).rows;
    } else throw new BadRequestError(`Invalid Status`);
    //
    return service.length > 0 ? (toCamelKeys(service) as any) : [];
  }

  async getByService(type: string, query: string, queryParams: any | undefined) {
    let result;
    const queryText = query;
    const pool = db.getConnection("slave");
    if (queryParams) {
      result = await (await pool.query(queryText, Object.values(queryParams))).rows;
    } else {
      result = await (await pool.query(queryText)).rows;
    }

    return result;
  }

  async getSingleApplicationDetails(id: number, serviceId: number, componentId: number, isArchive?: string) {
    const pool = isArchive ? db.getConnection("archive") : db.getConnection("slave");
    let result;
    let type;
    if (serviceId === 4) {
      const projectService: ProjectService = Container.get(ProjectService);
      type = serviceType[4];
      result = await projectService.getUserWiseProjectDetails(id, type, componentId, pool);
    } else if (serviceId === 2) {
      type = serviceType[2];
      result = await this.getSamityUpdateAppInfo(id, type, componentId, pool);
    } else if (serviceId === 7) {
      type = serviceType[7];
      result = await this.getSactionAppDetails(id, type, componentId, pool);
    } else if (serviceId === 8) {
      type = serviceType[8];
      result = await this.getFieldOfficerAppDetails(id, type, componentId, pool);
    } else if (serviceId === 9) {
      type = serviceType[9];
      result = await this.getLoanScheduleData(id, type, componentId, pool);
    } else if (serviceId === 10) {
      type = serviceType[10];
      result = await this.getSubLedgerData(id, type, componentId, pool);
    } else if (serviceId === 11) {
      type = serviceType[11];
      result = await this.getProductAppDetails(id, type, componentId, pool);
    } else if (serviceId === 12) {
      type = serviceType[12];
      result = await this.getUpdateProductAppDetails(id, type, componentId, pool);
    } else if (serviceId === 13) {
      type = serviceType[13];
      result = await this.getUpdateFieldOfficerAppDetails(id, type, componentId, pool);
    } else if (serviceId === 14) {
      type = serviceType[14];
      result = await this.getMainSamityWithMembersAppDetails(id, type, componentId, pool);
    } else if (serviceId === 15) {
      type = serviceType[15];
      result = await this.getSamityWithMembersAppDetails(id, type, componentId, pool);
    } else if (serviceId === 16) {
      type = serviceType[16];
      result = await this.getBalanceMigrationDetails(id, type, componentId, pool);
    } else if (serviceId === 17) {
      type = serviceType[17];
      result = await this.getLoanInfoMigrationOfMembersDe(id, type, componentId, pool);
    } else if (serviceId === 18) {
      type = serviceType[18];
      result = await this.getMainMemberUpdateAppInfo(id, type, componentId, pool);
    } else if (serviceId === 19) {
      const dpsServiceInfo: DpsApplicationServices = Container.get(DpsApplicationServices);
      type = serviceType[19];
      result = await dpsServiceInfo.dpsApplicationInfo(id, type, componentId, pool);
    } else if (serviceId == 20) {
      type = serviceType[20];
      const savingsProductService: SavingsProductService = Container.get(SavingsProductService);
      result = await savingsProductService.getSavingsProductAppInfo(id, type, componentId, pool);
    } else if (serviceId === 21) {
      const storeInMigrationService: StoreInMigrationService = Container.get(StoreInMigrationService);
      type = serviceType[21];
      result = await storeInMigrationService.getStoreInMigrationItemDetails(id, type, pool);
    } else if (serviceId === 22) {
      const itemRequisitionService: ItemRequisitionService = Container.get(ItemRequisitionService);
      type = serviceType[22];
      result = await itemRequisitionService.getRequisitionDetailsOfInventoryItem(id, type, pool);
    } else if (serviceId === 23) {
      type = serviceType[23];
      const purchaseOrderService: PurchaseOrderService = Container.get(PurchaseOrderService);
      result = await purchaseOrderService.getSinglePurchaseOrderDetails(id, type, pool);
    } else if (serviceId === 24) {
      type = serviceType[24];
      const cashWithdrawApplicationServices: CashWithdrawApplicationServices = Container.get(
        CashWithdrawApplicationServices
      );
      result = await cashWithdrawApplicationServices.getCashWithdrawApplicationDetails(id, type, componentId, pool);
    } else if (serviceId === 25) {
      type = serviceType[25];
      const reverseTranApplicationService: ReverseTranApplicationService = Container.get(ReverseTranApplicationService);
      result = await reverseTranApplicationService.reverseRequestInfo(id, type, componentId, pool);
    } else if (serviceId === 26) {
      type = serviceType[26];
      const dpsServiceInfo: DpsApplicationServices = Container.get(DpsApplicationServices);
      result = await dpsServiceInfo.dpsApplicationCloseInfo(id, type, componentId, pool);
    } else if (serviceId === 28) {
      type = serviceType[28];
      const loanSettlementApplicationServices: LoanSettlementApplicationServices = Container.get(
        LoanSettlementApplicationServices
      );
      result = await loanSettlementApplicationServices.getLoanSettlementApplicationDetails(id, type, componentId, pool);
    } else if (serviceId === 27) {
      type = serviceType[27];
      const fdrServiceInfo: FdrApplicationServices = Container.get(FdrApplicationServices);
      result = await fdrServiceInfo.getFdrApplicationInfo(id, type, componentId, pool);
    } else if (serviceId === 29) {
      type = serviceType[29];
      const fdrServiceInfo: FdrApplicationServices = Container.get(FdrApplicationServices);
      result = await fdrServiceInfo.fdrCloseInfo(id, type, componentId, pool);
    } else if (serviceId === 30) {
      type = serviceType[30];
      const productUpdateService: SavingsProductUpdateApplicationService = Container.get(
        SavingsProductUpdateApplicationService
      );
      result = await productUpdateService.getSavingsUpdateProductAppDetails(id, type, componentId, pool);
    } else if (serviceId === 31) {
      type = serviceType[31];
      const itemReturnService: ItemReturnService = Container.get(ItemReturnService);
      result = await itemReturnService.getReturnedItemsDetails(id, type, pool);
    } else if (serviceId === 32) {
      type = serviceType[32];
      const loanAdjustmentApplicationServices: LoanAdjustmentApplicationServices = Container.get(
        LoanAdjustmentApplicationServices
      );
      result = await loanAdjustmentApplicationServices.getLoanAdjustmentApplicationDetails(id, type, componentId, pool);
    } else {
      throw new BadRequestError(`সেবাটি খুঁজে পাওয়া যায়নি`);
    }
    return result ? (toCamelKeys(result) as any) : [];
  }
  async getSactionAppDetails(id: number, type: string, componentId: number, pool: Pool) {
    const customerIdSql = `SELECT CAST(data ->> 'customer_id' as integer) customer_id FROM temps.application a WHERE a.id = $1 and component_id = $2`;
    const customerId = (await pool.query(customerIdSql, [id, componentId])).rows[0].customer_id;
    const samityService: SamityService = Container.get(SamityService);
    const customerDetails = await samityService.getSingleMember(Number(customerId));

    const appDataSql = `
            SELECT 
              a.service_id,
              a.data, 
              b.samity_code, 
              b.samity_name,
              a.project_id
            FROM 
              temps.application a 
              INNER JOIN samity.samity_info b ON b.id = a.samity_id 
            WHERE 
              a.id = $1 and component_id = $2`;
    const appData = (await pool.query(appDataSql, [id, componentId])).rows[0];
    const getProductNameSql = `SELECT product_name FROM loan.product_mst WHERE id = $1`;
    if (appData?.data) {
      appData["data"]["productName"] = (
        await pool.query(getProductNameSql, [appData.data.product_id])
      ).rows[0]?.product_name;
    }
    appData.data.document_list.map(async (doc: any, index: number) => {
      const docTypeNameSql = `SELECT doc_type_desc FROM master.document_type WHERE doc_type = $1`;
      const docTypeName = (await pool.query(docTypeNameSql, [doc.document_type])).rows[0].doc_type_desc;
      appData.data.document_list[index] = { ...doc, docTypeName };
    });

    const finalInfo = {
      type: type,
      memberInfo: { ...customerDetails },
      applicationInfo: { ...appData.data, ...lodash.omit(appData, ["data"]) },
      history: await this.getAppHistory(id, pool),
    };
    const dataWithFiles = await minioPresignedGet(finalInfo, [
      "applicationInfo.document_list.[].document_front",
      "applicationInfo.document_list.[].document_back",
    ]);
    return dataWithFiles;
  }

  async getLoanScheduleData(appId: number, type: string, componentId: number, pool: Pool) {
    const customerIdSql = `SELECT CAST(data ->> 'customer_id' as integer) customer_id FROM temps.application a WHERE a.id = $1 and component_id = $2`;
    const customerId = (await pool.query(customerIdSql, [appId, componentId])).rows[0].customer_id;

    const samityService: SamityService = Container.get(SamityService);
    const customerDetails = await samityService.getSingleMember(Number(customerId));

    const appDataSql = `
            SELECT 
              a.doptor_id,
              a.service_id,
              a.data, 
              b.samity_code, 
              b.samity_name,
              a.project_id
            FROM 
              temps.application a 
              INNER JOIN samity.samity_info b ON b.id = a.samity_id 
            WHERE 
              a.id = $1 and component_id = $2`;
    const appData = (await pool.query(appDataSql, [appId, componentId])).rows[0];

    const loanSql = `
            SELECT 
              a.sanction_limit as loan_amount, 
              a.loan_term, 
              a.disbursed_amount,
              a.loan_frequency, 
              a.profit_amount as service_charge, 
              a.installment_amount, 
              a.installment_no, 
              a.service_charge_rate, 
              a.installment_frequency,
              b.purpose_name 
            FROM 
              loan.global_limit a 
              INNER JOIN master.loan_purpose b ON b.id = a.purpose_id 
            WHERE 
              a.customer_id = $1
              AND a.is_disbursed = false`;
    const loanInfo = (await pool.query(loanSql, [customerId])).rows[0];
    if (!loanInfo) throw new BadRequestError(`সদস্যের ঋণের তথ্য পাওয়া যায়নি`);
    const productSql = `SELECT cal_type, grace_amt_repay_ins, grace_period FROM loan.product_mst WHERE id = $1`;
    const productInfo = (await pool.query(productSql, [appData.data.product_id])).rows[0];

    const samitySql = `SELECT 
                        b.return_value AS meeting_day, 
                        a.week_position 
                      FROM 
                        samity.samity_info a 
                        INNER JOIN master.code_master b ON a.meeting_day = b.id 
                      WHERE 
                        a.id = $1`;
    const samityInfo = (await pool.query(samitySql, [appData.data.samity_id])).rows[0];
    const schedule = new ScheduleCalculator({
      principal: Number(loanInfo.loan_amount),
      loanTerm: Number(loanInfo.loan_term),
      rate: Number(loanInfo.service_charge_rate),
      type: productInfo.cal_type,
      installmentNumber: Number(loanInfo.installment_no),
      installmentType: loanInfo.installment_frequency,
      gracePeriodType: productInfo.grace_amt_repay_ins ? productInfo.grace_amt_repay_ins : "NO",
      gracePeriod: productInfo.grace_period, //need to update
      meetingDay: samityInfo.meeting_day,
      weekPosition: samityInfo.week_position ? Number(samityInfo.week_position) : undefined,
    }).getSchedule();

    if (appData.data.transaction.type === "cash") {
      appData.data.transaction.type = "cash";
      appData.data.transaction.narration = appData.data.transaction.narration;
    } else if (appData.data.transaction.type === "cheque") {
      const tranSql = `SELECT 
                        a.account_no, 
                        b.bank_name, 
                        c.branch_name 
                      FROM 
                        loan.office_wise_account a 
                        INNER JOIN master.bank_info b ON b.id = a.bank_id 
                        INNER JOIN master.branch_info c ON c.id = a.branch_id 
                      WHERE 
                        a.doptor_id = $1 
                        AND a.office_id = $2
                        AND a.project_id = $3
                        AND c.bank_id = $4
                        AND c.id = $5`;
      const tranInfo = (
        await pool.query(tranSql, [
          appData.doptor_id,
          appData.data.office_id,
          appData.project_id,
          appData.data.transaction.bank_id,
          appData.data.transaction.branch_id,
        ])
      ).rows[0];
      appData.data.transaction.type = "cheque";
      appData.data.transaction.bank_name = tranInfo.bank_name;
      appData.data.transaction.branch_name = tranInfo.branch_name;
      appData.data.transaction.account_no = tranInfo.account_no;
    }
    const finalInfo: any = {
      type: type,
      memberInfo: { ...customerDetails },
      applicationInfo: {
        ...appData.data,
        ...lodash.omit(appData, ["data"]),
        ...loanInfo,
        schedule,
      },
      history: await this.getAppHistory(appId, pool),
    };

    return finalInfo ? toCamelKeys(finalInfo) : null;
  }

  async getSubLedgerData(appId: number, type: string, componentId: number, pool: Pool) {
    const appDataSql = `
            SELECT service_id, data FROM temps.application WHERE id = $1 and component_id = $2`;
    const appData = (await pool.query(appDataSql, [appId, componentId])).rows[0];
    let appInfo = [];
    for (const v of appData.data.sub_gl) {
      const typeNameSql = `SELECT display_value type_name FROM master.code_master WHERE id = $1`;
      const typeNameInfo = (await pool.query(typeNameSql, [v.type])).rows[0];
      v.type_name = typeNameInfo.type_name;
      appInfo.push(v);
    }

    const finalInfo = {
      type: type,
      applicationInfo: {
        appInfo,
        applicationId: appId,
        serviceId: appData.service_id,
      },
      history: await this.getAppHistory(appId, pool),
    };
    return finalInfo ? toCamelKeys(finalInfo) : {};
  }

  async getUpdateFieldOfficerAppDetails(appId: number, type: string, componentId: number, pool: Pool) {
    const appDataSql = `
            SELECT service_id, data, created_by FROM temps.application WHERE id = $1 and component_id = $2`;
    let appData = (await pool.query(appDataSql, [appId, componentId])).rows[0];
    appData = appData ? toCamelKeys(appData) : appData;
    let updateFoInfo = [];
    for (let [index, singleFo] of appData.data.fieldOfficerData.entries()) {
      if (singleFo.foStatus.toString() != singleFo.isChecked.toString()) {
        if (singleFo.foStatus.toString() == "true" && singleFo.isChecked.toString() == "false") {
          updateFoInfo.push({ ...singleFo, changeStatus: "R" });
        } else if (singleFo.foStatus.toString() == "false" && singleFo.isChecked.toString() == "true") {
          updateFoInfo.push({ ...singleFo, changeStatus: "N" });
        }
      }
    }

    const finalInfo = {
      type: type,
      applicationInfo: {
        updateFoInfo,
        applicationId: appId,
        serviceId: appData.serviceId,
      },
      history: await this.getAppHistory(appId, pool),
    };
    return finalInfo ? toCamelKeys(finalInfo) : {};
  }

  async getSamityWithMembersAppDetails(appId: number, type: string, componentId: number, pool: Pool) {
    const appDataSql = `SELECT
                          a.project_id,
                          a.service_id, 
                          a.data, 
                          a.doptor_id,
                          b.name fo_name, 
                          c.display_value meeting_day_name, 
                          d.district_name_bangla, 
                          d.upa_city_name_bangla, 
                          d.uni_thana_paw_name_bangla,
                          e.project_name_bangla
                        FROM 
                          temps.application a 
                          INNER JOIN users.user b ON CAST(
                            a.data -> 'basic' ->> 'fo_code' as integer
                          ) = b.id 
                          INNER JOIN master.code_master c ON CAST(
                            a.data -> 'basic' ->> 'meeting_day' as integer
                          ) = c.id 
                          INNER JOIN master.mv_union_thana_paurasabha_info d ON CAST(
                            a.data -> 'basic' ->> 'district_id' as integer
                          ) = d.district_id 
                          AND CAST(
                            a.data -> 'basic' ->> 'upa_city_id' as integer
                          ) = d.upa_city_id 
                          AND CAST(
                            a.data -> 'basic' ->> 'uni_thana_paw_id' as integer
                          ) = d.uni_thana_paw_id 
                          INNER JOIN master.project_info e ON e.id = a.project_id
                        WHERE 
                          a.id = $1 and a.component_id = $2`;
    let appData = (await pool.query(appDataSql, [appId, componentId])).rows[0];
    const samityBasicInfo = lodash.omit(appData, ["project_id", "service_id", "data"]);
    appData = appData ? toCamelKeys(appData) : appData;
    if (!appData) {
      throw new BadRequestError("আবেদন এর তথ্য পাওয়া যায় নি");
    }
    for (let [memberIndex, singleMember] of appData.data.memberInfo.entries()) {
      const addressSql = `
            SELECT 
              district_id, 
              district_name, 
              district_name_bangla, 
              upa_city_id, 
              upa_city_name, 
              upa_city_name_bangla, 
              upa_city_type, 
              uni_thana_paw_id, 
              uni_thana_paw_name, 
              uni_thana_paw_name_bangla, 
              uni_thana_paw_type
            FROM 
              master.mv_union_thana_paurasabha_info
            WHERE 
              district_id = $1 AND
              upa_city_id = $2 AND
              uni_thana_paw_id = $3`;
      const presentAddressInfo = (
        await pool.query(addressSql, [
          singleMember.address.pre.districtId,
          singleMember.address.pre.upaCityId,
          singleMember.address.pre.uniThanaPawId,
        ])
      ).rows[0];
      const permanentAddressInfo = (
        await pool.query(addressSql, [
          singleMember.address.per.districtId,
          singleMember.address.per.upaCityId,
          singleMember.address.per.uniThanaPawId,
        ])
      ).rows[0];

      singleMember.address.pre = {
        ...singleMember.address.pre,
        ...presentAddressInfo,
      };
      singleMember.address.per = {
        ...singleMember.address.per,
        ...permanentAddressInfo,
      };

      const docTypeNameSql = `SELECT doc_type_desc FROM master.document_type WHERE doc_type = $1`;
      const codeMasterNameSql = `SELECT display_value FROM master.code_master WHERE id = $1`;
      for (let [docIndex, singleDoc] of singleMember.data.memberDocuments.entries()) {
        let docTypeName = (await pool.query(docTypeNameSql, [singleDoc.documentType])).rows[0]?.doc_type_desc;
        singleMember.data.memberDocuments[docIndex] = {
          ...singleMember.data.memberDocuments[docIndex],
          docTypeName,
        };
      }
      if (appData.doptorId != 3 && appData.doptorId != 10) {
        for (let [nomineeIndex, singleNominee] of singleMember.nominee.entries()) {
          let docTypeName = (await pool.query(docTypeNameSql, [singleNominee.docType])).rows[0]?.doc_type_desc;
          let relationName = (await pool.query(codeMasterNameSql, [singleNominee.relation])).rows[0]?.display_value;
          singleMember.nominee[nomineeIndex] = {
            ...singleMember.nominee[nomineeIndex],
            docTypeName,
            relationName,
          };
        }
      }
      const guardianRelationName = (await pool.query(codeMasterNameSql, [singleMember?.guardianInfo?.relation])).rows[0]
        ?.display_value;
      const guardianOccupationName = (await pool.query(codeMasterNameSql, [singleMember?.guardianInfo?.occupation]))
        .rows[0]?.display_value;
      singleMember.guardianInfo = {
        ...singleMember?.guardianInfo,
        relationName: guardianRelationName,
        occupationName: guardianOccupationName,
      };
      const memberBasicInfo = {
        genderName: (await pool.query(codeMasterNameSql, [singleMember?.data?.gender])).rows[0]?.display_value,
        religionName: (await pool.query(codeMasterNameSql, [singleMember?.data?.religion])).rows[0]?.display_value,
        educationName: (
          await pool.query(codeMasterNameSql, [
            singleMember?.data?.education ? singleMember.data.education : singleMember?.data?.classId,
          ])
        ).rows[0]?.display_value,
        occupationName: (await pool.query(codeMasterNameSql, [singleMember?.data?.occupation])).rows[0]?.display_value,
        maritalStatusName: (await pool.query(codeMasterNameSql, [singleMember?.data?.maritalStatus])).rows[0]
          ?.display_value,
      };
      singleMember.data = { ...singleMember?.data, ...memberBasicInfo };
      appData.data.memberInfo[memberIndex] = singleMember;
    }
    appData.data.basic = { ...appData?.data?.basic, ...samityBasicInfo };
    const finalAppInfo = lodash.omit(appData, [
      "foName",
      "meetingDayName",
      "districtNameBangla",
      "upaCityNameBangla",
      "uniThanaPawNameBangla",
      "projectNameBangla",
    ]);
    const finalAppInfoWithUrl = finalAppInfo
      ? await minioPresignedGet(finalAppInfo, [
          "data.memberInfo.[].memberPicture",
          "data.memberInfo.[].memberSign",
          "data.memberInfo.[].data.memberDocuments.[].documentFront",
          "data.memberInfo.[].data.memberDocuments.[].documentBack",
          "data.memberInfo.[].nominee.[].nomineeSign",
          "data.memberInfo.[].nominee.[].nomineePicture",
        ])
      : finalAppInfo;
    const finalInfo = {
      type: type,
      applicationInfo: {
        ...finalAppInfoWithUrl,
        applicationId: appId,
        serviceId: appData.serviceId,
      },
      history: await this.getAppHistory(appId, pool),
    };
    return finalInfo ? toCamelKeys(finalInfo) : {};
  }
  async getMainMemberUpdateAppInfo(appId: number, type: string, componentId: number, pool: Pool) {
    const appDataSql = `SELECT
                          project_id,
                          service_id, 
                          data
                        FROM 
                          temps.application
                        WHERE 
                          id = $1 and component_id =$2`;
    let appData = (await pool.query(appDataSql, [appId, componentId])).rows[0];
    appData = appData ? toCamelKeys(appData) : appData;
    const memberInfo = appData.data.memberInfo[0];
    const memberSavedInfoSql = `SELECT 
                                  a.*, 
                                  b.document_data 
                                FROM 
                                  samity.customer_info a 
                                  LEFT JOIN loan.document_info b ON a.id = b.ref_no 
                                WHERE 
                                  a.id = $1`;
    let memberSavedInfo = (await pool.query(memberSavedInfoSql, [memberInfo.data.memberId])).rows[0];
    memberSavedInfo = memberSavedInfo ? toCamelKeys(memberSavedInfo) : memberSavedInfo;

    let memberUpdateInfo: any = {
      data: {},
      memberDocuments: [],
      nominee: [],
    };
    for (let key in memberSavedInfo) {
      if (key == "birthDate") {
        memberSavedInfo[key] = moment(memberSavedInfo[key]).format("MM/DD/YYYY");
        memberInfo.data[key] = moment(memberInfo.data[key]).format("MM/DD/YYYY");
      }
      if (memberSavedInfo[key] && memberInfo.data[key]) {
        if (memberSavedInfo[key] != memberInfo.data[key]) {
          memberUpdateInfo.data[`new${key.charAt(0).toUpperCase() + key.slice(1)}`] = memberInfo.data[key];
          memberUpdateInfo.data[`old${key.charAt(0).toUpperCase() + key.slice(1)}`] = memberSavedInfo[key];
        }
      }
    }
    const getDocTypeDescSql = `SELECT doc_type_desc FROM master.document_type WHERE doc_type = $1`;
    const getCodeMasterDescSql = `SELECT display_value FROM master.code_master WHERE id = $1`;
    for (let singleDoc of memberInfo.data.memberDocuments) {
      let comparedDocObject = {} as any;
      let getSpecificSavedDoc = memberSavedInfo.documentData.own.filter(
        (value: any) => value.documentType == singleDoc.documentType
      );

      let getNewDocTypeDescName = (await pool.query(getDocTypeDescSql, [singleDoc.documentType])).rows[0]
        ?.doc_type_desc;
      let getOldDocTypeDescName = (await pool.query(getDocTypeDescSql, [getSpecificSavedDoc[0].documentType])).rows[0]
        ?.doc_type_desc;

      singleDoc = { ...singleDoc, docTypeDesc: getNewDocTypeDescName };
      getSpecificSavedDoc[0] = { ...getSpecificSavedDoc[0], docTypeDesc: getOldDocTypeDescName };
      let updatePreviousDocObject = singleDoc;
      for (let key in singleDoc) {
        if (singleDoc[key] && getSpecificSavedDoc[0][key]) {
          if (singleDoc[key] != getSpecificSavedDoc[0][key]) {
            comparedDocObject[key] = singleDoc[key];
            updatePreviousDocObject = lodash.omit(updatePreviousDocObject, [key]);
          }
        }
      }

      if (getSpecificSavedDoc[0] && Object.keys(comparedDocObject).length > 0) {
        memberUpdateInfo.memberDocuments.push({
          old: lodash.omit(getSpecificSavedDoc[0], ["documentFrontType", "documentBackType"]),
          new: lodash.omit({ ...comparedDocObject }, ["documentFrontType", "documentBackType"]),
        });
      } else if (!getSpecificSavedDoc[0]) {
        memberUpdateInfo.memberDocuments.push({
          new: lodash.omit({ ...singleDoc }, ["documentFrontType", "documentBackType"]),
        });
      }
    }

    const getNomineeInfoSql = `SELECT
                                a.id, 
                                a.nominee_name, 
                                a.relation nominee_relation_id, 
                                b.display_value nominee_relation_name, 
                                a.percentage 
                              FROM 
                                samity.nominee_info a 
                                LEFT JOIN master.code_master b ON a.relation = b.id 
                              WHERE 
                                a.customer_id = $1`;
    const getNomineeInfo = (await pool.query(getNomineeInfoSql, [memberInfo.data.memberId])).rows;

    let nomineeList = [];
    for (let singleNominee of getNomineeInfo) {
      let getNomineeSavedDoc = memberSavedInfo.documentData.nominee.filter(
        (value: any) => value.nomineeId == singleNominee.id
      );

      nomineeList.push({
        id: singleNominee.id,
        docType: getNomineeSavedDoc[0].documentType,
        relation: singleNominee.nominee_relation_id,
        relationTypeDesc: singleNominee.nominee_relation_name,
        docNumber: getNomineeSavedDoc[0].documentNo,
        percentage: singleNominee.percentage,
        nomineeName: singleNominee.nominee_name,
        nomineeSign: getNomineeSavedDoc[0].nomineeSign,
        nomineePicture: getNomineeSavedDoc[0].nomineePicture,
      });
    }

    for (let singleNominee of memberInfo.nominee) {
      let comparedNomineeObject = {} as any;
      let getSavedSpecificNominee: any = nomineeList.filter((value: any) => value.id == singleNominee.id);
      let getDocTypeDescName = (await pool.query(getDocTypeDescSql, [singleNominee.docType])).rows[0]?.doc_type_desc;
      let nomineeRelation = (await pool.query(getCodeMasterDescSql, [singleNominee.relation])).rows[0]?.display_value;
      singleNominee = { ...singleNominee, docTypeDesc: getDocTypeDescName, relationTypeDesc: nomineeRelation };
      let updatePreviousNomineeObject = singleNominee;
      for (let key in singleNominee) {
        if (key != "id") {
          if (singleNominee[key] && getSavedSpecificNominee[0][key]) {
            if (singleNominee[key] != getSavedSpecificNominee[0][key]) {
              comparedNomineeObject[key] = singleNominee[key];
              if (key == "relation")
                comparedNomineeObject["relationTypeDesc"] = (
                  await pool.query(getCodeMasterDescSql, [singleNominee[key]])
                ).rows[0]?.display_value;
              updatePreviousNomineeObject = lodash.omit(updatePreviousNomineeObject, [key]);
            }
          }
        }
      }

      if (getSavedSpecificNominee[0] && Object.keys(comparedNomineeObject).length > 0) {
        memberUpdateInfo.nominee.push({
          old: lodash.omit(getSavedSpecificNominee[0], ["nomineePictureType", "nomineeSignType"]),
          new: lodash.omit({ ...comparedNomineeObject }, ["nomineePictureType", "nomineeSignType"]),
        });
      } else if (!getSavedSpecificNominee[0]) {
        memberUpdateInfo.nominee.push({
          new: lodash.omit({ ...singleNominee }, ["nomineePictureType", "nomineeSignType"]),
        });
      }
    }
    let imagePathArray = [];
    if (memberUpdateInfo?.memberDocuments[0]?.old?.documentFront) {
      imagePathArray.push("memberDocuments.[].old.documentFront");
    }
    if (memberUpdateInfo?.memberDocuments[0]?.old?.documentBack) {
      imagePathArray.push("memberDocuments.[].old.documentBack");
    }
    if (memberUpdateInfo?.memberDocuments[0]?.new?.documentFront) {
      imagePathArray.push("memberDocuments.[].new.documentFront");
    }
    if (memberUpdateInfo?.memberDocuments[0]?.new?.documentBack) {
      imagePathArray.push("memberDocuments.[].new.documentBack");
    }
    if (memberUpdateInfo?.nominee[0]?.old?.nomineePicture) {
      imagePathArray.push("nominee.[].old.nomineePicture");
    }
    if (memberUpdateInfo?.nominee[0]?.old?.nomineeSign) {
      imagePathArray.push("nominee.[].old.nomineeSign");
    }
    if (memberUpdateInfo?.nominee[0]?.new?.nomineePicture) {
      imagePathArray.push("nominee.[].new.nomineePicture");
    }
    if (memberUpdateInfo?.nominee[0]?.new?.nomineeSign) {
      imagePathArray.push("nominee.[].new.nomineeSign");
    }
    const finalAppInfoWithUrl =
      memberUpdateInfo && imagePathArray[0]
        ? await minioPresignedGet(memberUpdateInfo, imagePathArray)
        : memberUpdateInfo;
    const finalInfo = {
      type: type,
      applicationInfo: {
        memberUpdateInfo: finalAppInfoWithUrl,
        applicationId: appId,
        serviceId: appData.serviceId,
      },
      history: await this.getAppHistory(appId, pool),
    };
    return finalInfo ? toCamelKeys(finalInfo) : {};
  }
  async getBalanceMigrationDetails(appId: number, type: string, componentId: number, pool: Pool) {
    const appDataSql = `
            SELECT service_id, data FROM temps.application WHERE id = $1 and component_id = $2`;
    let appData = (await pool.query(appDataSql, [appId, componentId])).rows[0];
    appData = appData ? toCamelKeys(appData) : appData;

    const finalInfo = {
      type: type,
      applicationInfo: {
        ...appData,
        applicationId: appId,
        serviceId: appData.serviceId,
      },
      history: await this.getAppHistory(appId, pool),
    };
    return finalInfo ? toCamelKeys(finalInfo) : {};
  }

  async getMainSamityWithMembersAppDetails(appId: number, type: string, componentId: number, pool: Pool) {
    const appDataSql = `SELECT 
                          a.project_id, 
                          a.service_id, 
                          a.data, 
                          c.name fo_name, 
                          d.display_value meeting_day_name, 
                          e.district_name_bangla, 
                          e.upa_city_name_bangla, 
                          e.uni_thana_paw_name_bangla, 
                          f.project_name_bangla,
                          b.* 
                        FROM 
                          temps.application a 
                          INNER JOIN samity.samity_info b ON b.id = a.samity_id 
                          INNER JOIN users.user c ON c.id = b.fo_user_id 
                          INNER JOIN master.code_master d ON d.id = b.meeting_day 
                          INNER JOIN master.mv_union_thana_paurasabha_info e ON e.district_id = b.district_id 
                          AND e.upa_city_id = b.upa_city_id 
                          AND e.uni_thana_paw_id = b.uni_thana_paw_id 
                          INNER JOIN master.project_info f ON f.id = a.project_id 
                        WHERE 
                          a.id = $1 and a.component_id = $2`;
    let appData = (await pool.query(appDataSql, [appId, componentId])).rows[0];
    appData = appData ? toCamelKeys(appData) : appData;
    let newMembers = appData.data.memberInfo.filter((value: any) => value.memberType == "new");
    let updateMembers = appData.data.memberInfo.filter((value: any) => value.memberType == "update");
    if (newMembers.length > 0) {
      for (let [memberIndex, singleMember] of newMembers.entries()) {
        const addressSql = `
            SELECT
              district_id,
              district_name,
              district_name_bangla,
              upa_city_id,
              upa_city_name,
              upa_city_name_bangla,
              upa_city_type,
              uni_thana_paw_id,
              uni_thana_paw_name,
              uni_thana_paw_name_bangla,
              uni_thana_paw_type
            FROM
              master.mv_union_thana_paurasabha_info
            WHERE
              district_id = $1 AND
              upa_city_id = $2 AND
              uni_thana_paw_id = $3`;
        const presentAddressInfo = (
          await pool.query(addressSql, [
            singleMember.address.pre.districtId,
            singleMember.address.pre.upaCityId,
            singleMember.address.pre.uniThanaPawId,
          ])
        ).rows[0];
        const permanentAddressInfo = (
          await pool.query(addressSql, [
            singleMember.address.per.districtId,
            singleMember.address.per.upaCityId,
            singleMember.address.per.uniThanaPawId,
          ])
        ).rows[0];
        singleMember.address.pre = {
          ...singleMember.address.pre,
          ...presentAddressInfo,
        };
        singleMember.address.per = {
          ...singleMember.address.per,
          ...permanentAddressInfo,
        };

        const docTypeNameSql = `SELECT doc_type_desc FROM master.document_type WHERE doc_type = $1`;
        const codeMasterNameSql = `SELECT display_value FROM master.code_master WHERE id = $1`;
        for (let [docIndex, singleDoc] of singleMember.data.memberDocuments.entries()) {
          let docTypeName = (await pool.query(docTypeNameSql, [singleDoc.documentType])).rows[0]?.doc_type_desc;
          singleMember.data.memberDocuments[docIndex] = {
            ...singleMember.data.memberDocuments[docIndex],
            docTypeName,
          };
        }
        for (let [nomineeIndex, singleNominee] of singleMember.nominee.entries()) {
          let docTypeName = (await pool.query(docTypeNameSql, [singleNominee.docType])).rows[0]?.doc_type_desc;
          let relationName = (await pool.query(codeMasterNameSql, [singleNominee.relation])).rows[0]?.display_value;
          singleMember.nominee[nomineeIndex] = {
            ...singleMember.nominee[nomineeIndex],
            docTypeName,
            relationName,
          };
        }
        const guardianRelationName = (await pool.query(codeMasterNameSql, [singleMember.guardianInfo.relation])).rows[0]
          ?.display_value;
        const guardianOccupationName = (await pool.query(codeMasterNameSql, [singleMember.guardianInfo.occupation]))
          .rows[0]?.display_value;
        singleMember.guardianInfo = {
          ...singleMember.guardianInfo,
          relationName: guardianRelationName,
          occupationName: guardianOccupationName,
        };
        const memberBasicInfo = {
          genderName: (await pool.query(codeMasterNameSql, [singleMember.data.gender])).rows[0]?.display_value,
          religionName: (await pool.query(codeMasterNameSql, [singleMember.data.religion])).rows[0]?.display_value,
          educationName: (await pool.query(codeMasterNameSql, [singleMember.data.education])).rows[0]?.display_value,
          occupationName: (await pool.query(codeMasterNameSql, [singleMember.data.occupation])).rows[0]?.display_value,
          maritalStatusName: (await pool.query(codeMasterNameSql, [singleMember.data.maritalStatus])).rows[0]
            ?.display_value,
        };
        singleMember.data = { ...singleMember.data, ...memberBasicInfo };
        const finalAppInfoWithUrl = singleMember
          ? await minioPresignedGet(singleMember, [
              "memberPicture",
              "memberSign",
              "data.memberDocuments.[].documentFront",
              "data.memberDocuments.[].documentBack",
              "nominee.[].nomineeSign",
              "nominee.[].nomineePicture",
            ])
          : singleMember;
        newMembers[memberIndex] = finalAppInfoWithUrl;
      }
    }

    if (updateMembers.length > 0) {
      for (let [memberIndex, memberInfo] of updateMembers.entries()) {
        const memberSavedInfoSql = `SELECT 
                                  a.*, 
                                  b.document_data 
                                FROM 
                                  samity.customer_info a 
                                  LEFT JOIN loan.document_info b ON a.id = b.ref_no 
                                WHERE 
                                  a.id = $1`;
        let memberSavedInfo = (await pool.query(memberSavedInfoSql, [memberInfo.data.memberId])).rows[0];
        memberSavedInfo = memberSavedInfo ? toCamelKeys(memberSavedInfo) : memberSavedInfo;
        let memberUpdateInfo: any = {
          data: {},
          memberDocuments: [],
          nominee: [],
        };
        const getCodeMasterDescSql = `SELECT display_value FROM master.code_master WHERE id = $1`;
        const getCodeMasterDescByTypeSql = `SELECT display_value FROM master.code_master WHERE return_value = $1`;
        for (let key in memberSavedInfo) {
          if (key == "birthDate") {
            memberSavedInfo[key] = moment(memberSavedInfo[key]).format("MM/DD/YYYY");
            memberInfo.data[key] = moment(memberInfo.data[key]).format("MM/DD/YYYY");
          }
          if (memberSavedInfo[key] && memberInfo.data[key]) {
            if (memberSavedInfo[key] != memberInfo.data[key]) {
              if (key == "gender") {
                memberUpdateInfo.data[`new${key.charAt(0).toUpperCase() + key.slice(1)}`] = (
                  await pool.query(getCodeMasterDescSql, [memberInfo.data[key]])
                ).rows[0]?.display_value;
                memberUpdateInfo.data[`old${key.charAt(0).toUpperCase() + key.slice(1)}`] = (
                  await pool.query(getCodeMasterDescSql, [memberSavedInfo[key]])
                ).rows[0]?.display_value;
                continue;
              }
              if (key == "religion") {
                memberUpdateInfo.data[`new${key.charAt(0).toUpperCase() + key.slice(1)}`] = (
                  await pool.query(getCodeMasterDescSql, [memberInfo.data[key]])
                ).rows[0]?.display_value;
                memberUpdateInfo.data[`old${key.charAt(0).toUpperCase() + key.slice(1)}`] = (
                  await pool.query(getCodeMasterDescSql, [memberSavedInfo[key]])
                ).rows[0]?.display_value;
                continue;
              }
              if (key == "transactionType") {
                memberUpdateInfo.data[`new${key.charAt(0).toUpperCase() + key.slice(1)}`] = (
                  await pool.query(getCodeMasterDescByTypeSql, [memberInfo.data[key]])
                ).rows[0]?.display_value;
                memberUpdateInfo.data[`old${key.charAt(0).toUpperCase() + key.slice(1)}`] = (
                  await pool.query(getCodeMasterDescByTypeSql, [memberSavedInfo[key]])
                ).rows[0]?.display_value;
                continue;
              }
              if (key == "education") {
                memberUpdateInfo.data[`new${key.charAt(0).toUpperCase() + key.slice(1)}`] = (
                  await pool.query(getCodeMasterDescSql, [memberInfo.data[key]])
                ).rows[0]?.display_value;
                memberUpdateInfo.data[`old${key.charAt(0).toUpperCase() + key.slice(1)}`] = (
                  await pool.query(getCodeMasterDescSql, [memberSavedInfo[key]])
                ).rows[0]?.display_value;
                continue;
              }
              if (key == "occupation") {
                memberUpdateInfo.data[`new${key.charAt(0).toUpperCase() + key.slice(1)}`] = (
                  await pool.query(getCodeMasterDescSql, [memberInfo.data[key]])
                ).rows[0]?.display_value;
                memberUpdateInfo.data[`old${key.charAt(0).toUpperCase() + key.slice(1)}`] = (
                  await pool.query(getCodeMasterDescSql, [memberSavedInfo[key]])
                ).rows[0]?.display_value;
                continue;
              }
              if (key == "maritalStatus") {
                memberUpdateInfo.data[`new${key.charAt(0).toUpperCase() + key.slice(1)}`] = (
                  await pool.query(getCodeMasterDescSql, [memberInfo.data[key]])
                ).rows[0]?.display_value;
                memberUpdateInfo.data[`old${key.charAt(0).toUpperCase() + key.slice(1)}`] = (
                  await pool.query(getCodeMasterDescSql, [memberSavedInfo[key]])
                ).rows[0]?.display_value;
                continue;
              }
              memberUpdateInfo.data[`new${key.charAt(0).toUpperCase() + key.slice(1)}`] = memberInfo.data[key];
              memberUpdateInfo.data[`old${key.charAt(0).toUpperCase() + key.slice(1)}`] = memberSavedInfo[key];
            }
          }
        }
        const getDocTypeDescSql = `SELECT doc_type_desc FROM master.document_type WHERE doc_type = $1`;
        for (let singleDoc of memberInfo.data.memberDocuments) {
          let comparedDocObject = {} as any;
          let getSpecificSavedDoc = memberSavedInfo.documentData.own.filter(
            (value: any) => value.documentType == singleDoc.documentType
          );

          let getNewDocTypeDescName = (await pool.query(getDocTypeDescSql, [singleDoc.documentType])).rows[0]
            ?.doc_type_desc;
          let getOldDocTypeDescName = (await pool.query(getDocTypeDescSql, [getSpecificSavedDoc[0]?.documentType]))
            .rows[0]?.doc_type_desc;

          singleDoc = { ...singleDoc, docTypeDesc: getNewDocTypeDescName };
          getSpecificSavedDoc[0] = { ...getSpecificSavedDoc[0], docTypeDesc: getOldDocTypeDescName };
          let updatePreviousDocObject = singleDoc;

          for (let key in singleDoc) {
            if (singleDoc[key] && getSpecificSavedDoc[0][key]) {
              if (singleDoc[key] != getSpecificSavedDoc[0][key]) {
                comparedDocObject[key] = singleDoc[key];
                updatePreviousDocObject = lodash.omit(updatePreviousDocObject, [key]);
              }
            }
          }

          if (getSpecificSavedDoc[0] && Object.keys(comparedDocObject).length > 0) {
            memberUpdateInfo.memberDocuments.push({
              old: lodash.omit(getSpecificSavedDoc[0], ["documentFrontType", "documentBackType"]),
              new: lodash.omit({ ...comparedDocObject }, ["documentFrontType", "documentBackType"]),
            });
          } else if (!getSpecificSavedDoc[0]) {
            memberUpdateInfo.memberDocuments.push({
              new: lodash.omit({ ...singleDoc }, ["documentFrontType", "documentBackType"]),
            });
          }
        }

        const getNomineeInfoSql = `SELECT
                                a.id, 
                                a.nominee_name, 
                                a.relation nominee_relation_id, 
                                b.display_value nominee_relation_name, 
                                a.percentage 
                              FROM 
                                samity.nominee_info a 
                                LEFT JOIN master.code_master b ON a.relation = b.id 
                              WHERE 
                                a.customer_id = $1`;
        const getNomineeInfo = (await pool.query(getNomineeInfoSql, [memberInfo.data.memberId])).rows;

        let nomineeList = [];
        for (let singleNominee of getNomineeInfo) {
          let getNomineeSavedDoc = memberSavedInfo.documentData.nominee.filter(
            (value: any) => value.nomineeId == singleNominee.id
          );
          nomineeList.push({
            id: singleNominee.id,
            docType: getNomineeSavedDoc[0].documentType,
            relation: singleNominee.nominee_relation_id,
            relationTypeDesc: singleNominee.nominee_relation_name,
            docNumber: getNomineeSavedDoc[0].documentNo,
            percentage: singleNominee.percentage,
            nomineeName: singleNominee.nominee_name,
            nomineeSign: getNomineeSavedDoc[0].nomineeSign,
            nomineePicture: getNomineeSavedDoc[0].nomineePicture,
          });
        }

        for (let singleNominee of memberInfo.nominee) {
          let comparedNomineeObject = {} as any;
          let getSavedSpecificNominee: any = nomineeList.filter((value: any) => value.id == singleNominee.id);
          let getDocTypeDescName = (await pool.query(getDocTypeDescSql, [singleNominee?.docType])).rows[0]
            ?.doc_type_desc;

          let nomineeRelation = (await pool.query(getCodeMasterDescSql, [singleNominee.relation])).rows[0]
            ?.display_value;
          singleNominee = { ...singleNominee, docTypeDesc: getDocTypeDescName, relationTypeDesc: nomineeRelation };
          let updatePreviousNomineeObject = singleNominee;
          for (let key in singleNominee) {
            if (key != "id") {
              if (singleNominee[key] && getSavedSpecificNominee[0] && getSavedSpecificNominee[0][key]) {
                if (singleNominee[key] != getSavedSpecificNominee[0][key]) {
                  comparedNomineeObject[key] = singleNominee[key];
                  if (key == "relation")
                    comparedNomineeObject["relationTypeDesc"] = (
                      await pool.query(getCodeMasterDescSql, [singleNominee[key]])
                    ).rows[0]?.display_value;
                  updatePreviousNomineeObject = lodash.omit(updatePreviousNomineeObject, [key]);
                }
              }
            }
          }

          if (getSavedSpecificNominee[0] && Object.keys(comparedNomineeObject).length > 0) {
            memberUpdateInfo.nominee.push({
              old: lodash.omit(getSavedSpecificNominee[0], ["nomineePictureType", "nomineeSignType"]),
              new: lodash.omit({ ...comparedNomineeObject }, ["nomineePictureType", "nomineeSignType"]),
            });
          } else if (!getSavedSpecificNominee[0]) {
            memberUpdateInfo.nominee.push({
              new: lodash.omit({ ...singleNominee }, ["nomineePictureType", "nomineeSignType"]),
            });
          }
        }
        let imagePathArray = [];
        if (memberUpdateInfo?.memberDocuments[0]?.old?.documentFront) {
          imagePathArray.push("memberDocuments.[].old.documentFront");
        }
        if (memberUpdateInfo?.memberDocuments[0]?.old?.documentBack) {
          imagePathArray.push("memberDocuments.[].old.documentBack");
        }
        if (memberUpdateInfo?.memberDocuments[0]?.new?.documentFront) {
          imagePathArray.push("memberDocuments.[].new.documentFront");
        }
        if (memberUpdateInfo?.memberDocuments[0]?.new?.documentBack) {
          imagePathArray.push("memberDocuments.[].new.documentBack");
        }
        if (memberUpdateInfo?.nominee[0]?.old?.nomineePicture) {
          imagePathArray.push("nominee.[].old.nomineePicture");
        }
        if (memberUpdateInfo?.nominee[0]?.old?.nomineeSign) {
          imagePathArray.push("nominee.[].old.nomineeSign");
        }
        if (memberUpdateInfo?.nominee[0]?.new?.nomineePicture) {
          imagePathArray.push("nominee.[].new.nomineePicture");
        }
        if (memberUpdateInfo?.nominee[0]?.new?.nomineeSign) {
          imagePathArray.push("nominee.[].new.nomineeSign");
        }
        const finalAppInfoWithUrl =
          memberUpdateInfo && imagePathArray[0]
            ? await minioPresignedGet(memberUpdateInfo, imagePathArray)
            : memberUpdateInfo;
        finalAppInfoWithUrl["memberName"] = memberSavedInfo["nameBn"];
        updateMembers[memberIndex] = finalAppInfoWithUrl;
      }
    }
    appData.data = {
      ...appData.data,
      basic: {
        flag: appData.flag,
        isSme: appData.isSme,
        address: appData.address,
        foCode: appData.foUserId,
        districtId: appData.districtId,
        meetingDay: appData.meetingDay,
        samityName: appData.samityName,
        upaCityId: appData.upaCityId,
        meetingType: appData.meetingType,
        upaCityType: appData.upaCityType,
        uniThanaPawId: appData.uniThanaPawId,
        uniThanaPawType: appData.uniThanaPawType,
        foName: appData.foName,
        meetingDayName: appData.meetingDayName,
        districtNameBangla: appData.districtNameBangla,
        upaCityNameBangla: appData.upaCityNameBangla,
        uniThanaPawNameBangla: appData.uniThanaPawNameBangla,
        projectNameBangla: appData.projectNameBangla,
        // ...samityBasicInfo,
      },
      setup: {
        shareAmount: appData.shareAmount,
        memberMaxAge: appData.memberMaxAge,
        memberMinAge: appData.memberMinAge,
        groupMaxMember: appData.groupMaxMember,
        groupMinMember: appData.groupMinMember,
        samityMaxMember: appData.samityMaxMember,
        samityMinMember: appData.samityMinMember,
        samityMemberType: appData.samityMemberType,
      },
    };
    const finalAppInfo = lodash.omit(appData, [
      "foName",
      "meetingDayName",
      "districtNameBangla",
      "upaCityNameBangla",
      "uniThanaPawNameBangla",
      "projectNameBangla",
      "id",
      "samityCode",
      "samityName",
      "samityMemberType",
      "doptorId",
      "officeId",
      "districtId",
      "upaCityId",
      "address",
      "workPlaceLat",
      "workPlaceLong",
      "workAreaRadius",
      "memberMinAge",
      "memberMaxAge",
      "samityMinMember",
      "samityMaxMember",
      "groupMinMember",
      "groupMaxMember",
      "branchCode",
      "foUserId",
      "coopStatus",
      "coopRegNumber",
      "shareAmount",
      "meetingDay",
      "authorizeStatus",
      "authorizedBy",
      "authorizedAt",
      "createdBy",
      "createdAt",
      "updatedBy",
      "updatedAt",
      "isSme",
      "flag",
      "samityType",
      "upaCityType",
      "uniThanaPawId",
      "uniThanaPawType",
      "weekPosition",
      "dashboardSync",
      "meetingType",
      "formationDate",
      "samityOldCode",
      "applicationId",
    ]);

    const finalInfo = {
      type: type,
      applicationInfo: {
        applicationId: appId,
        serviceId: appData.serviceId,
        projectId: appData.projectId,
        data: {
          ...lodash.omit(finalAppInfo.data, "memberInfo"),
          memberInfo: newMembers[0] ? newMembers : [],
          updateMembers: updateMembers[0] ? updateMembers : [],
        },
      },
      history: await this.getAppHistory(appId, pool),
    };
    return finalInfo ? toCamelKeys(finalInfo) : {};
  }
  async getAppHistory(appId: number, pool: Pool) {
    const appHistorySql = `
            SELECT 
              a.id, 
              a.user_id, 
              a.application_id, 
              a.service_action_id, 
              a.remarks, 
              to_char("action_date", 'DD/MM/YYYY') as action_date,
              a.office_id, 
              a.employee_Id, 
              f.name_bn, 
              a.attachment, 
              b.username, 
              c.name_bn as office_name_bangla,
              g.name_bn as designation, 
              d.service_id, 
              arr.item_object ->> 'action_text' as action_text 
            FROM 
              temps.application_approval a 
              INNER JOIN users.user b ON b.id = a.user_id 
              INNER JOIN master.office_info c ON c.id = a.office_id 
              INNER JOIN temps.application d ON d.id = a.application_id 
              INNER JOIN master.service_info e ON e.id = d.service_id 
              LEFT JOIN master.office_employee f ON f.designation_id = a.designation_id 
              INNER JOIN master.office_designation g ON f.designation_id = g.id 
              JOIN jsonb_array_elements(e.service_action) with ordinality arr(item_object, position) ON arr.position = a.service_action_id 
            WHERE 
              application_id = $1 
            ORDER BY 
              a.id ASC`;
    const appHistory = (await pool.query(appHistorySql, [appId])).rows;
    let appHistoryWithUrl = [];
    for (const singleAppHistory of appHistory) {
      if (singleAppHistory.attachment.file_name) {
        let dataWithUrl = await minioPresignedGet(singleAppHistory, ["attachment.file_name"]);
        appHistoryWithUrl.push(dataWithUrl);
      } else {
        appHistoryWithUrl.push(singleAppHistory);
      }
    }

    return appHistoryWithUrl.length > 0 ? toCamelKeys(appHistoryWithUrl) : [];
  }

  async getProductAppDetails(appId: number, type: string, componentId: number, pool: Pool) {
    const appDataSql = `
            SELECT service_id, data FROM temps.application WHERE id = $1 and component_id = $2`;
    const appData = (await pool.query(appDataSql, [appId, componentId])).rows[0];
    const camelCaseAppData = toCamelKeys(appData.data) as any;

    const getGlNameSql = `SELECT glac_name FROM loan.glac_mst WHERE id = $1`;
    const getDocTypeNameSql = `SELECT doc_type_desc FROM master.document_type WHERE id = $1`;
    const getChargeTypeNameSql = `SELECT charge_type_desc FROM loan.product_charge_type WHERE id = $1`;
    const getSegregationSectorNameSql = `SELECT segregation_sector_name FROM loan.service_charge_seg_list WHERE id = $1`;
    if (camelCaseAppData?.productMaster) {
      const capitalGl = (await pool.query(getGlNameSql, [camelCaseAppData.productMaster.capitalGl])).rows[0]?.glac_name;
      const serviceChargeGl = (await pool.query(getGlNameSql, [camelCaseAppData.productMaster.serviceChargeGl])).rows[0]
        ?.glac_name;
      const productGl = (await pool.query(getGlNameSql, [camelCaseAppData.productMaster.productGl])).rows[0]?.glac_name;
      const insuranceGl = (await pool.query(getGlNameSql, [camelCaseAppData.productMaster.insuranceGl])).rows[0]
        ?.glac_name;
      camelCaseAppData.productMaster = {
        ...camelCaseAppData.productMaster,
        capitalGl,
        productGl,
        insuranceGl,
        serviceChargeGl,
      };
    }

    if (camelCaseAppData?.serviceChargeBivajon) {
      camelCaseAppData.serviceChargeBivajon?.map(async (value: any, index: number) => {
        let generalLedgerFullName = (await pool.query(getGlNameSql, [value.generalLedgerName])).rows[0].glac_name;
        let sectorFullName = (await pool.query(getSegregationSectorNameSql, [value.sectorName])).rows[0]
          .segregation_sector_name;
        camelCaseAppData.serviceChargeBivajon[index] = {
          ...camelCaseAppData.serviceChargeBivajon[index],
          generalLedgerFullName,
          sectorFullName,
        };
      });
    }

    if (camelCaseAppData?.productCharge) {
      camelCaseAppData.productCharge?.map(async (value: any, index: number) => {
        let chargeCreditGlName = (await pool.query(getGlNameSql, [value.chargeCreditgl])).rows[0].glac_name;
        let chargeFullName = (await pool.query(getChargeTypeNameSql, [value.chargeName])).rows[0].charge_type_desc;
        camelCaseAppData.productCharge[index] = {
          ...camelCaseAppData.productCharge[index],
          chargeCreditGlName,
          chargeFullName,
        };
      });
    }

    if (camelCaseAppData?.necessaryDocument) {
      camelCaseAppData.necessaryDocument?.map(async (value: any, index: number) => {
        let docFullName = (await pool.query(getDocTypeNameSql, [value.docName])).rows[0].doc_type_desc;
        camelCaseAppData.necessaryDocument[index] = {
          ...camelCaseAppData.necessaryDocument[index],
          docFullName,
        };
      });
    }

    const finalInfo = {
      type: type,
      applicationInfo: {
        ...camelCaseAppData,
        applicationId: appId,
        serviceId: appData.service_id,
      },
      history: await this.getAppHistory(appId, pool),
    };
    return finalInfo ? toCamelKeys(finalInfo) : {};
  }

  async getPermitProjectIds(deskId: number) {
    const pool = db.getConnection("slave");
    const sql = `SELECT 
                  project_id 
                FROM 
                  master.user_wise_project a 
                  INNER JOIN users.user b ON b.id = a.user_id 
                WHERE 
                  b.designation_id = $1 AND
                  a.is_active = true`;
    const result = (await pool.query(sql, [deskId])).rows;
    const projectIds = result.length > 0 ? result.map((v: any) => v.project_id) : [];
    return projectIds;
  }

  async getFieldOfficerAppDetails(appId: number, type: string, componentId: number, pool: Pool) {
    const appDataSql = `SELECT service_id, data FROM temps.application WHERE id = $1 and component_id = $2`;
    let appData = (await pool.query(appDataSql, [appId, componentId])).rows[0];
    appData = appData ? toCamelKeys(appData) : appData;
    const getOfficeNameSql = `SELECT name_bn FROM master.office_info WHERE id = $1`;
    if (appData.data.fieldOfficerData) {
      appData.data.fieldOfficerData.map(async (fieldOfficer: any, index: number) => {
        let officeName = (await pool.query(getOfficeNameSql, [fieldOfficer.officeId])).rows[0].name_bn;
        appData.data.fieldOfficerData[index].officeName = officeName;
      });
    }
    const finalInfo = {
      type: type,
      applicationInfo: {
        ...lodash.omit(appData.data, "userId", "userType"),
        applicationId: appId,
        serviceId: appData.serviceId,
      },
      history: await this.getAppHistory(appId, pool),
    };
    return finalInfo ? toCamelKeys(finalInfo) : {};
  }

  async updateMainProduct(payload: any, pool: Pool) {
    const previousApplicationSql = `SELECT 
                                        data 
                                      FROM 
                                        temps.application 
                                      WHERE 
                                        CAST(data -> 'product_id' as integer) = $1
                                        AND CAST(data -> 'user_id' as integer) = $2
                                        AND next_app_designation_id = $3
                                        AND service_id = 12`;
    const previousApplicationInfo = (
      await pool.query(previousApplicationSql, [
        payload.data.productId,
        payload.createdBy,
        payload.nextAppDesignationId,
      ])
    ).rows[0];

    if (previousApplicationInfo) {
      let previuosProductAppData = toCamelKeys(previousApplicationInfo) as any;

      if (previuosProductAppData.data.productMaster && payload.data.productMaster) {
        payload.data.productMaster = {
          ...previuosProductAppData.data.productMaster,
          ...payload.data.productMaster,
        };
      } else {
        if (previuosProductAppData.data.productServiceCharge && payload.data.productServiceCharge) {
          payload.data.productServiceCharge = {
            ...previuosProductAppData.data.productServiceCharge,
            ...payload.data.productServiceCharge,
          };
        } else {
          if (previuosProductAppData.data.serviceChargeBivajon && payload.data.serviceChargeBivajon) {
            payload.data.serviceChargeBivajon = {
              ...previuosProductAppData.data.serviceChargeBivajon,
              ...payload.data.serviceChargeBivajon,
            };
          } else {
            if (previuosProductAppData.data.productCharge && payload.data.productCharge) {
              payload.data.productCharge = {
                ...previuosProductAppData.data.productCharge,
                ...payload.data.productCharge,
              };
            } else {
              if (previuosProductAppData.data.slabWiseLoanAmount && payload.data.slabWiseLoanAmount) {
                payload.data.slabWiseLoanAmount = {
                  ...previuosProductAppData.data.slabWiseLoanAmount,
                  ...payload.data.slabWiseLoanAmount,
                };
              } else {
                if (previuosProductAppData.data.necessaryDocument && payload.data.necessaryDocument) {
                  payload.data.necessaryDocument = {
                    ...previuosProductAppData.data.necessaryDocument,
                    ...payload.data.necessaryDocument,
                  };
                }
              }
            }
          }
        }
      }
    }

    payload.data = {
      ...payload.data,
      userId: payload.createdBy,
      userType: "user",
    };
    const { sql, params } = buildInsertSql("temps.application", {
      ...lodash.omit(payload, ["officeId", "serviceName"]),
    });
    const result = await (await pool.query(sql, params)).rows[0];
    return result ? toCamelKeys(result) : null;
  }

  async getUpdateProductAppDetails(appId: number, type: string, componentId: number, pool: Pool) {
    const appDataSql = `SELECT service_id, data FROM temps.application WHERE id = $1 and component_id = $2`;
    const appData = (await pool.query(appDataSql, [appId, componentId])).rows[0];
    const productInfo = appData?.data ? toCamelKeys(appData.data) : (appData?.data as any);

    const getGlNameSql = `SELECT glac_name FROM loan.glac_mst WHERE id = $1`;
    const getDocTypeNameSql = `SELECT doc_type_desc FROM master.document_type WHERE id = $1`;
    const getSegregationNameSql = `SELECT segregation_sector_name FROM loan.service_charge_seg_list WHERE id = $1`;
    const getChargeTypeNameSql = `SELECT charge_type_desc FROM loan.product_charge_type WHERE id = $1`;

    const productMstSql = `SELECT 
                              *
                            FROM 
                              loan.product_mst 
                            WHERE 
                              id = $1`;
    let mainProductMaster = (await pool.query(productMstSql, [productInfo.productId])).rows[0];
    mainProductMaster = mainProductMaster ? toCamelKeys(mainProductMaster) : mainProductMaster;
    let productUpdateInfo = {
      productMaster: {},
      productServiceCharge: [],
      productCharge: [],
      serviceChargeBivajon: [],
      slabWiseLoanAmount: [],
      necessaryDocument: [],
    } as any;

    for (let key in mainProductMaster) {
      if (mainProductMaster[key] && productInfo.productMaster[key]) {
        if (key == "loanTerm" || key == "numberOfInstallment") {
          if (
            Array.isArray(mainProductMaster[key]) &&
            Array.isArray(productInfo.productMaster[key]) &&
            mainProductMaster[key].length === productInfo.productMaster[key].length &&
            mainProductMaster[key].every((val: any, index: number) => val != productInfo.productMaster[key][index])
          ) {
            productInfo.productMaster[key] = productInfo.productMaster[key].toString();
            mainProductMaster[key] = mainProductMaster[key].toString();
            productUpdateInfo.productMaster[`new${key.charAt(0).toUpperCase() + key.slice(1)}`] =
              productInfo.productMaster[key];
            productUpdateInfo.productMaster[`old${key.charAt(0).toUpperCase() + key.slice(1)}`] =
              mainProductMaster[key];
          } else continue;
        }
        if (key == "openDate") {
          mainProductMaster[key] = new Date(mainProductMaster[key]).toLocaleString("bn-BD");
          productInfo.productMaster[key] = new Date(productInfo.productMaster[key]).toLocaleString("bn-BD");
        }
        if (mainProductMaster[key] != productInfo.productMaster[key]) {
          if (
            key == "productGl" ||
            key == "principalGl" ||
            key == "serviceChargeGl" ||
            key == "insuranceGl" ||
            key == "chequeDisbursementGl"
          ) {
            productUpdateInfo.productMaster[`new${key.charAt(0).toUpperCase() + key.slice(1)}`] = (
              await pool.query(getGlNameSql, [productInfo.productMaster[key]])
            ).rows[0]?.glac_name;
            productUpdateInfo.productMaster[`old${key.charAt(0).toUpperCase() + key.slice(1)}`] = (
              await pool.query(getGlNameSql, [mainProductMaster[key]])
            ).rows[0]?.glac_name;
          } else {
            productUpdateInfo.productMaster[`new${key.charAt(0).toUpperCase() + key.slice(1)}`] =
              productInfo.productMaster[key];
            productUpdateInfo.productMaster[`old${key.charAt(0).toUpperCase() + key.slice(1)}`] =
              mainProductMaster[key];
          }
        }
      }
    }

    //product service charge
    if (productInfo?.productServiceCharge) {
      const productSerCrgSql = `SELECT 
                                id,
                                TO_CHAR(effect_date, 'dd/mm/yyyy') AS effect_date,
                                int_rate, 
                                overdue_int_rate, 
                                currentdue_int_rate, 
                                is_active 
                              FROM 
                                loan.product_interest 
                              WHERE 
                                product_id = $1`;
      let mainProductServiceCharge = (await pool.query(productSerCrgSql, [productInfo.productId])).rows as any;

      mainProductServiceCharge = mainProductServiceCharge[0]
        ? toCamelKeys(mainProductServiceCharge)
        : mainProductServiceCharge;

      for (let singleServiceCharge of productInfo?.productServiceCharge) {
        let comparedServiceChargeObject = {} as any;
        let getSavedSpecificServiceCharge: any = mainProductServiceCharge.filter(
          (value: any) => value.id == singleServiceCharge.id
        );

        let updatePreviousServiceChargeObject = singleServiceCharge;
        for (let key in singleServiceCharge) {
          if (key == "effectDate") {
            continue;
          }

          if (key != "id") {
            if (singleServiceCharge[key] && getSavedSpecificServiceCharge[0] && getSavedSpecificServiceCharge[0][key]) {
              if (singleServiceCharge[key] != getSavedSpecificServiceCharge[0][key]) {
                comparedServiceChargeObject[key] = singleServiceCharge[key];

                updatePreviousServiceChargeObject = lodash.omit(updatePreviousServiceChargeObject, [key]);
              }
            }
          }
        }

        if (getSavedSpecificServiceCharge[0] && Object.keys(comparedServiceChargeObject).length > 0) {
          productUpdateInfo.productServiceCharge.push({
            old: getSavedSpecificServiceCharge[0],
            new: comparedServiceChargeObject,
          });
        } else if (!getSavedSpecificServiceCharge[0]) {
          productUpdateInfo.productServiceCharge.push({
            new: singleServiceCharge,
          });
        }
      }
    }

    //product service charge segregation
    if (productInfo?.serviceChargeBivajon) {
      const productSerCrgSegSQL = `SELECT 
                                  a.id,
                                  a.segregation_id, 
                                  b.segregation_sector_name, 
                                  a.segregation_rate, 
                                  a.gl_id, 
                                  a.is_active 
                                FROM 
                                  loan.service_charge_seg a 
                                  INNER JOIN loan.service_charge_seg_list b ON b.id = a.segregation_id 
                                WHERE 
                                  a.product_id = $1`;
      let mainProductServiceChargeSegregation = (await pool.query(productSerCrgSegSQL, [productInfo.productId]))
        .rows as any;

      //

      mainProductServiceChargeSegregation = mainProductServiceChargeSegregation[0]
        ? toCamelKeys(mainProductServiceChargeSegregation)
        : mainProductServiceChargeSegregation;
      let getSavedSpecificServiceChargeSegregation: any = [];

      for (let singleServiceChargeSegregation of productInfo?.serviceChargeBivajon) {
        let segregationName = (await pool.query(getSegregationNameSql, [singleServiceChargeSegregation.segregationId]))
          .rows[0]?.segregation_sector_name;
        let glName = (await pool.query(getGlNameSql, [singleServiceChargeSegregation.glId])).rows[0]?.glac_name;
        singleServiceChargeSegregation = { ...singleServiceChargeSegregation, segregationName, glName };
        let comparedServiceChargeSegregationObject = {} as any;
        if (mainProductServiceChargeSegregation && mainProductServiceChargeSegregation[0]) {
          getSavedSpecificServiceChargeSegregation = mainProductServiceChargeSegregation.filter(
            (value: any) => value.id == singleServiceChargeSegregation.id
          );
        }

        let updatePreviousServiceChargeSegregationObject = singleServiceChargeSegregation;
        for (let key in singleServiceChargeSegregation) {
          if (key != "id") {
            if (
              singleServiceChargeSegregation[key] &&
              getSavedSpecificServiceChargeSegregation[0] &&
              getSavedSpecificServiceChargeSegregation[0][key]
            ) {
              if (singleServiceChargeSegregation[key] != getSavedSpecificServiceChargeSegregation[0][key]) {
                comparedServiceChargeSegregationObject[key] = singleServiceChargeSegregation[key];
                if (key == "segregationId")
                  comparedServiceChargeSegregationObject["segregationName"] = (
                    await pool.query(getSegregationNameSql, [singleServiceChargeSegregation[key]])
                  ).rows[0]?.segregation_sector_name;
                if (key == "glId")
                  comparedServiceChargeSegregationObject["glName"] = (
                    await pool.query(getGlNameSql, [singleServiceChargeSegregation[key]])
                  ).rows[0]?.segregation_sector_name;
                updatePreviousServiceChargeSegregationObject = lodash.omit(
                  updatePreviousServiceChargeSegregationObject,
                  [key]
                );
              }
            }
          }
        }

        if (
          getSavedSpecificServiceChargeSegregation[0] &&
          Object.keys(comparedServiceChargeSegregationObject).length > 0
        ) {
          productUpdateInfo.serviceChargeBivajon.push({
            old: getSavedSpecificServiceChargeSegregation[0],
            new: comparedServiceChargeSegregationObject,
          });
        } else if (!getSavedSpecificServiceChargeSegregation[0]) {
          productUpdateInfo.serviceChargeBivajon.push({
            new: singleServiceChargeSegregation,
          });
        }
      }
    }

    //product charge
    if (productInfo?.productCharge) {
      const productChargeSql = `SELECT 
                                a.id,
                                TO_CHAR(a.effect_date, 'dd/mm/yyyy') AS effect_date,
                                a.charge_type_id, 
                                b.charge_type_desc, 
                                a.charge_gl, 
                                a.charge_value, 
                                a.is_active 
                              FROM 
                                loan.product_charge_mst a 
                                INNER JOIN loan.product_charge_type b ON b.id = a.charge_type_id 
                              WHERE 
                                a.product_id = $1`;
      let mainProductCharge = (await pool.query(productChargeSql, [productInfo.productId])).rows as any;

      for (let singleProductCharge of productInfo?.productCharge) {
        let chargeName = (await pool.query(getChargeTypeNameSql, [singleProductCharge.chargeTypeId])).rows[0]
          ?.charge_type_desc;
        let chargeGlName = (await pool.query(getGlNameSql, [singleProductCharge.chargeGl])).rows[0]?.glac_name;
        singleProductCharge = { ...singleProductCharge, chargeName, chargeGlName };
        let comparedProductChargeObject = {} as any;
        let getSavedSpecificProductCharge: any = mainProductCharge.filter(
          (value: any) => value.id == singleProductCharge.id
        );

        let updatePreviousProductChargeObject = singleProductCharge;
        for (let key in singleProductCharge) {
          if (key != "id") {
            if (singleProductCharge[key] && getSavedSpecificProductCharge[0] && getSavedSpecificProductCharge[0][key]) {
              if (singleProductCharge[key] != getSavedSpecificProductCharge[0][key]) {
                comparedProductChargeObject[key] = singleProductCharge[key];
                if (key == "chargeTypeId")
                  comparedProductChargeObject["chargeTypeName"] = (
                    await pool.query(getChargeTypeNameSql, [singleProductCharge[key]])
                  ).rows[0]?.charge_type_desc;
                if (key == "chargeGl")
                  comparedProductChargeObject["chargeGlName"] = (
                    await pool.query(getGlNameSql, [singleProductCharge[key]])
                  ).rows[0]?.segregation_sector_name;
                updatePreviousProductChargeObject = lodash.omit(updatePreviousProductChargeObject, [key]);
              }
            }
          }
        }

        if (getSavedSpecificProductCharge[0] && Object.keys(comparedProductChargeObject).length > 0) {
          productUpdateInfo.productCharge.push({
            old: getSavedSpecificProductCharge[0],
            new: comparedProductChargeObject,
          });
        } else if (!getSavedSpecificProductCharge[0]) {
          productUpdateInfo.productCharge.push({
            new: singleProductCharge,
          });
        }
      }
    }

    //product sanction policy
    if (productInfo?.slabWiseLoanAmount) {
      const productSancPolicySql = `SELECT 
                                      id,
                                      loan_no, 
                                      min_amount, 
                                      max_amount, 
                                      pre_disb_interval,
                                      deposit_percent,
                                      share_percent, 
                                      is_active 
                                    FROM 
                                      loan.product_sanction_policy
                                    WHERE 
                                      product_id = $1`;
      let mainProductSanctionPolicy = (await pool.query(productSancPolicySql, [productInfo.productId])).rows as any;

      mainProductSanctionPolicy = mainProductSanctionPolicy[0]
        ? toCamelKeys(mainProductSanctionPolicy)
        : mainProductSanctionPolicy;

      let getSavedSpecificSanctionPolicy = [];
      for (let singleSanctionPolicy of productInfo?.slabWiseLoanAmount) {
        let comparedSanctionPolicyObject = {} as any;
        if (mainProductSanctionPolicy && mainProductSanctionPolicy[0]) {
          getSavedSpecificSanctionPolicy = mainProductSanctionPolicy.filter(
            (value: any) => value.id == singleSanctionPolicy.id
          );
        }

        let updatePreviousSanctionPolicyObject = singleSanctionPolicy;
        for (let key in singleSanctionPolicy) {
          if (key != "id") {
            if (
              singleSanctionPolicy[key] &&
              getSavedSpecificSanctionPolicy[0] &&
              getSavedSpecificSanctionPolicy[0][key]
            ) {
              if (singleSanctionPolicy[key] != getSavedSpecificSanctionPolicy[0][key]) {
                comparedSanctionPolicyObject[key] = singleSanctionPolicy[key];
                updatePreviousSanctionPolicyObject = lodash.omit(updatePreviousSanctionPolicyObject, [key]);
              }
            }
          }
        }

        if (getSavedSpecificSanctionPolicy[0] && Object.keys(comparedSanctionPolicyObject).length > 0) {
          productUpdateInfo.slabWiseLoanAmount.push({
            old: getSavedSpecificSanctionPolicy[0],
            new: comparedSanctionPolicyObject,
          });
        } else if (!getSavedSpecificSanctionPolicy[0]) {
          productUpdateInfo.slabWiseLoanAmount.push({
            new: singleSanctionPolicy,
          });
        }
      }
    }

    //product documents
    if (productInfo?.necessaryDocument) {
      const productDocSql = `SELECT 
                            a.id,
                            a.doc_type_id, 
                            b.doc_type_desc, 
                            a.is_mandatory 
                          FROM 
                            loan.product_document_mapping a 
                            INNER JOIN master.document_type b ON b.id = a.doc_type_id 
                          WHERE 
                            a.product_id = $1
                            AND a.is_active = true
                            AND b.is_active = true`;
      let mainProductDocuments = (await pool.query(productDocSql, [productInfo.productId])).rows as any;

      mainProductDocuments = mainProductDocuments[0] ? toCamelKeys(mainProductDocuments) : mainProductDocuments;

      let getSavedSpecificProductDocuments = [];
      for (let singleProductDocuments of productInfo?.necessaryDocument) {
        let docTypeName = (await pool.query(getDocTypeNameSql, [singleProductDocuments.docTypeId])).rows[0]
          ?.doc_type_desc;
        singleProductDocuments = { ...singleProductDocuments, docTypeName };
        let comparedProductDocumentsObject = {} as any;
        if (mainProductDocuments && mainProductDocuments[0]) {
          getSavedSpecificProductDocuments = mainProductDocuments.filter(
            (value: any) => value.id == singleProductDocuments.id
          );
        }

        let updatePreviousProductDocumentsObject = singleProductDocuments;
        for (let key in singleProductDocuments) {
          if (key != "id") {
            if (
              singleProductDocuments[key] &&
              getSavedSpecificProductDocuments[0] &&
              getSavedSpecificProductDocuments[0][key]
            ) {
              if (singleProductDocuments[key] != getSavedSpecificProductDocuments[0][key]) {
                comparedProductDocumentsObject[key] = singleProductDocuments[key];
                if (key == "docTypeId")
                  comparedProductDocumentsObject["docTypeName"] = (
                    await pool.query(getDocTypeNameSql, [singleProductDocuments[key]])
                  ).rows[0]?.doc_type_desc;
                updatePreviousProductDocumentsObject = lodash.omit(updatePreviousProductDocumentsObject, [key]);
              }
            }
          }
        }

        if (getSavedSpecificProductDocuments[0] && Object.keys(comparedProductDocumentsObject).length > 0) {
          productUpdateInfo.necessaryDocument.push({
            old: getSavedSpecificProductDocuments[0],
            new: comparedProductDocumentsObject,
          });
        } else if (!getSavedSpecificProductDocuments[0]) {
          productUpdateInfo.necessaryDocument.push({
            new: singleProductDocuments,
          });
        }
      }
    }

    const finalInfo = {
      type: type,
      applicationInfo: {
        ...productUpdateInfo,
        applicationId: appId,
        serviceId: appData.service_id,
      },
      history: await this.getAppHistory(appId, pool),
    };
    return finalInfo ? toCamelKeys(finalInfo) : {};
  }

  async getAllCreatingAppByUser(doptorId: number, componentId: number, createdBy: number, serviceId: number | null) {
    const pool = db.getConnection("slave");
    let sql = ``;
    let result = [];
    if (serviceId) {
      sql = `SELECT 
              a.id, 
              a.data,
              c.id samity_id,
              c.samity_name, 
              d.project_name_bangla, 
              b.id as service_id, 
              b.service_name, 
              b.page_link,
              data ->> 'remarks' as description, 
              a.status, 
              TO_CHAR(a.created_at, 'dd/mm/yyyy') AS application_date 
            FROM 
              temps.application a 
              INNER JOIN master.service_info b ON a.service_id = b.id FULL 
              OUTER JOIN samity.samity_info c ON a.samity_id = c.id FULL 
              OUTER JOIN master.project_info d ON a.project_id = d.id 
            WHERE 
              a.doptor_id = $1 AND 
              a.created_by = $2 AND
              a.service_id = $3 
              and a.component_id = $4         
            ORDER BY 
              a.id ASC`;

      result = (await pool.query(sql, [doptorId, createdBy, serviceId, componentId])).rows;
    } else {
      sql = `SELECT 
              a.id, 
              c.samity_name,
              c.id samity_id,
              a.data,
              d.project_name_bangla, 
              b.id as service_id, 
              b.service_name, 
              b.page_link,
              data ->> 'remarks' as description, 
              a.status, 
              TO_CHAR(a.created_at, 'dd/mm/yyyy') AS application_date 
            FROM 
              temps.application a 
              INNER JOIN master.service_info b ON a.service_id = b.id FULL 
              OUTER JOIN samity.samity_info c ON a.samity_id = c.id FULL 
              OUTER JOIN master.project_info d ON a.project_id = d.id 
            WHERE 
              a.doptor_id = $1 AND 
              a.created_by = $2  and a.component_id = $3
            ORDER BY 
              a.id ASC`;

      result = (await pool.query(sql, [doptorId, createdBy, componentId])).rows;
    }

    return result.length > 0 ? toCamelKeys(result) : [];
  }

  async getTempSamityMembers(doptorId: number, serviceId: number, samityId: number) {
    const pool = db.getConnection("slave");

    const sql = `SELECT 
                  id,
                  service_id,
                  edit_enable, 
                  data 
                FROM 
                  temps.application 
                WHERE 
                  doptor_id = $1
                  AND samity_id = $2 
                  AND service_id = $3 
                  AND (status = 'P' or status='C')`;
    let result = (await pool.query(sql, [doptorId, samityId, serviceId])).rows[0];
    result = result ? toCamelKeys(result) : result;
    const dataService: DataService = Container.get(DataService);
    const getDocTypeNameSql = `SELECT doc_type_desc FROM master.document_type WHERE doc_type = $1`;
    if (result?.data?.memberInfo[0]) {
      for (let [memberIndex, singleMember] of result.data.memberInfo.entries()) {
        if (Array.isArray(singleMember.data.memberDocuments)) {
          let defDocs = (await dataService.getServiceWiseDocs(doptorId, singleMember.data.projectId, 14)) as any;

          for (let [index, singleOwnDoc] of singleMember.data.memberDocuments.entries()) {
            let isDocNoMandatoryCheck = defDocs.memberDocs.filter(
              (value: any) => value.docType == singleOwnDoc.documentType
            );
            singleMember.data.memberDocuments[index] = {
              ...singleMember.data.memberDocuments[index],
              isDocNoMandatory: isDocNoMandatoryCheck[0]?.isDocNoMandatory
                ? isDocNoMandatoryCheck[0].isDocNoMandatory
                : true,
              docTypeDesc: (await pool.query(getDocTypeNameSql, [singleOwnDoc.documentType])).rows[0]?.doc_type_desc,
            };
          }
        }
        result.data.memberInfo[memberIndex] = singleMember;
      }
    }

    const finalInfoWithUrl = result
      ? await minioPresignedGet(result, [
          "data.memberInfo.[].memberPicture",
          "data.memberInfo.[].memberSign",
          "data.memberInfo.[].data.memberDocuments.[].documentFront",
          "data.memberInfo.[].data.memberDocuments.[].documentBack",
          "data.memberInfo.[].nominee.[].nomineeSign",
          "data.memberInfo.[].nominee.[].nomineePicture",
        ])
      : result;
    return finalInfoWithUrl ? toCamelKeys(finalInfoWithUrl) : {};
  }

  async getSamityUpdateAppInfo(applicationId: number, type: string, componentId: number, pool: Pool) {
    const appDataSql = `SELECT
                          project_id,
                          service_id, 
                          samity_id,
                          data
                        FROM 
                          temps.application
                        WHERE 
                          id = $1 and component_id =$2`;
    let appData = (await pool.query(appDataSql, [applicationId, componentId])).rows[0];
    appData = appData ? toCamelKeys(appData) : appData;
    let samityData = `SELECT * FROM samity.samity_info WHERE id = $1`;
    let samityInfo = (await pool.query(samityData, [appData.samityId])).rows[0];
    samityInfo = samityInfo ? toCamelKeys(samityInfo) : samityInfo;
    const getCodeMasterDescSql = `SELECT display_value FROM master.code_master WHERE id = $1`;

    let samityUpdateInfo = {} as any;
    for (let key in appData.data) {
      if (samityInfo[key] && appData.data[key]) {
        if (samityInfo[key] != appData.data[key]) {
          if (key == "samityMemberType") {
            samityUpdateInfo[`new${key.charAt(0).toUpperCase() + key.slice(1)}`] = (
              await pool.query(getCodeMasterDescSql, [appData.data[key]])
            ).rows[0]?.display_value;
            samityUpdateInfo[`old${key.charAt(0).toUpperCase() + key.slice(1)}`] = (
              await pool.query(getCodeMasterDescSql, [samityInfo[key]])
            ).rows[0]?.display_value;
            continue;
          }
          samityUpdateInfo[`new${key.charAt(0).toUpperCase() + key.slice(1)}`] = appData.data[key];
          samityUpdateInfo[`old${key.charAt(0).toUpperCase() + key.slice(1)}`] = samityInfo[key];
        }
      }
    }
    const finalInfo = {
      type: type,
      applicationInfo: {
        ...samityUpdateInfo,
        applicationId: applicationId,
        serviceId: appData.serviceId,
      },
      history: await this.getAppHistory(applicationId, pool),
    };

    return finalInfo ? toCamelKeys(finalInfo) : {};
  }
  async getProjectConfig(projectId: number) {
    const pool = db.getConnection("slave");
    const projectConfigSql = `SELECT 
                                is_default_savings_product, 
                                is_default_share_product 
                              FROM 
                                master.project_info 
                              WHERE 
                                id = $1`;
    const projectConfig = (await pool.query(projectConfigSql, [projectId])).rows[0];
    if (projectConfig && (projectConfig.is_default_savings_product || projectConfig.is_default_share_product))
      return true;
    else return false;
  }
}
