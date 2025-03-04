import { toCamelKeys } from "keys-transform";
import lodash from "lodash";
import moment from "moment";
import { Pool, PoolClient } from "pg";
import { BadRequestError } from "rdcd-common";
import Container, { Service } from "typedi";
import SamityService from "../../../modules/samity/services/samity.service";
import { buildInsertSql, buildUpdateWithWhereSql } from "../../../utils/sql-builder-loan.utils";
import DataService from "../../master/services/master-data.service";
import { ApplicationServices } from "./application.service";
import { minioPresignedGet } from "../../../utils/minio.util";
import TransactionService from "../../../modules/transaction/services/transaction.service";

@Service()
export class FdrApplicationServices {
  constructor() {}
  async getFdrApplicationInfo(id: number, type: string, componentId: number, pool: Pool) {
    const fdrBasicInfoSql = `SELECT 
                                a.project_id, 
                                a.service_id, 
                                a.data, 
                                a.doptor_id, 
                                b.project_name_bangla, 
                                c.samity_name, 
                                d.product_name, 
                                e.name_bn customer_name, 
                                f.document_data :: JSON #>> '{own,0,document_type}' document_type,
                                f.document_data :: JSON #>> '{own,0,document_number}' document_number
                            FROM 
                                temps.application a 
                                INNER JOIN master.project_info b ON b.id = a.project_id 
                                INNER JOIN samity.samity_info c ON c.id = a.samity_id 
                                INNER JOIN loan.product_mst d ON d.id = CAST(a.data ->> 'product_id' as integer) 
                                INNER JOIN samity.customer_info e ON e.id = CAST(
                                a.data ->> 'customer_id' as integer
                                ) 
                                INNER JOIN loan.document_info f ON e.id = f.ref_no 
                            WHERE 
                                a.id = $1 
                                and a.component_id = $2`;

    const fdrNomineeInfoSql = `SELECT 
                                  JSON_AGG(
                                    JSON_BUILD_OBJECT(
                                      'id', f ->> 'id', 'doc_type', f ->> 'doc_type', 
                                      'relation', f ->> 'relation', 'doc_number', 
                                      f ->> 'doc_number', 'percentage', 
                                      f ->> 'percentage', 'document_no', 
                                      f ->> 'document_no', 'nominee_name', 
                                      f ->> 'nominee_name', 'nominee_sign', 
                                      f ->> 'nominee_sign', 'document_type', 
                                      f ->> 'document_type', 'nominee_picture', 
                                      f ->> 'nominee_picture', 'document_type_id', 
                                      f ->> 'document_type_id', 'nominee_sign_url', 
                                      f ->> 'nominee_sign_url', 'nominee_picture_url', 
                                      f ->> 'nominee_picture_url', 'doc_type_desc', 
                                      g.doc_type_desc, 'relation_name', 
                                      h.display_value
                                    )
                                  ) nominee_info
                                FROM 
                                  temps.application a CROSS 
                                  JOIN LATERAL JSONB_ARRAY_ELEMENTS(a.data -> 'nominee_info') AS f(nominee_info) 
                                  INNER JOIN master.document_type g ON g.doc_type = CAST(
                                    f ->> 'doc_type' as varchar
                                  ) 
                                  INNER JOIN master.code_master h ON h.id = CAST(f ->> 'relation' as integer) 
                                WHERE 
                                  a.id = $1 and a.component_id =$2`;

    const basicInfo = (await pool.query(fdrBasicInfoSql, [id, componentId])).rows[0];
    let nomineeInfo = (await pool.query(fdrNomineeInfoSql, [id, componentId])).rows[0];

    // nomineeInfo = nom
    const applicationService: ApplicationServices = Container.get(ApplicationServices);
    if (basicInfo?.data) {
      basicInfo.data = lodash.omit(basicInfo.data, ["nominee_info"]);
    }
    const applicationInfo = {
      ...lodash.omit(basicInfo, ["data"]),
      ...basicInfo?.data,
      ...lodash.omit(nomineeInfo, ["doptor_id", "project_name_bangla", "samity_name", "product_name", "customer_name"]),
    };

    const applicationInfoWithUrl = await minioPresignedGet(applicationInfo, [
      "nominee_info.[].nominee_picture",
      "nominee_info.[].nominee_sign",
    ]);
    const finalInfo = {
      type: type,
      applicationInfo: {
        ...applicationInfoWithUrl,
        applicationId: id,
        serviceId: basicInfo.service_id,
      },
      history: await applicationService.getAppHistory(id, pool),
    };
    return finalInfo ? toCamelKeys(finalInfo) : {};
  }

  async leftPadding(number: any, length: any) {
    var len = length - ("" + number).length;
    return (len > 0 ? new Array(++len).join("0") : "") + number;
  }

  async fdrApplicationApproval(
    applicationData: any,
    doptorId: number,
    projectId: number,
    officeId: number,
    userId: number,
    applicationId: number,
    client: PoolClient
  ) {
    applicationData = applicationData ? toCamelKeys(applicationData) : {};
    const transactionService: TransactionService = Container.get(TransactionService);
    const sql = `select count (*) FROM loan.account_info WHERE samity_id = $1 AND customer_id = $2 AND project_id =$3 AND product_id =$4`;
    let fdrAccSerial = await (
      await client.query(sql, [
        applicationData.samityId,
        applicationData.customerId,
        applicationData.projectId,
        applicationData.productId,
      ])
    ).rows[0]?.count;
    const samityService: SamityService = Container.get(SamityService);

    const customerInfo = await samityService.getMainMember(1, 1, {
      id: Number(applicationData.customerId),
    });
    if (customerInfo.data.length <= 0)
      throw new BadRequestError(`সদস্যের
        তথ্য পাওয়া যায়নি`);
    fdrAccSerial = Number(fdrAccSerial) + 1;
    fdrAccSerial = await this.leftPadding(fdrAccSerial, 2);
    const { sql: accountInfoSql, params: accountInfoParams } = buildInsertSql("loan.account_info", {
      samityId: applicationData.samityId,
      customerId: applicationData.customerId,
      doptorId: doptorId,
      projectId: applicationData.projectId,
      officeId: officeId,
      productId: applicationData.productId,
      accountNo: customerInfo.data[0].customerCode + fdrAccSerial,
      accountTitle: customerInfo.data[0].nameBn,
      openDate: new Date(),
      withdrawInstruction: "N",
      accountStatus: "ACT",
      alltrn: "C",
      authorizeStatus: "A",
      authorizedBy: userId,
      authorizedAt: new Date(),
      createdBy: userId,
      createdAt: new Date(),
    });
    const accountInfoRes = (await client.query(accountInfoSql, accountInfoParams)).rows[0];

    const { sql: accountBalanceSql, params: accountBalanceParams } = buildInsertSql("loan.account_balance", {
      doptorId: doptorId,
      projectId: applicationData.projectId,
      officeId: officeId,
      productId: applicationData.productId,
      accountId: Number(accountInfoRes.id),
      currentBalance: Number(applicationData.fdrAmount),
      blockAmt: 0,
      createdBy: userId,
      createdAt: new Date(),
    });
    const accountBalanceRes = (await client.query(accountBalanceSql, accountBalanceParams)).rows[0];

    //   const installmentInfoSql = `SELECT ins_start_day , ins_end_day FROM loan.product_mst WHERE id = $1`;
    //   const installmentInfo = (await client.query(installmentInfoSql, [applicationData.productId])).rows[0];
    //   let nextDate;
    //   if (applicationData.installmentFrequency == "M") {
    //     nextDate = moment(new Date()).add(30, "d");
    //   } else if (applicationData.installmentFrequency == "W") {
    //     nextDate = moment(new Date()).add(7, "d");
    //   }

    const { sql: fdrMaserSql, params: fdrMstParams } = buildInsertSql("loan.fdr_mst", {
      doptorId: doptorId,
      officeId: officeId,
      productId: applicationData.productId,
      applicationId,
      accountId: accountInfoRes.id,
      effDate: new Date(),
      expDate: applicationData.expDate,
      intRate: Number(applicationData.intRate),
      fdrAmt: Number(applicationData.fdrAmount),
      profitAmt: Number(applicationData.profitAmount),
      fdrDuration: Number(applicationData.fdrDuration),
      createdBy: userId,
      createdAt: new Date(),
    });
    const fdrRes = (await client.query(fdrMaserSql, fdrMstParams)).rows[0];
    const productSql = `SELECT product_gl FROM loan.product_mst WHERE id = $1`;
    let batchNum = await transactionService.generateBatchNumber(client);
    let tranNum = await transactionService.generateTransactionNumber(client);
    const productInfo = (await client.query(productSql, [applicationData.productId])).rows[0];
    const cashInHandGlSql = `SELECT 
                                  id 
                                FROM 
                                  loan.glac_mst 
                                WHERE 
                                  doptor_id = $1
                                  AND is_cash_in_hand = true 
                                  AND parent_child = 'C'`;
    const cashInHandGl = (await client.query(cashInHandGlSql, [doptorId])).rows;
    if (cashInHandGl && !cashInHandGl[0])
      throw new BadRequestError(`প্রদত্ত দপ্তরের ক্ষেত্রে হাতে নগদ জি এল অ্যাকাউন্ট পাওয়া যায়নি`);
    if (cashInHandGl.length > 1)
      throw new BadRequestError(`প্রদত্ত দপ্তরের ক্ষেত্রে একাধিক হাতে নগদ জি এল অ্যাকাউন্ট পাওয়া গেছে`);
    const transactionSets = [
      {
        productId: applicationData.productId,
        accountId: accountInfoRes.id,
        naration: "FDR Account create credit transaction",
        drcrCode: "C",
        glacId: productInfo.product_gl,
        tranAmt: applicationData.fdrAmount,
        batchNum,
        tranNum,
        tranCode: "FDR",
        tranType: "CASH",
      },
      {
        productId: applicationData.productId,
        accountId: null,
        naration: "FDR Account create cash in hand debit transaction",
        drcrCode: "D",
        glacId: cashInHandGl[0].id,
        tranAmt: applicationData.fdrAmount,
        batchNum,
        tranNum,
        tranCode: "FDR",
        tranType: "CASH",
      },
    ];

    const result = await transactionService.generalTransactionEngine(
      doptorId,
      officeId,
      projectId,
      userId,
      productInfo.deposit_nature,
      transactionSets,
      client
    );
  }

  async fdrCloseInfo(applicationId: number, type: string, componentId: number, pool: Pool) {
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
    const fdrBasicInfoSql = `SELECT 
                                  a.fdr_duration,
                                  a.int_rate,
                                  a.eff_date,
                                  a.exp_date,
                                  a.fdr_amt,
                                  b.account_no,
                                  c.current_balance,
                                  d.samity_name,
                                  e.name_bn,
                                  f.document_data ->> 'member_picture' member_picture,
                                  g.project_name_bangla,
                                  h.product_name
                              FROM   loan.fdr_mst a
                                  INNER JOIN loan.account_info b
                                          ON a.account_id = b.id
                                  INNER JOIN loan.account_balance c
                                          ON b.id = c.account_id
                                  INNER JOIN samity.samity_info d
                                          ON d.id = b.samity_id
                                  INNER JOIN samity.customer_info e
                                          ON e.id = b.customer_id
                                  INNER JOIN loan.document_info f
                                          ON f.ref_no = e.id
                                  INNER JOIN master.project_info g
                                          ON g.id = d.project_id
                                  INNER JOIN loan.product_mst h
                                          ON h.id = b.product_id
                              WHERE  a.account_id = $1
                                  AND e.id = $2
                                  AND b.account_status = 'ACT'`;
    let basicInfo = (await pool.query(fdrBasicInfoSql, [appInfo.data.accountId, appInfo.data.customerId])).rows[0];
    console.log({ basicInfo });
    basicInfo = basicInfo ? await minioPresignedGet(basicInfo, ["member_picture"]) : basicInfo;
    const applicationService: ApplicationServices = Container.get(ApplicationServices);

    const finalInfo = {
      type: type,
      applicationInfo: {
        applicationId,
        serviceId: appInfo.serviceId,
        ...basicInfo,
        profitAmount: appInfo.data.givenProfitAmount,
      },
      history: await applicationService.getAppHistory(applicationId, pool),
    };
    return finalInfo ? toCamelKeys(finalInfo) : {};
  }
}
