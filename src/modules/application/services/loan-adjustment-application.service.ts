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
export class LoanAdjustmentApplicationServices {
  constructor() {}
  async createLoanAdjustmentApplication(applicationData: any, pool: Pool) {
    const checkRepeatedApplicationSql = `SELECT 
                                    count(id) 
                                  FROM 
                                    temps.application 
                                  WHERE 
                                    service_id = $1 
                                    AND status NOT IN('A','R')
                                    AND CAST(data ->> 'customer_id' as integer) = $2`;
    //   AND CAST(data ->> 'account_id' as integer) = $3`;

    const checkRepeatedApplicationInfo = (
      await pool.query(checkRepeatedApplicationSql, [applicationData.serviceId, applicationData.data.customerId])
    ).rows[0];
    const accountServices: AccountServices = Container.get(AccountServices);
    // await accountServices.accountStatusCheck(applicationData.data.accountId, pool);
    if (checkRepeatedApplicationInfo && checkRepeatedApplicationInfo?.count > 0)
      throw new BadRequestError(`প্রদত্ত সদস্যের একটি নগদ উত্তোলনের আবেদন অপেক্ষমাণ আছে`);
    else {
      const samityService: SamityService = Container.get(SamityService);
      await samityService.withdrawInstructionValidate(
        applicationData.data.savingsAccountId,
        applicationData.data.adjustmentAmount,
        pool
      );
      const { sql, params } = buildInsertSql("temps.application", {
        ...lodash.omit(applicationData, ["officeId", "serviceName"]),
      });
      const applicationResponse = (await pool.query(sql, params)).rows[0];

      return applicationResponse ? toCamelKeys(applicationResponse) : {};
    }
  }

  async getLoanAdjustmentApplicationDetails(
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

    const projectSql = `SELECT project_name_bangla
                            FROM master.project_info
                            WHERE id = $1`;

    let projectInfo = (await pool.query(projectSql, [appInfo.projectId])).rows[0];

    const samityMemberSql = `SELECT a.samity_name       samity_name,
                                    a.samity_code       samity_code,
                                    b.customer_code     customer_code,
                                    b.name_bn           customer_name,
                                    b.mobile    mobile_number
                                FROM samity.samity_info a INNER JOIN samity.customer_info b 
                                ON b.samity_id = a.id
                                WHERE b.id = $1 
                                AND COALESCE (b.CUSTOMER_STATUS, 'ACT') = 'ACT'`;

    let samityMemberInfo = (await pool.query(samityMemberSql, [appInfo.data.customerId])).rows[0];

    const documentSql = `SELECT  document_data ->> 'member_picture' member_picture
                                FROM loan.document_info
                                WHERE ref_no = $1`;
    let documentInfo = (await pool.query(documentSql, [appInfo.data.customerId])).rows[0];

    const depositAccountSql = `SELECT  a.product_name        product_name,
                                b.account_no          account_no,
                                b.account_title       account_title,
                                c.current_balance     current_balance
                                FROM loan.product_mst  a
                                INNER JOIN loan.account_info b ON b.product_id = a.id
                                INNER JOIN loan.account_balance c ON c.account_id = b.id
                          WHERE b.id = $1 
                          AND COALESCE (b.account_status, 'ACT') = 'ACT'`;

    let depositAccountInfo = (await pool.query(depositAccountSql, [appInfo.data.savingsAccountId])).rows[0];

    const loanAccountSql = `SELECT  a.product_name        product_name,
                                b.account_no          account_no,
                                b.account_title       account_title,
                                c.current_balance     current_balance
                                FROM loan.product_mst  a
                                INNER JOIN loan.account_info b ON b.product_id = a.id
                                INNER JOIN loan.account_balance c ON c.account_id = b.id
                          WHERE b.id = $1 
                          AND COALESCE (b.account_status, 'ACT') = 'ACT'`;
    let loanAccountInfo = (await pool.query(loanAccountSql, [appInfo.data.loanAccountId])).rows[0];

    // const applicationDetailsSql = `SELECT
    //                               a.samity_name,
    //                               a.samity_code,
    //                               b.customer_code,
    //                               b.name_bn customer_name,
    //                               b.mobile_number,
    //                               c.document_data ->> 'member_picture' member_picture,
    //                               d.account_no,
    //                               d.account_title,
    //                               e.current_balance,
    //                               f.project_name_bangla,
    //                               g.product_name
    //                             FROM
    //                               samity.samity_info a
    //                               LEFT JOIN samity.customer_info b ON b.samity_id = a.id
    //                               LEFT JOIN loan.document_info c ON c.ref_no = b.id
    //                               LEFT JOIN loan.account_info d ON d.customer_id = b.id
    //                               LEFT JOIN loan.account_balance e ON e.account_id = d.id
    //                               LEFT JOIN master.project_info f ON f.id = a.project_id
    //                               LEFT JOIN loan.product_mst g ON g.id = d.product_id
    //                             WHERE
    //                               a.office_id = $1
    //                               AND a.project_id = $2
    //                               AND b.id = $3
    //                               AND d.id = $4
    //                               AND d.account_status = 'ACT'`;
    // let applicationDetails = (
    //   await pool.query(applicationDetailsSql, [
    //     appInfo.data.officeId,
    //     appInfo.projectId,
    //     appInfo.data.customerId,
    //     appInfo.data.accountId,
    //   ])
    // ).rows[0];
    documentInfo = await minioPresignedGet(documentInfo, ["member_picture"]);

    const applicationService: ApplicationServices = Container.get(ApplicationServices);
    const finalInfo = {
      type: applicationType,
      applicationInfo: {
        projectInfo,
        samityMemberInfo,
        documentInfo,
        depositAccountInfo,
        loanAccountInfo,
        adjustmentAmount: appInfo.data.adjustmentAmount,
        narration: appInfo.data.remarks,
        applicationId: applicationId,
        serviceId: appInfo.serviceId,
      },
      history: await applicationService.getAppHistory(applicationId, pool),
    };

    return finalInfo ? toCamelKeys(finalInfo) : {};
  }

  async loanAdjustmentApproval(
    allData: any,
    doptorId: number,
    officeId: number,
    userId: number,
    transaction: PoolClient
  ) {
    const loanAdjustmentApplicationData = toCamelKeys(allData) as any;
    console.log({ loanAdjustmentApplicationData });

    // const accountServices: AccountServices = Container.get(AccountServices);
    // await accountServices.accountStatusCheck(loanAdjustmentApplicationData.accountId, transaction);
    const savingsProductSql = `SELECT
                        b.id,
                        b.product_gl
                      FROM
                        loan.account_info a
                        INNER JOIN loan.product_mst b ON b.id = a.product_id
                      WHERE
                        a.id = $1`;
    const savingsProductInfo = (
      await transaction.query(savingsProductSql, [loanAdjustmentApplicationData.savingsAccountId])
    ).rows[0];

    const loanProductSql = `SELECT
  b.id,
  b.product_gl
FROM
  loan.account_info a
  INNER JOIN loan.product_mst b ON b.id = a.product_id
WHERE
  a.id = $1`;
    const loanProductInfo = (await transaction.query(loanProductSql, [loanAdjustmentApplicationData.loanAccountId]))
      .rows[0];

    const samityService: SamityService = Container.get(SamityService);
    const customerInfo = await samityService.getMainMember(1, 1, {
      id: Number(loanAdjustmentApplicationData.customerId),
    });
    const transactionService: TransactionService = Container.get(TransactionService);
    const batchNum = await transactionService.generateBatchNumber(transaction);
    // const tranNum = await transactionService.generateTransactionNumber(transaction);

    let transactionSets = [
      {
        productId: savingsProductInfo.id,
        accountId: loanAdjustmentApplicationData.savingsAccountId,
        projectId: loanAdjustmentApplicationData.projectId ? loanAdjustmentApplicationData.projectId : null,
        drcrCode: "D",
        tranCode: "WDL",
        tranAmt: loanAdjustmentApplicationData.adjustmentAmount,
        glacId: savingsProductInfo.product_gl,
        naration: loanAdjustmentApplicationData.remarks
          ? `${loanAdjustmentApplicationData.remarks} | সঞ্চয় থেকে ঋণের সমন্বয় - সদস্যের নাম ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode})`
          : `সঞ্চয় থেকে ঋণের সমন্বয়- সদস্যের নাম: ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode})`,
      },
      // {
      //   productId: loanProductInfo.id,
      //   accountId: loanAdjustmentApplicationData.loanAccountId,
      //   projectId: loanAdjustmentApplicationData.projectId ? loanAdjustmentApplicationData.projectId : null,
      //   drcrCode: "C",
      //   tranAmt: loanAdjustmentApplicationData.adjustmentAmount,
      //   glacId: loanProductInfo.id,
      //   naration: loanAdjustmentApplicationData.remarks
      //     ? `${loanAdjustmentApplicationData.remarks} | সঞ্চয় থেকে ঋণের সমন্বয় - সদস্যের নাম: ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode})`
      //     : `সঞ্চয় থেকে ঋণের সমন্বয়- সদস্যের নাম: ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode})`,
      // },
    ];

    const transactionInfo = await transactionService.createRepayment(
      {
        productId: loanProductInfo.id,
        accountId: loanAdjustmentApplicationData.loanAccountId,
        tranAmt: loanAdjustmentApplicationData.adjustmentAmount,
      },
      doptorId as number,
      officeId as number,
      loanAdjustmentApplicationData.projectId as number,
      batchNum as string,
      "TRANSFER",
      { gl: [], account: transactionSets },
      userId as number,
      transaction
    );
    return transactionInfo;
  }
}
