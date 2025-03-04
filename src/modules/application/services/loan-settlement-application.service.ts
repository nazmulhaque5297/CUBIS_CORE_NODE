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

@Service()
export class LoanSettlementApplicationServices {
  constructor() {}
  async createLoanSettlementApplication(applicationData: any, pool: Pool) {
    const checkRepeatedApplicationSql = `SELECT
                                    count(id)
                                  FROM
                                    temps.application
                                  WHERE
                                    service_id = $1
                                    AND next_app_designation_id != 0
                                    AND CAST(data ->> 'customer_id' as integer) = $2`;
    const accountInfoSql = `SELECT
                              b.current_balance
                            FROM
                              loan.account_info a
                              INNER JOIN loan.account_balance b ON b.account_id = a.id
                            WHERE
                              a.id = $1`;

    const checkRepeatedApplicationInfo = (
      await pool.query(checkRepeatedApplicationSql, [applicationData.serviceId, applicationData.data.customerId])
    ).rows[0];
    if (checkRepeatedApplicationInfo && checkRepeatedApplicationInfo?.count > 0)
      throw new BadRequestError(`প্রদত্ত সদস্যের একটি ঋণ হিসাব বন্ধের আবেদন অপেক্ষমাণ আছে`);
    else {
      const accountInfo = (await pool.query(accountInfoSql, [applicationData.data.accountId])).rows[0];
      if (Number(accountInfo?.current_balance) < Number(applicationData.data.duePrincipal))
        throw new BadRequestError(`সদস্যের পরিশোধিত আসল ও ঋণ হিসাবের ব্যালেন্স এর মধ্যে ভিন্নতা আছে`);
      else {
        const { sql, params } = buildInsertSql("temps.application", {
          ...lodash.omit(applicationData, ["officeId", "serviceName"]),
        });
        const applicationResponse = (await pool.query(sql, params)).rows[0];

        return applicationResponse ? toCamelKeys(applicationResponse) : {};
      }
    }
  }
  async getLoanSettlementApplicationDetails(
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

    const samityService: SamityService = Container.get(SamityService);
    const loanDueAmountInfo = await samityService.getCustomerDueLoanAmount(Number(appInfo.data.accountId));

    const applicationService: ApplicationServices = Container.get(ApplicationServices);
    const finalInfo = {
      type: applicationType,
      applicationInfo: {
        ...applicationDetails,
        narration: appInfo.data.remarks,
        ...loanDueAmountInfo,
        applicationId: applicationId,
        serviceId: appInfo.serviceId,
      },
      history: await applicationService.getAppHistory(applicationId, pool),
    };

    return finalInfo ? toCamelKeys(finalInfo) : {};
  }

  async loanSettlementApproval(
    allData: any,
    transaction: PoolClient,
    userId: number,
    officeId: number,
    doptorId: number
  ) {
    const loanSettlementApplicationData = toCamelKeys(allData) as any;

    const productSql = `SELECT
                          b.current_balance,
                          c.id, 
                          c.product_gl
                        FROM 
                          loan.account_info a
                          INNER JOIN loan.account_balance b ON b.account_id = a.id
                          INNER JOIN loan.product_mst c ON c.id = a.product_id
                        WHERE 
                          a.id = $1`;
    const productInfo = (await transaction.query(productSql, [loanSettlementApplicationData.accountId])).rows[0];

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
      id: Number(loanSettlementApplicationData.customerId),
    });
    const transactionService: TransactionService = Container.get(TransactionService);
    const batchNum = await transactionService.generateBatchNumber(transaction);
    const tranNum = await transactionService.generateTransactionNumber(transaction);

    const repayAmount = loanSettlementApplicationData?.repayAmount
      ? Number(loanSettlementApplicationData.repayAmount)
      : 0;

    let transactionSets = [
      {
        productId: productInfo.id,
        projectId: loanSettlementApplicationData.projectId ? loanSettlementApplicationData.projectId : null,
        accountId: loanSettlementApplicationData.accountId,
        naration: loanSettlementApplicationData.remarks
          ? `${loanSettlementApplicationData.remarks} | ঋণ হিসাব বন্ধ করা হয়েছে- সদস্যের নাম: ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode})`
          : `ঋণ হিসাব বন্ধ করা হয়েছে- সদস্যের নাম: ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode})`,
        drcrCode: "C",
        glacId: productInfo.product_gl,
        batchNum,
        tranNum: tranNum,
        tranAmt: repayAmount,
        tranCode: "CLS",
        tranType: "CASH",
      },
      {
        productId: productInfo.id,
        projectId: loanSettlementApplicationData.projectId ? loanSettlementApplicationData.projectId : null,
        naration: loanSettlementApplicationData.remarks
          ? `${loanSettlementApplicationData.remarks} | ঋণ হিসাব বন্ধ করা হয়েছে- সদস্যের নাম: ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode})`
          : `ঋণ হিসাব বন্ধ করা হয়েছে- সদস্যের নাম: ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode})`,
        drcrCode: "D",
        glacId: cashInHandGl[0].id,
        batchNum,
        tranNum: tranNum,
        tranAmt: repayAmount,
        tranCode: "CLS",
        tranType: "CASH",
      },
    ];

    const transactionInfo = (await transactionService.generalTransactionEngine(
      doptorId,
      officeId,
      loanSettlementApplicationData.projectId ? loanSettlementApplicationData.projectId : null,
      userId,
      null,
      transactionSets,
      transaction
    )) as any;
    let result = await transactionService.createRepayment(
      {
        accountId: loanSettlementApplicationData.accountId,
        productId: productInfo.id,
        tranAmt: repayAmount,
        tranNum,
      },
      doptorId as number,
      officeId as number,
      loanSettlementApplicationData.projectId,
      batchNum,
      "CASH",
      { gl: [], account: [] },
      userId as number,
      transaction
    );

    return transactionInfo[0] ? toCamelKeys(transactionInfo) : [];
  }
}
