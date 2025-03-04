import { toCamelKeys } from "keys-transform";
import lo from "lodash";
import Container, { Service } from "typedi";
import db from "../../../db/connection.db";
import BadRequestError from "../../../errors/bad-request.error";
import ProjectService from "../../../modules/master/services/project.service";
import { SamityMigrationService } from "../../../modules/migration/services/samity-migration.service";
import FdrService from "../../../modules/savings/services/fdr.service";
import ScheduleService from "../../../modules/schedule/services/schedule.service";
import { buildInsertSql, buildUpdateSql, buildUpdateWithWhereSql } from "../../../utils/sql-builder.util";
import { ItemRequisitionService } from "../../inventory/services/item-requisition.service";
import { PurchaseOrderService } from "../../inventory/services/purchase-order.service";
import { StoreInMigrationService } from "../../inventory/services/store-in-migration.service";
import TransactionService from "../../transaction/services/transaction.service";
import { applicationApprovalInput } from "../interfaces/application-approval.interface";
import { BalanceMigrationService } from "./../../migration/services/balance-migration.service";
import { ApplicationServices } from "./application.service";
import { CashWithdrawApplicationServices } from "./cash-withdraw-application.service";
import { DpsApplicationServices } from "./dps-application.service";
import { FdrApplicationServices } from "./fdr-application.service";
import { LoanSettlementApplicationServices } from "./loan-settlement-application.service";
import { ReverseTranApplicationService } from "./reverse-tran-application.service";
import { SamityApplicationService } from "./samity-application-service";
import ServiceInfoServices from "./service-info.service";
import SanctionService from "../../../modules/sanction/services/sanction.service";
import { ProductApprovalService } from "../../../modules/loan/services/product/product-approval.service";
import { SavingsProductApprovalService } from "../../../modules/loan/services/product/savings-product-approval.service";

import { ProductUpdateApprovalService } from "../../../modules/loan/services/product/product-update-approval.service";
import { SavingsProductUpdateApplicationApprovalService } from "./savings-product-update-application-approval.service";
import FieldOfficerAssignApprovalService from "../../../modules/samity/services/field-officer-assign-approval.service";
import { PoolClient } from "pg";
import { ItemReturnService } from "../../inventory/services/item-return.service";
import { LoanAdjustmentApplicationServices } from "./loan-adjustment-application.service";
import { NotificationService } from "../../../modules/notification/services/base-notification.service";
import { notificationObject } from "../../../modules/notification/interfaces/component.interface";

export const callService = {
  sanctionApprove: "sanctionApproval",
};
@Service()
export class ApplicationApprovalServices {
  constructor() {}

  async create(
    data: applicationApprovalInput,
    userId: number,
    employeeId: number,
    approverOfficeId: number,
    serviceId: number,
    designationId: number
  ) {
    const ServiceInfoService = Container.get(ServiceInfoServices);
    const projectService: ProjectService = Container.get(ProjectService);
    const serviceAction = await ServiceInfoService.getServiceActionById(serviceId, data.serviceActionId);

    // console.log({ serviceAction });

    // if (serviceAction)
    //   throw new BadRequestError("serviceActionId is not found");
    const transaction = await db.getConnection("master").connect();
    let result: any;
    let applicationUpdateQuery: any, applicationUpdateParams, response;
    try {
      transaction.query("BEGIN");
      await this.checkIfAnyMandatoryActionIsRequired(+data?.applicationId, serviceAction, serviceId, transaction);

      if (serviceAction.isFinal && serviceAction.applicationStatus == "R") {
        const { sql, params } = buildUpdateWithWhereSql(
          "temps.application",
          {
            id: data.applicationId,
          },
          { status: "R", nextAppDesignationId: 0 }
        );
        result = (await transaction.query(sql, params)).rows[0];
        await transaction.query("COMMIT");
        return result && !response
          ? { message: serviceAction.notification, data: toCamelKeys(result) }
          : result && response
          ? { message: serviceAction.notification, data: toCamelKeys(response) }
          : {};
      } else if (serviceAction.applicationStatus === "C") {
        const getAppInfoSql = `SELECT data, next_app_designation_id FROM temps.application WHERE id = $1`;
        const appInfo = (await transaction.query(getAppInfoSql, [data.applicationId])).rows[0];
        if (!appInfo) throw new BadRequestError("আবেদনটি বিদ্যমান নেই");
        appInfo["data"]["nextAppDesinationId"] = appInfo?.next_app_designation_id;
        const { sql, params } = buildUpdateWithWhereSql(
          "temps.application",
          {
            id: data.applicationId,
          },
          { data: appInfo.data, status: "C", nextAppDesignationId: null }
        );
        result = (await transaction.query(sql, params)).rows[0];
        await transaction.query("COMMIT");
        return result && !response
          ? { message: serviceAction.notification, data: toCamelKeys(result) }
          : result && response
          ? { message: serviceAction.notification, data: toCamelKeys(response) }
          : {};
      } else {
        if (data.projectId && data.nextAppDesignationId && !serviceAction.isFinal) {
          const applicationService = Container.get(ApplicationServices);

          if (Number(data.projectId)) {
            const projectIds = await applicationService.getPermitProjectIds(data.nextAppDesignationId);

            if (!projectIds.includes(Number(data.projectId)))
              throw new BadRequestError(`বাছাইকৃত প্রকল্পটিতে পর্যবেক্ষক/ অনুমোদনকারীর অনুমতি নেই`);
          }
        }

        const { sql, params } = buildInsertSql("temps.application_approval", {
          ...lo.omit(data, ["nextAppDesignationId", "payload"]),
          designationId: designationId,
          actionDate: new Date(),
          createdAt: new Date(),
          createdBy: userId,
          userId,
          employeeId,
          officeId: approverOfficeId,
        });
        result = (await transaction.query(sql, params)).rows;

        if (serviceId == 22 && (+data?.serviceActionId === 3 || +data?.serviceActionId === 4)) {
          if (data?.payload) {
            const applicationGetSql = `select data from temps.application where id = $1`;
            const applicationInfo = (await transaction.query(applicationGetSql, [data?.applicationId])).rows[0].data;
            const payload = JSON.parse(data.payload);

            const itemRequisitionDtlInfoArray = payload.itemRequisitionDtlInfo?.map((dtlInfo: any, index: number) => {
              if (+data?.serviceActionId === 3) {
                if (!dtlInfo?.approvedQuantity) {
                  throw new BadRequestError(`${dtlInfo?.itemId?.itemName} এর অনুমোদিত পরিমাণ প্রদান করুন`);
                }
              }
              if (+data?.serviceActionId === 4) {
                if (!dtlInfo?.deliveredQuantity) {
                  throw new BadRequestError(`${dtlInfo?.itemId?.itemName} এর প্রদানের পরিমাণ প্রদান করুন`);
                }
              }
              return {
                ...dtlInfo,
              };
            });
            console.log({ itemRequisitionDtlInfoArray });
            // throw new BadRequestError("Item Requistion Update Error");
            const updateDataQuery = `update temps.application set data = $1 where id = $2`;
            const updateDataParams = [
              {
                ...payload,
                remarks: applicationInfo?.remarks,
                itemRequisitionDtlInfo: itemRequisitionDtlInfoArray,
              },
              Number(data.applicationId),
            ];

            let updateApplicationDataResult;
            try {
              updateApplicationDataResult = await transaction.query(updateDataQuery, updateDataParams);
            } catch (error: any) {
              throw new BadRequestError(error);
            }
          }
        } else if (+serviceId === 23 && +data?.serviceActionId === 3) {
          const purchaseOrderService = Container.get(PurchaseOrderService);
          await purchaseOrderService.updatePurchaseOrderApplication(data, transaction, +data?.serviceActionId);
        } else if (+serviceId === 23 && +data?.serviceActionId === 4) {
          const purchaseOrderService = Container.get(PurchaseOrderService);
          await purchaseOrderService.receivePurchasedItem(
            data,
            transaction,
            userId,
            +data?.serviceActionId,
            +designationId,
            data.doptorId
            // serviceAction
          );
        }

        applicationUpdateQuery = `UPDATE 
                              temps.application 
                            SET 
                              status = $1, 
                              updated_at = $2, 
                              updated_by = $3, 
                              next_app_designation_id = $4 
                            WHERE 
                              id = $5`;

        applicationUpdateParams = [
          serviceAction.applicationStatus,
          new Date(),
          userId,
          data.nextAppDesignationId
            ? data.nextAppDesignationId
            : serviceAction.applicationStatus == "O"
            ? designationId
            : 0,
          Number(data.applicationId),
        ];

        const getSpecificApplicationSql = `SELECT 
                                            id,
                                            doptor_id,
                                            project_id,
                                            samity_id,
                                            service_id,
                                            next_app_designation_id,
                                            status,
                                            data,
                                            created_by
                                          FROM
                                            temps.application
                                          WHERE
                                            id = $1`;

        let [applicationData] = (await transaction.query(getSpecificApplicationSql, [data.applicationId])).rows;

        if (!applicationData) throw new BadRequestError("আবেদনটি খুঁজে পাওয়া যাইনি");

        applicationData = applicationData ? toCamelKeys(applicationData) : applicationData;
        const officeId = applicationData.data.officeId;

        //final data save during approval

        if (serviceAction.isFinal) {
          //same user request and approval checking
          // const requestUserIdSql = `SELECT created_by from temps.application
          // WHERE id=$1`;

          // const requestUser = (await transaction.query(requestUserIdSql, [applicationData.id])).rows[0];
          if (applicationData.status == "A") throw new BadRequestError(`আবেদনটি ইতিমধ্যে অনুমোদন করা হয়েছে`);
          else if (applicationData.created_by == userId) {
            throw new BadRequestError("আবেদনকারী এবং অনুমোদনকারী ভিন্ন হতে হবে");
          } else {
            if (serviceId == 4) {
              response = await projectService.createUserWiseProject(data.doptorId, applicationData.data, transaction);
            } else if (serviceId == 7) {
              const userLimitSql = `
              SELECT 
                limit_amount 
              FROM 
                loan.user_loan_approval_lmt 
              WHERE 
                doptor_id = $1 
                AND project_id = $2 
                AND product_id = $3 
                AND user_id = $4`;

              const userLimit = (
                await transaction.query(userLimitSql, [
                  data.doptorId,
                  applicationData.projectId,
                  applicationData.data.productId,
                  userId,
                ])
              ).rows[0];

              if (!userLimit?.limit_amount) throw new BadRequestError(`ব্যবহারকারীর ঋণ অনুমোদনের সীমা পাওয়া যাইনি`);
              else if (parseInt(userLimit.limit_amount) < Number(applicationData.data.loanAmount))
                throw new BadRequestError(`ব্যবহারকারীর সর্বোচ্চ ঋণ অনুমোদনের পরিমাণ ${userLimit.limit_amount}`);
              else {
                console.log({ applicationData });

                const sanctionService: SanctionService = Container.get(SanctionService);
                response = await sanctionService.sanctionApproval(
                  applicationData.samityId,
                  lo.omit(applicationData.data, ["nextAppDesinationId"]),
                  transaction,
                  userId,
                  data.doptorId,
                  data.projectId,
                  data.applicationId,
                  officeId
                );
              }
            } else if (serviceId == 9) {
              const scheduleService: ScheduleService = Container.get(ScheduleService);
              response = await scheduleService.loanDisbursementApproval(
                applicationData.data,
                transaction,
                userId,
                officeId,
                data.doptorId
              );
            } else if (serviceId == 11) {
              const productApprovalService: ProductApprovalService = Container.get(ProductApprovalService);
              response = await productApprovalService.productApproval(
                userId,
                applicationData.data,
                data.doptorId,
                transaction
              );
            } else if (serviceId == 20) {
              const savingsProductApprovalService: SavingsProductApprovalService =
                Container.get(SavingsProductApprovalService);
              response = await savingsProductApprovalService.savingsProductApproval(
                userId,
                applicationData.data,
                data.doptorId,
                transaction
              );
            } else if (serviceId == 12) {
              const productUpdateApprovalService: ProductUpdateApprovalService =
                Container.get(ProductUpdateApprovalService);
              response = await productUpdateApprovalService.productUpdateApproval(
                userId,
                applicationData.data,
                data.doptorId,
                transaction
              );
            } else if (serviceId == 30) {
              const savingsProductUpdateApprovalService: SavingsProductUpdateApplicationApprovalService = Container.get(
                SavingsProductUpdateApplicationApprovalService
              );
              response = await savingsProductUpdateApprovalService.savingsProductUpdateApproval(
                userId,
                applicationData.data,
                data.doptorId,
                transaction
              );
            } else if (serviceId == 13) {
              const fieldOfficerAssignApprovalService: FieldOfficerAssignApprovalService = Container.get(
                FieldOfficerAssignApprovalService
              );
              response = await fieldOfficerAssignApprovalService.fieldOfficerUpdateApproval(
                userId,
                applicationData.data,
                data.doptorId,
                transaction
              );
            } else if (serviceId == 14) {
              const samityApplicationService: SamityApplicationService = Container.get(SamityApplicationService);
              response = await samityApplicationService.mainSamityMembersApproval(
                userId,
                applicationData.data,
                applicationData.projectId,
                data.doptorId,
                officeId,
                transaction
              );
            } else if (serviceId == 15) {
              const samityApplicationService: SamityApplicationService = Container.get(SamityApplicationService);
              response = await samityApplicationService.samityMembersApproval(
                userId,
                applicationData.data,
                applicationData.projectId,
                data.doptorId,
                officeId,
                transaction
              );
            } else if (serviceId == 17) {
              const samityMigrationService = Container.get(SamityMigrationService);
              response = await samityMigrationService.loanInfoApproveOfMembers(
                applicationData.id,
                userId,
                serviceAction,
                data,
                transaction
              );
            } else if (serviceId == 16) {
              const balanceMigrationService: BalanceMigrationService = Container.get(BalanceMigrationService);
              response = await balanceMigrationService.store(
                applicationData.doptorId,
                applicationData.data.officeId,
                applicationData.projectId,
                userId,
                applicationData.data.glDetails,
                transaction
              );
            } else if (serviceId == 18) {
              const samityApplicationService: SamityApplicationService = Container.get(SamityApplicationService);
              // response = await samityApplicationService.manualMemberUpdate(applicationData.data, transaction);
            } else if (serviceId == 2) {
              const samityApplicationService: SamityApplicationService = Container.get(SamityApplicationService);
              response = await samityApplicationService.samityUpdateApproval(
                applicationData.data,
                applicationData.samityId,
                transaction
              );
            } else if (serviceId == 19) {
              const dpsApplicationService: DpsApplicationServices = Container.get(DpsApplicationServices);
              response = await dpsApplicationService.dpsApplicationApproval(
                applicationData.data,
                data.doptorId,
                officeId,
                userId,
                data.applicationId,
                transaction
              );
            } else if (serviceId == 21) {
              const storeInMigrationService: StoreInMigrationService = Container.get(StoreInMigrationService);
              response = await storeInMigrationService.approveStoreInMigration(
                applicationData.data,
                Number(userId),
                transaction,
                data.doptorId,
                designationId
              );
            } else if (serviceId == 22) {
              const payload = JSON.parse(data.payload);
              const itemRequisitionService: ItemRequisitionService = Container.get(ItemRequisitionService);
              response = await itemRequisitionService.approveItemRequisition(
                transaction,
                payload.itemRequisitionDtlInfo,
                payload.itemRequisitionMstInfo,
                designationId,
                +data.applicationId,
                +employeeId,
                userId,
                +approverOfficeId,
                data.doptorId
              );
            } else if (+serviceId === 23) {
              const purchaseOrderService = Container.get(PurchaseOrderService);
              await purchaseOrderService.receivePurchasedItem(
                data,
                transaction,
                userId,
                +data?.serviceActionId,
                +designationId,
                data.doptorId
                // serviceAction
              );
            } else if (serviceId == 24) {
              const cashWithdrawApplicationServices: CashWithdrawApplicationServices = Container.get(
                CashWithdrawApplicationServices
              );
              response = await cashWithdrawApplicationServices.cashWithdrawApproval(
                applicationData.data,
                transaction,
                userId,
                officeId,
                data.doptorId,
                serviceId
              );
            } else if (serviceId == 25) {
              const reverseTranApplicationService: ReverseTranApplicationService =
                Container.get(ReverseTranApplicationService);
              response = await reverseTranApplicationService.reverseApproval(
                applicationData.data,
                transaction,
                userId,
                officeId,
                data.doptorId,
                serviceId
              );
            } else if (serviceId == 26) {
              const transectionService: TransactionService = Container.get(TransactionService);
              response = await transectionService.makeDpsClose(
                applicationData.data,
                applicationData.doptorId,
                officeId,
                applicationData.projectId,
                userId,
                transaction
              );
            } else if (serviceId == 27) {
              const fdrApplicationServices: FdrApplicationServices = Container.get(FdrApplicationServices);
              response = await fdrApplicationServices.fdrApplicationApproval(
                applicationData.data,
                applicationData.doptorId,
                applicationData.projectId,
                officeId,
                applicationData.id,
                userId,
                transaction
              );
            } else if (serviceId == 28) {
              const loanSettlementApplicationServices: LoanSettlementApplicationServices = Container.get(
                LoanSettlementApplicationServices
              );
              response = await loanSettlementApplicationServices.loanSettlementApproval(
                applicationData.data,
                transaction,
                userId,
                officeId,
                applicationData.doptorId
              );
            } else if (serviceId == 29) {
              const fdrService: FdrService = Container.get(FdrService);
              response = await fdrService.makeFdrClose(
                applicationData.data,
                applicationData.doptorId,
                officeId,
                applicationData.projectId,
                userId,
                transaction
              );
            } else if (serviceId == 31) {
              const itemReturnService = Container.get(ItemReturnService);
              response = await itemReturnService.receiveReturnedItem(
                data,
                transaction,
                userId,
                +data?.serviceActionId,
                +designationId,
                data.doptorId
              );
            } else if (serviceId == 32) {
              const loanAdjustment = Container.get(LoanAdjustmentApplicationServices);
              response = await loanAdjustment.loanAdjustmentApproval(
                applicationData.data,
                applicationData.doptorId,
                officeId,
                userId,
                transaction
              );
            } else {
              throw new BadRequestError(`সেবাটি বিদ্যমান নেই`);
            }
          }
          //notifcation
          const notificationService = Container.get(NotificationService);
          await notificationService.create(serviceAction.notification as notificationObject, {
            userType: applicationData.data.userType,
            userId: applicationData.data.userId,
            doptorId: data.doptorId,
            serviceId,
            componentId: 1,
            message: await notificationService.createCustomNotificationMessageForLoan(serviceId, data.applicationId),
            applicationStatus: applicationData.status,
            applicationId: applicationData.id,
            serviceActionId: data.serviceActionId,
            createdBy: userId.toString(),
          });
        }
      }
      await transaction.query(applicationUpdateQuery, applicationUpdateParams);
      await transaction.query("COMMIT");
      return result && !response
        ? { message: serviceAction.notification, data: toCamelKeys(result) }
        : result && response
        ? { message: serviceAction.notification, data: toCamelKeys(response) }
        : {};
    } catch (error: any) {
      console.log("errorr", error);
      transaction.query("ROLLBACK");
      throw new BadRequestError(String(error).substring(7));
    } finally {
      transaction.release();
    }
  }

  async getByApplicationId(applicationId: number) {
    const query = `
    SELECT a.id,
      a.user_id,
      a.application_id,
      a.remarks,
      a.action_date,
      a.service_action_id,
      a.origin_unit_id,
      a.office_id,
      a.designation_id,
      a.employee_Id,
      a.attachment,
      b.username,
      c.name_bn as office_name_bangla,
      c.name as office_name,
      d.designation
    FROM temps.application_approval a
      INNER JOIN users.user b ON b.id = a.user_id
      INNER JOIN master.office_info c ON c.id = a.office_id
      LEFT JOIN master.employee_office d ON d.id = a.designation_id
    WHERE application_id = $1
    `;
    const params = [applicationId];

    const { rows: data } = await (await db.getConnection("slave")).query(query, params);

    return data ? toCamelKeys(data) : data;
  }
  async getServiceName(transaction: PoolClient, serviceId: any, actionId: any) {
    const serviceActionSql = `SELECT service_action
    FROM master.service_info
    WHERE id =$1`;
    const actions = (await transaction.query(serviceActionSql, [serviceId])).rows[0]?.service_action;
    console.log({ actions });
    const actionName = actions?.find((action: any) => {
      console.log({ action });
      return +action.id === +actionId;
    })?.name;
    return actionName;
  }
  async checkIfAnyMandatoryActionIsRequired(
    applicationId: number,
    serviceAction: any,
    serviceId: number,
    transaction: PoolClient
  ) {
    if (serviceAction?.mandatoryAction && serviceAction?.mandatoryAction?.length > 0) {
      for (let actionId of serviceAction.mandatoryAction) {
        const sql = `select service_action_id from temps.application_approval where application_id = $1`;
        const seriviceActionIdInApplicationApproval: any = (await transaction.query(sql, [applicationId])).rows;

        if (seriviceActionIdInApplicationApproval?.length === 0) {
          throw new BadRequestError(
            `এই আবেদনটি ${await this.getServiceName(transaction, serviceId, actionId)} করা হয়নি`
          );
        }

        if (
          !seriviceActionIdInApplicationApproval
            ?.map((servAction: any) => servAction?.service_action_id)
            .includes(actionId)
        ) {
          throw new BadRequestError(
            `এই আবেদনটি ${await this.getServiceName(transaction, serviceId, actionId)} করা হয়নি`
          );
        }
      }
    }
  }
}
