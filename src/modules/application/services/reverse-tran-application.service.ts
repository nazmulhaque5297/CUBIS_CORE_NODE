import Container, { Service } from "typedi";
import { Pool, PoolClient } from "pg";
import { default as lodash } from "lodash";
import { toCamelKeys } from "keys-transform";
import { ApplicationServices } from "./application.service";
import BadRequestError from "../../../errors/bad-request.error";
import TranDocGenerationService from "../../../modules/transaction/services/tran-doc-generation.service";
import GlBalanceCheckService from "../../../modules/transaction/services/gl-balance-check.service";
import { buildInsertSql, buildUpdateWithWhereSql } from "../../../utils/sql-builder.util";
import { DayOpenCloseService } from "../../../modules/transaction/services/day-open-close.service";
import { RepaymentReverseService } from "./repayment-reverse.service";

@Service()
export class ReverseTranApplicationService {
  constructor() {}

  async reverseRequestInfo(applicationId: number, applicationType: string, componentId: number, pool: Pool) {
    const reverseInfoSql = `SELECT  a.doptor_id doptor_id,
                                    a.project_id project_id,
                                    a.service_id service_id,
                                    a.data data,
                                    b.display_value tran_type
                            FROM temps.application a
                              INNER JOIN master.code_master b
                              ON b.id= CAST(data::JSON#>> '{tran_type_id}' AS integer)
                              WHERE a.id = $1 AND component_id = $2`;

    let reverseRequestData = (await pool.query(reverseInfoSql, [applicationId, componentId])).rows[0];

    reverseRequestData = reverseRequestData ? toCamelKeys(reverseRequestData) : reverseRequestData;

    const reverseDetailSql = `SELECT b.product_name     product_name,
                                      c.account_title    account_title,
                                      d.glac_name,
                                      a.account_id       account_id,
                                      a.product_id       product_id,
                                      a.tran_date        tran_date,
                                      a.tran_num         tran_num,
                                      CASE
                                          WHEN a.drcr_code = 'D' THEN 'ডেবিট'
                                          WHEN a.drcr_code = 'C' THEN 'ক্রেডিট '
                                      END                drcr_code,
                                      a.tran_amt         tran_amt,
                                      a.glac_id          glac_id,
                                      a.subgl_id         subgl_id,
                                      a.cheque_num       cheque_num,
                                      a.cheque_date      cheque_date,
                                      a.bank_id          bank_id,
                                      a.branch_id        branch_id,
                                      a.naration         naration
                            FROM (SELECT account_id,
                                      product_id,
                                      tran_date,
                                      tran_num,
                                      drcr_code,
                                      tran_amt,
                                      glac_id,
                                      subgl_id,
                                      cheque_num,
                                      cheque_date,
                                      bank_id,
                                      branch_id,
                                      naration
                            FROM loan.transaction_dtl
                                  WHERE     doptor_id = $1
                                  AND office_id = $2
                                  AND tran_num = $3
                                  AND tran_date = $4
                          UNION ALL
                          SELECT account_id,
                                      product_id,
                                      tran_date,
                                      tran_num,
                                      drcr_code,
                                      tran_amt,
                                      glac_id,
                                      subgl_id,
                                      cheque_num,
                                      cheque_date,
                                      bank_id,
                                      branch_id,
                                      naration
                        FROM loan.transaction_daily
                                WHERE     doptor_id = $1
                                AND office_id = $2
                                AND tran_num = $3
                                AND tran_date = $4) a
                        INNER JOIN loan.product_mst b ON a.product_id = b.id
                        LEFT JOIN loan.account_info c ON a.account_id = c.id
                        LEFT JOIN loan.glac_mst d ON a.glac_id = d.id`;
    let reverseDetailData = (
      await pool.query(reverseDetailSql, [
        reverseRequestData.doptorId,
        reverseRequestData.data.officeId,
        reverseRequestData.data.tranNumber,
        reverseRequestData.data.tranDate,
      ])
    ).rows[0];

    // reverseDetailData = await minioPresignedGet(reverseDetailData, ["member_picture"]);
    const applicationService: ApplicationServices = Container.get(ApplicationServices);

    const reverseFinalData = {
      type: applicationType,
      applicationInfo: {
        ...reverseDetailData,
        remarks: reverseRequestData.data.remarks,
        applicationId: applicationId,
        serviceId: reverseRequestData.serviceId,
        tranType: reverseRequestData.tranType,
      },
      history: await applicationService.getAppHistory(applicationId, pool),
    };
    return reverseFinalData ? toCamelKeys(reverseFinalData) : {};
  }
  // for create
  async createReverseApplication(applicationData: any, pool: Pool) {
    if (Number(applicationData.projectId)) {
      const applicationServices: ApplicationServices = Container.get(ApplicationServices);

      const projectIds = await applicationServices.getPermitProjectIds(applicationData.nextAppDesignationId);

      if (!projectIds.includes(Number(applicationData.projectId)))
        throw new BadRequestError(`বাছাইকৃত প্রকল্পটিতে পর্যবেক্ষক/ অনুমোদনকারীর অনুমতি নেই`);
    }
    const checkRepeatedApplicationSql = `SELECT COUNT (1)
  FROM temps.application
 WHERE service_id = $1 
       AND CAST (data ->>   'tran_number' AS CHARACTER VARYING) =$2
       AND CAST (data ->>   'tran_date' AS CHARACTER VARYING) =$3 AND status != 'A'`;

    const checkRepeatedApplicationInfo = (
      await pool.query(checkRepeatedApplicationSql, [
        applicationData.serviceId,
        applicationData.data.tranNumber,
        applicationData.data.tranDate,
      ])
    ).rows[0];
    if (checkRepeatedApplicationInfo && checkRepeatedApplicationInfo?.count > 0)
      throw new BadRequestError(`প্রদত্ত সদস্যের একটি আবেদন অপেক্ষমাণ আছে`);

    const { sql, params } = buildInsertSql("temps.application", {
      ...lodash.omit(applicationData, ["officeId", "serviceName"]),
    });
    const applicationResponse = (await pool.query(sql, params)).rows[0];

    return applicationResponse ? toCamelKeys(applicationResponse) : {};
  }
  //for reverse approval service
  async reverseApproval(
    applicationData: any,
    transaction: PoolClient,
    userId: number,
    officeId: number,
    doptorId: number,
    serviceId: number
  ) {
    const reverseApprovalData = toCamelKeys(applicationData) as any;

    //already reverse check
    const alreadyReverseSql = `SELECT id, rev_tran_id
    FROM loan.transaction_daily
   WHERE     doptor_id = $1
         AND office_id = $2
         AND tran_num = $3
         AND tran_date = $4
  UNION ALL
  SELECT id, rev_tran_id
    FROM loan.transaction_dtl
   WHERE     doptor_id = $1
         AND office_id = $2
         AND tran_num = $3
         AND tran_date = $4
  ORDER BY id
     LIMIT 1`;
    const alreadyReverseData = (
      await transaction.query(alreadyReverseSql, [
        doptorId,
        reverseApprovalData.officeId,
        reverseApprovalData.tranNumber,
        reverseApprovalData.tranDate,
      ])
    ).rows[0];

    if (alreadyReverseData?.rev_tran_id) throw new BadRequestError(`লেনদেনটি ইতোমধ্যে সংশোধন করা হয়েছে ।`);
    //end already reverse check
    // project permission check common --done from common for all application
    //same user approval validation check --done from common for all application
    //available balance check
    //gl negative check
    //document generation
    //common checking
    //cursor declaration
    //transaction process calling
    // daily and dtl table update rev_tran_id
    // request P data
    const reverseTranListSql = `SELECT id,
    doptor_id,
    office_id,
    project_id,
    product_id,
    account_id,
    tran_type,
    tran_num,
    tran_code,
    glac_id,
    subgl_id,
    naration,
    drcr_code,
    tran_amt,
    batch_num,
    channel_code,
    rev_tran_id,
    cheque_num,
    cheque_date,
    bank_id,
    branch_id,
    transfer_ac_no,
    authorize_status,
    authorized_by,
    authorized_at,
    created_by,
    created_at,
    table_name
FROM (SELECT id,
            doptor_id,
            office_id,
            project_id,
            product_id,
            account_id,
            tran_type,
            tran_num,
            tran_code,
            glac_id,
            subgl_id,
            naration,
            drcr_code,
            tran_amt,
            batch_num,
            channel_code,
            rev_tran_id,
            cheque_num,
            cheque_date,
            bank_id,
            branch_id,
            transfer_ac_no,
            authorize_status,
            authorized_by,
            authorized_at,
            created_by,
            created_at,
            'DAILY'     table_name
       FROM loan.transaction_daily
      WHERE  doptor_id = $1
      AND office_id = $2
      AND tran_num = $3
      AND tran_date = $4
     UNION ALL
     SELECT id,
            doptor_id,
            office_id,
            project_id,
            product_id,
            account_id,
            tran_type,
            tran_num,
            tran_code,
            glac_id,
            subgl_id,
            naration,
            drcr_code,
            tran_amt,
            batch_num,
            channel_code,
            rev_tran_id,
            cheque_num,
            cheque_date,
            bank_id,
            branch_id,
            transfer_ac_no,
            authorize_status,
            authorized_by,
            authorized_at,
            created_by,
            created_at,
            'DTL'     table_name
       FROM loan.transaction_dtl
      WHERE doptor_id = $1
      AND office_id = $2
      AND tran_num = $3
      AND tran_date = $4
      order by id)AA`;
    const reverseTranListData = (
      await transaction.query(reverseTranListSql, [
        doptorId,
        reverseApprovalData.officeId,
        reverseApprovalData.tranNumber,
        reverseApprovalData.tranDate,
      ])
    ).rows;
    //day open close
    const dayOpenCloseService: DayOpenCloseService = Container.get(DayOpenCloseService);
    const transactionDate = await dayOpenCloseService.getOpenDate(
      undefined,
      doptorId,
      officeId,
      reverseTranListData[0].project_id ? reverseTranListData[0].project_id : null,
      transaction
    );

    if (!transactionDate || !transactionDate.openCloseDate) {
      throw new BadRequestError(`লেনদেন সংঘটিত হওয়ার তারিখ পাওয়া যায়নি`);
    }
    // end day open close

    // calling document generation
    const tranDocNumber: TranDocGenerationService = Container.get(TranDocGenerationService);
    const batchNumber = await tranDocNumber.generateBatchNumber(transaction);
    const tranNumber = await tranDocNumber.generateTransactionNumber(transaction);
    // end calling document generation

    //gl negative check
    const glBalance: GlBalanceCheckService = Container.get(GlBalanceCheckService);
    //end gl negative check

    for (let singleReverseTran of reverseTranListData) {
      const tranIdSql = `SELECT nextval('loan.transaction_daily_id_seq') tran_id`;
      const tranId = (await transaction.query(tranIdSql)).rows[0].tran_id;
      let { sql, params } = buildInsertSql("loan.transaction_daily", {
        id: tranId,
        doptorId,
        officeId,
        projectId: singleReverseTran.project_id ? singleReverseTran.project_id : null,
        productId: singleReverseTran.product_id,
        accountId: singleReverseTran.account_id,
        tranType: singleReverseTran.tran_type,
        tranCode: "RVD",
        glacId: singleReverseTran.glac_id,
        subglId: singleReverseTran.subgl_id,
        drcrCode: singleReverseTran.drcr_code == "D" ? "C" : singleReverseTran.drcr_code == "C" ? "D" : null,
        tranDate: transactionDate.openCloseDate,
        valDate: new Date(),
        tranAmt: singleReverseTran?.tran_amt,
        tranNum: tranNumber,
        batchNum: batchNumber,
        channelCode: singleReverseTran.channel_code,
        revTranId: singleReverseTran.rev_tran_id,
        chequeNum: singleReverseTran.cheque_num,
        chequeDate: singleReverseTran.cheque_date,
        bankId: singleReverseTran.bank_id,
        branchId: singleReverseTran.branch_id,
        transferAcNo: singleReverseTran.transfer_ac_no,
        authorizeStatus: singleReverseTran.authorize_status,
        authorizedBy: singleReverseTran.authorized_by,
        authorizedAt: singleReverseTran.authorized_at,
        naration: singleReverseTran.naration,
        createdBy: userId,
        createdAt: new Date(),
      });
      transaction.query(sql, params);
      // repayment service calling
      //

      if (
        (singleReverseTran.tran_code == "REP" || singleReverseTran.tran_code == "INC") &&
        singleReverseTran.account_id
      ) {
        if (applicationData.tranTypeId == 148) {
          const repaymentReverseService: RepaymentReverseService = Container.get(RepaymentReverseService);
          const transactionDate = await repaymentReverseService.scheduleUpdate(
            transaction,
            doptorId,
            officeId,
            singleReverseTran.product_id,
            singleReverseTran.account_id,
            singleReverseTran.tran_num,
            reverseApprovalData.tranDate,
            singleReverseTran.tran_code,
            singleReverseTran?.tran_amt,
            userId
          );
          // service Charge update service calling
          const serviceChargeData = await repaymentReverseService.serviceChargeUpdate(
            transaction,
            doptorId,
            officeId,
            singleReverseTran.product_id,
            singleReverseTran.account_id,
            singleReverseTran?.tran_amt,
            singleReverseTran.tran_num,
            reverseApprovalData.tranDate,
            userId
          );
        }
      }
      //end====================
      // account balance check and update
      if (singleReverseTran.account_id) {
        const accountBalanceSql = `SELECT COALESCE (current_balance, 0)  balance
        FROM loan.account_balance
       WHERE     doptor_id = $1
             AND office_id = $2
             AND product_id = $3
             AND account_id = $4`;
        const accountBalanceData = (
          await transaction.query(accountBalanceSql, [
            doptorId,
            officeId,
            singleReverseTran.product_id,
            singleReverseTran.account_id,
          ])
        ).rows[0];

        if (singleReverseTran.drcr_code == "D") {
          const { sql: updateDrBalanceSql, params: updateDrBalanceParams } = buildUpdateWithWhereSql(
            "loan.account_balance",
            { doptorId, officeId, productId: singleReverseTran.product_id, accountId: singleReverseTran.account_id },
            {
              currentBalance: Number(accountBalanceData.balance) + Number(singleReverseTran?.tran_amt),
              updatedBy: userId,
              updatedAt: new Date(),
            }
          );
          transaction.query(updateDrBalanceSql, updateDrBalanceParams);
        }
        if (singleReverseTran.drcr_code == "C") {
          if (Number(singleReverseTran?.tran_amt) > Number(accountBalanceData.balance)) {
            throw new BadRequestError(`সংশোধিত টাকার পরিমান প্রদত্ত হিসেব নম্বরের ব্যালান্স থেকে বেশি।`);
          }

          const { sql: updateCrBalanceSql, params: updateCrBalanceParams } = buildUpdateWithWhereSql(
            "loan.account_balance",
            { doptorId, officeId, productId: singleReverseTran.product_id, accountId: singleReverseTran.account_id },
            {
              currentBalance: Number(accountBalanceData.balance) - Number(singleReverseTran?.tran_amt),
              updatedBy: userId,
              updatedAt: new Date(),
            }
          );
          transaction.query(updateCrBalanceSql, updateCrBalanceParams);
        }
      }
      // // end account balance check abd update

      // // daily and dtl table update rev_tran_id
      if (singleReverseTran.table_name == "DTL") {
        const { sql: dtlTableSql, params: dtlTableParams } = buildUpdateWithWhereSql(
          "loan.transaction_dtl",
          { id: singleReverseTran.id },
          { transactionDetails: [], revTranId: tranId, updatedBy: userId, updatedAt: new Date() }
        );
        transaction.query(dtlTableSql, dtlTableParams);
      } else if (singleReverseTran.table_name == "DAILY") {
        const { sql: dailyTableSql, params: dailyTableParams } = buildUpdateWithWhereSql(
          "loan.transaction_daily",
          { id: singleReverseTran.id },
          {
            revTranId: tranId,
            updatedBy: userId,
            updatedAt: new Date(),
          }
        );
        transaction.query(dailyTableSql, dailyTableParams);
      }
      //end  daily and dtl table update rev_tran_id
    }
    ///======================
    return { tranNumber, serviceId };
  }

  //loop in tran id

  //ac balance update manual

  //  return reverseApprovalData ? toCamelKeys(reverseApprovalData) : {};
}
