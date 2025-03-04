import Container, { Service } from "typedi";
import { Pool, PoolClient } from "pg";
import { toCamelKeys } from "keys-transform";
import BadRequestError from "../../../errors/bad-request.error";
import { buildInsertSql, buildUpdateWithWhereSql } from "../../../utils/sql-builder.util";

import { Moment } from "moment-timezone";

@Service()
export class RepaymentReverseService {
  constructor() {}

  //Service Charge check and inactive from table
  async serviceChargeUpdate(
    transaction: PoolClient,
    doptorId: number,
    officeId: number,
    productId: number,
    accountId: number,
    tranAmt: number,
    tranNumber: string,
    tranDate: Moment,
    userId: number
  ) {
    const serviceChargeSql = `SELECT *
    FROM loan.Service_Charge_Info
   WHERE     doptor_id = $1
         AND office_id = $2
         AND product_id = $3
         AND account_id = $4
         AND ref_doc_no = $5
         AND tran_date = $6`;
    let serviceChargeData = (
      await transaction.query(serviceChargeSql, [doptorId, officeId, productId, accountId, tranNumber, tranDate])
    ).rows;

    for (let singleServiceCharge of serviceChargeData) {
      if (singleServiceCharge.tranCode == "INC" && singleServiceCharge.amount != tranAmt) {
        throw new BadRequestError(`সার্ভিস চার্জ এর তথ্যে পার্থক্য পাওয়া গেছে`);
      }

      const deleteServiceChargeSql = `DELETE
      FROM loan.Service_Charge_Info
     WHERE   id=$1`;
      transaction.query(deleteServiceChargeSql, [singleServiceCharge.id]);

      let { sql: DeleteCrgSql, params: DeleteCrgPatams } = buildInsertSql("logs.delete_service_charge_info", {
        doptorId,
        officeId,
        projectId: singleServiceCharge.project_id ? singleServiceCharge.project_id : null,
        productId: singleServiceCharge.product_id,
        accountId: singleServiceCharge.account_id,
        tranDate: singleServiceCharge.openCloseDate,
        valDate: singleServiceCharge.val_date,
        tranCode: singleServiceCharge.tran_date,
        drcrCode: singleServiceCharge.drcr_code,
        amount: singleServiceCharge.amount,
        refTranId: singleServiceCharge.ref_tran_id,
        refDocNo: singleServiceCharge.ref_doc_no,
        isProvision: singleServiceCharge.is_provision,
        provisionNo: singleServiceCharge.provision_no,
        provisionBy: singleServiceCharge.provision_by,
        provisionDate: singleServiceCharge.provision_date,
        isTransfered: singleServiceCharge.is_transfered,
        transferBy: singleServiceCharge.transfer_by,
        transferDate: singleServiceCharge.transfer_date,
        isReversed: singleServiceCharge.is_reversed,
        reverseTranId: singleServiceCharge.reverse_tran_id,
        reverseDocNo: singleServiceCharge.reverse_doc_no,
        reverseDate: singleServiceCharge.reverse_date,
        reverseBy: singleServiceCharge.reverse_by,
        remarks: singleServiceCharge.remarks,
        createdBy: singleServiceCharge.created_by,
        createdAt: singleServiceCharge.created_at,
        updatedBy: userId,
        updatedAt: new Date(),
      });
      transaction.query(DeleteCrgSql, DeleteCrgPatams);
    }

    return serviceChargeData ? toCamelKeys(serviceChargeData) : [];
  }

  async scheduleUpdate(
    transaction: PoolClient,
    doptorId: number,
    officeId: number,
    productId: number,
    accountId: number,
    tranNumber: string,
    tranDate: Moment,
    tranCode: string,
    transactionAmt: number,
    userId: number
  ) {
    const paidScheduleSql = `  SELECT id                                    id,
                                      installment_no                        installment_no,
                                      COALESCE (principal_paid_amount, 0)   principal_paid_amount,
                                      COALESCE (interest_paid_amount, 0)    interest_paid_amount,
                                      COALESCE (total_paid_amount, 0)       total_paid_amount,
                                      transaction_details
                              FROM loan.schedule_info
                                WHERE     doptor_id = $1
                                      AND office_id = $2
                                      AND product_id = $3
                                      AND account_id = $4
                                      AND COALESCE (total_paid_amount, 0) > 0
                                ORDER BY installment_no DESC`;

    let paidScheduleData = (await transaction.query(paidScheduleSql, [doptorId, officeId, productId, accountId])).rows;
    paidScheduleData = paidScheduleData[0] ? (toCamelKeys(paidScheduleData) as any) : [];

    for (let singlePaidSchedule of paidScheduleData) {
      const tranDetails = singlePaidSchedule.transactionDetails;

      if (tranCode == "REP" && transactionAmt > 0) {
        let schedulePrincipal = tranDetails.filter(
          (value: any) => value.tranNum == tranNumber && value.paidDate == tranDate && value.tranCode == "REP"
        );

        if (schedulePrincipal && schedulePrincipal.length > 0) {
          singlePaidSchedule.principalPaidAmount =
            Number(singlePaidSchedule.principalPaidAmount) - Number(schedulePrincipal[0].tranAmt);
          singlePaidSchedule.totalPaidAmount =
            Number(singlePaidSchedule.totalPaidAmount) - Number(schedulePrincipal[0].tranAmt);

          const { sql: updateScheduleSql, params: updateScheduleParams } = buildUpdateWithWhereSql(
            "loan.schedule_info",
            { doptorId, officeId, productId, accountId, id: singlePaidSchedule.id },
            {
              principalPaidAmount: singlePaidSchedule.principalPaidAmount,
              totalPaidAmount: singlePaidSchedule.totalPaidAmount,
            }
          );
          transaction.query(updateScheduleSql, updateScheduleParams);
          transactionAmt = Number(transactionAmt) - Number(schedulePrincipal[0].tranAmt);
        }

        schedulePrincipal = [];
      }
      if (tranCode == "INC" && transactionAmt > 0) {
        let scheduleServiceCrg = tranDetails.filter(
          (value: any) => value.tranNum == tranNumber && value.paidDate == tranDate && value.tranCode == "INC"
        );

        if (scheduleServiceCrg && scheduleServiceCrg.length > 0) {
          singlePaidSchedule.interestPaidAmount =
            Number(singlePaidSchedule.interestPaidAmount) - Number(scheduleServiceCrg[0].tranAmt);
          singlePaidSchedule.totalPaidAmount =
            Number(singlePaidSchedule.totalPaidAmount) - Number(scheduleServiceCrg[0].tranAmt);
          // update db
          const { sql: updateScheduleSql, params: updateScheduleParams } = buildUpdateWithWhereSql(
            "loan.schedule_info",
            { doptorId, officeId, productId, accountId, id: singlePaidSchedule.id },
            {
              totalPaidAmount: singlePaidSchedule.totalPaidAmount,
              interestPaidAmount: singlePaidSchedule.interestPaidAmount,
            }
          );
          transaction.query(updateScheduleSql, updateScheduleParams);
          transactionAmt = Number(transactionAmt) - Number(scheduleServiceCrg[0].tranAmt);
        }

        scheduleServiceCrg = [];
      }

      const { sql: updateScheduleSql, params: updateScheduleParams } = buildUpdateWithWhereSql(
        "loan.schedule_info",
        { doptorId, officeId, productId, accountId, id: singlePaidSchedule.id },
        {
          isPaymentComplete: false,
          updatedBy: userId,
          updatedAt: new Date(),
        }
      );
      transaction.query(updateScheduleSql, updateScheduleParams);
    }

    return paidScheduleData ? toCamelKeys(paidScheduleData) : [];
  }
}
