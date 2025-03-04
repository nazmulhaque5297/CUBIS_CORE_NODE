import { toCamelKeys } from "keys-transform";
import { Pool, PoolClient } from "pg";
import Container, { Service } from "typedi";
import { ApplicationServices } from "./application.service";
import { minioPresignedGet } from "../../../utils/minio.util";
import BadRequestError from "../../../errors/bad-request.error";
import TransactionService from "../../transaction/services/transaction.service";
import { buildInsertSql, buildUpdateWithWhereSql } from "../../../utils/sql-builder.util";
import SamityService from "../../samity/services/samity.service";
import lodash from "lodash";
import { AccountServices } from "../../../modules/transaction/services/account.service";

@Service()
export class CashWithdrawApplicationServices {
  constructor() {}
  async createCashWithdrawApplication(applicationData: any, pool: Pool) {
    const checkRepeatedApplicationSql = `SELECT 
                                    count(id) 
                                  FROM 
                                    temps.application 
                                  WHERE 
                                    service_id = $1 
                                    AND status NOT IN('A','R')
                                    AND CAST(data ->> 'customer_id' as integer) = $2 
                                    AND CAST(data ->> 'account_id' as integer) = $3`;
    const withdrawInstructionSql = `SELECT 
                                      a.withdraw_instruction,
                                      a.account_status, 
                                      b.current_balance, 
                                      b.block_amt
                                    FROM 
                                      loan.account_info a 
                                      INNER JOIN loan.account_balance b ON b.account_id = a.id 
                                    WHERE 
                                      a.id = $1`;

    const checkRepeatedApplicationInfo = (
      await pool.query(checkRepeatedApplicationSql, [
        applicationData.serviceId,
        applicationData.data.customerId,
        applicationData.data.accountId,
      ])
    ).rows[0];
    const accountServices: AccountServices = Container.get(AccountServices);
    await accountServices.accountStatusCheck(applicationData.data.accountId, pool);
    if (checkRepeatedApplicationInfo && checkRepeatedApplicationInfo?.count > 0)
      throw new BadRequestError(`প্রদত্ত সদস্যের একটি নগদ উত্তোলনের আবেদন অপেক্ষমাণ আছে`);
    else {
      const withdrawInstructionInfo = (await pool.query(withdrawInstructionSql, [applicationData.data.accountId]))
        .rows[0];
      if (withdrawInstructionInfo?.account_status != "ACT") throw new BadRequestError(`সদস্যের অ্যাকাউন্টটি সচল নয়`);
      else {
        const availableAmount: number =
          Number(withdrawInstructionInfo?.current_balance) - Number(withdrawInstructionInfo?.block_amt);
        if (availableAmount < Number(applicationData.data.withdrawAmount))
          throw new BadRequestError(`সদস্যের অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই`);
        else if (withdrawInstructionInfo && withdrawInstructionInfo == "N")
          throw new BadRequestError(`প্রদত্ত অ্যাকাউন্ট থেকে টাকা উত্তোলনের অনুমতি নেই`);
        else {
          const { sql, params } = buildInsertSql("temps.application", {
            ...lodash.omit(applicationData, ["officeId", "serviceName"]),
          });
          const applicationResponse = (await pool.query(sql, params)).rows[0];

          return applicationResponse ? toCamelKeys(applicationResponse) : {};
        }
      }
    }
  }
  async getCashWithdrawApplicationDetails(
    applicationId: number,
    applicationType: string,
    componentId: number,
    pool: Pool
  ) {
    const appInfoSql = `SELECT 
                          doptor_id,
                          service_id,
                          data,
                          project_id
                        FROM 
                          temps.application 
                        WHERE 
                          id = $1 and component_id = $2`;
    let appInfo = (await pool.query(appInfoSql, [applicationId, componentId])).rows[0];
    appInfo = appInfo ? toCamelKeys(appInfo) : appInfo;

    const applicationDetailsSql = `SELECT 
                                    a.samity_name, 
                                    a.samity_code, 
                                    b.customer_code, 
                                    b.name_bn customer_name, 
                                    b.mobile, 
                                    c.document_data ->> 'member_picture' member_picture, 
                                    d.account_no, 
                                    d.account_title, 
                                    e.current_balance, 
                                    f.project_name_bangla, 
                                    g.product_name 
                                  FROM 
                                    samity.samity_info a 
                                    LEFT JOIN samity.customer_info b ON b.samity_id = a.id 
                                    LEFT JOIN loan.document_info c ON c.ref_no = b.id 
                                    LEFT JOIN loan.account_info d ON d.customer_id = b.id 
                                    LEFT JOIN loan.account_balance e ON e.account_id = d.id 
                                    LEFT JOIN master.project_info f ON f.id = a.project_id 
                                    LEFT JOIN loan.product_mst g ON g.id = d.product_id 
                                  WHERE 
                                    a.office_id = $1 
                                    AND a.project_id = $2 
                                    AND b.id = $3 
                                    AND d.id = $4 
                                    AND d.account_status = 'ACT'`;
    let applicationDetails = (
      await pool.query(applicationDetailsSql, [
        appInfo.data.officeId,
        appInfo.projectId,
        appInfo.data.customerId,
        appInfo.data.accountId,
      ])
    ).rows[0];
    applicationDetails = await minioPresignedGet(applicationDetails, ["member_picture"]);

    const applicationService: ApplicationServices = Container.get(ApplicationServices);
    const finalInfo = {
      type: applicationType,
      applicationInfo: {
        ...applicationDetails,
        withdrawAmount: appInfo.data.withdrawAmount,
        narration: appInfo.data.remarks,
        applicationId: applicationId,
        serviceId: appInfo.serviceId,
      },
      history: await applicationService.getAppHistory(applicationId, pool),
    };

    return finalInfo ? toCamelKeys(finalInfo) : {};
  }

  async cashWithdrawApproval(
    allData: any,
    transaction: PoolClient,
    userId: number,
    officeId: number,
    doptorId: number,
    serviceId: number
  ) {
    const cashWithdrawApplicationData = toCamelKeys(allData) as any;
    const accountServices: AccountServices = Container.get(AccountServices);
    await accountServices.accountStatusCheck(cashWithdrawApplicationData.accountId, transaction);
    const productSql = `SELECT
                          b.id, 
                          b.product_gl
                        FROM 
                          loan.account_info a
                          INNER JOIN loan.product_mst b ON b.id = a.product_id
                        WHERE 
                          a.id = $1`;
    const productInfo = (await transaction.query(productSql, [cashWithdrawApplicationData.accountId])).rows[0];

    const cashInHandGlSql = `SELECT 
                              id 
                            FROM 
                              loan.glac_mst 
                            WHERE 
                              doptor_id = $1
                              AND is_cash_in_hand = true 
                              AND parent_child = 'C'`;
    const cashInHandGl = (await transaction.query(cashInHandGlSql, [doptorId])).rows;
    if (!cashInHandGl[0]) throw new BadRequestError(`প্রদত্ত দপ্তরের ক্ষেত্রে হাতে নগদ জি এল অ্যাকাউন্ট পাওয়া যায়নি`);
    if (cashInHandGl.length > 1)
      throw new BadRequestError(`প্রদত্ত দপ্তরের ক্ষেত্রে একাধিক হাতে নগদ জি এল অ্যাকাউন্ট পাওয়া গেছে`);
    const samityService: SamityService = Container.get(SamityService);
    const customerInfo = await samityService.getMainMember(1, 1, {
      id: Number(cashWithdrawApplicationData.customerId),
    });
    const transactionService: TransactionService = Container.get(TransactionService);
    const batchNum = await transactionService.generateBatchNumber(transaction);
    const tranNum = await transactionService.generateTransactionNumber(transaction);

    let transactionSets = [
      {
        productId: productInfo.id,
        projectId: cashWithdrawApplicationData.projectId ? cashWithdrawApplicationData.projectId : null,
        accountId: cashWithdrawApplicationData.accountId,
        naration: cashWithdrawApplicationData.remarks
          ? `${cashWithdrawApplicationData.remarks} | নগদ উত্তোলন করা হয়েছে- সদস্যের নাম: ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode})`
          : `নগদ উত্তোলন করা হয়েছে- সদস্যের নাম: ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode})`,
        drcrCode: "D",
        glacId: productInfo.product_gl,
        batchNum,
        tranNum: tranNum,
        tranAmt: cashWithdrawApplicationData.withdrawAmount,
        tranCode: "WDL",
        tranType: "CASH",
      },
      {
        productId: productInfo.id,
        projectId: cashWithdrawApplicationData.projectId ? cashWithdrawApplicationData.projectId : null,
        naration: cashWithdrawApplicationData.remarks
          ? `${cashWithdrawApplicationData.remarks} | নগদ উত্তোলন করা হয়েছে- সদস্যের নাম: ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode})`
          : `নগদ উত্তোলন করা হয়েছে- সদস্যের নাম: ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode})`,
        drcrCode: "C",
        glacId: cashInHandGl[0].id,
        batchNum,
        tranNum: tranNum,
        tranAmt: cashWithdrawApplicationData.withdrawAmount,
        tranCode: "WDL",
        tranType: "CASH",
      },
    ];

    const transactionInfo = await transactionService.generalTransactionEngine(
      doptorId,
      officeId,
      cashWithdrawApplicationData.projectId ? cashWithdrawApplicationData.projectId : null,
      userId,
      null,
      transactionSets,
      transaction
    );

    return { doptorId, tranNumber: tranNum, serviceId };
  }
}
