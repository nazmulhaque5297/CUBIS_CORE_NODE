import { toCamelKeys, toSnakeCase } from "keys-transform";
import moment from "moment";
import { Pool, PoolClient } from "pg";
import Container, { Service } from "typedi";
import { pgConnect } from "../../../db-coop/factory/connection.db";
import BadRequestError from "../../../errors/bad-request.error";
import SamityService from "../../../modules/samity/services/samity.service";
import TransactionService from "../../../modules/transaction/services/transaction.service";
import { buildInsertSql, buildUpdateWithWhereSql } from "../../../utils/sql-builder.util";
import ServiceChargeService from "../../transaction/services/service-charge.service";

@Service()
export default class ScheduleService {
  constructor() {}

  //loan schedule application validation
  async scheduleApplicationValidate(payload: any, client: PoolClient | Pool) {
    payload = toCamelKeys(payload);
    console.log("payload ----", payload);

    const projectId = payload?.projectId ? Number(payload.projectId) : null;
    const cusSql = `SELECT 
                    customer_status 
                  FROM 
                    samity.customer_info 
                  WHERE 
                    CASE WHEN CAST($4 AS INTEGER) IS NULL THEN id = $1 
                    and doptor_id = $2 
                    and office_id = $3 
                    and samity_id = $5 ELSE id = $1 
                    and doptor_id = $2 
                    and office_id = $3 
                    and project_id = $4 
                    and samity_id = $5 END`;
    const customerStatus = (
      await client.query(cusSql, [
        parseInt(payload.data.customerId),
        parseInt(payload.doptorId),
        parseInt(payload.officeId),
        projectId,
        parseInt(payload.samityId),
      ])
    ).rows[0];

    if (!customerStatus || customerStatus.customer_status !== "ACT") throw new BadRequestError(`সদস্য সক্রিয় নয়`);
    else {
      const loanAccsql = `
              SELECT 
                COUNT (*) 
              FROM 
                loan.global_limit a
                INNER JOIN loan.account_info b ON b.customer_id = a.customer_id
								INNER JOIN loan.product_mst c ON c.id = b.product_id  
              WHERE 
                  CASE WHEN CAST($2 AS INTEGER) IS NULL THEN 
                    a.doptor_id = $1 
                    AND a.samity_id = $3 
                    AND a.customer_id = $4
                    AND a.is_disbursed = true
                    AND b.account_status != 'CLS'
                    AND c.deposit_nature = 'L'
                  ELSE a.doptor_id = $1 
                    AND a.project_id = $2 
                    AND a.samity_id = $3 
                    AND a.customer_id = $4
                    AND a.is_disbursed = true
                    AND b.account_status != 'CLS'
                    AND c.deposit_nature = 'L' END`;

      var loanAccount = (
        await client.query(loanAccsql, [
          parseInt(payload.doptorId),
          projectId,
          parseInt(payload.samityId),
          parseInt(payload.data.customerId),
        ])
      ).rows[0] as any;

      //checking customer has any active loan account or not in other doptor/project
      var otherLoansSql = `SELECT 
                            COUNT (*) 
                          FROM 
                            loan.global_limit a
                            INNER JOIN loan.account_info b ON b.customer_id = a.customer_id
                            INNER JOIN loan.product_mst c ON c.id = b.product_id 
                          WHERE 
                            CASE WHEN CAST($2 AS INTEGER) IS NULL THEN 
                              a.doptor_id != $1 
                              AND a.samity_id = $3 
                              AND a.customer_id = $4
                              AND a.is_disbursed = true
                              AND b.account_status != 'CLS'
                              AND c.deposit_nature = 'L'
                            ELSE
                              a.doptor_id != $1 
                              AND a.project_id = $2 
                              AND a.samity_id = $3 
                              AND a.customer_id = $4 
                              AND a.is_disbursed = true
                              AND b.account_status != 'CLS'
                              AND c.deposit_nature = 'L'
                              END`;

      var otherLoans = (
        await client.query(otherLoansSql, [
          parseInt(payload.doptorId),
          projectId,
          parseInt(payload.samityId),
          parseInt(payload.data.customerId),
        ])
      ).rows[0] as any;

      //checking customer has any pending loan disbursement application
      const pendingLoanSql = `SELECT 
                              COUNT(*) 
                            FROM 
                              temps.application 
                            WHERE 
                              CASE WHEN CAST($2 AS INTEGER) IS NULL THEN 
                                doptor_id = $1 
                                AND samity_id = $3 
                                AND service_id = $4 
                                AND CAST(data ->> 'customer_id' as integer) = $5 
                                AND status NOT IN('A')
                              ELSE
                                doptor_id = $1 
                                AND project_id = $2 
                                AND samity_id = $3 
                                AND service_id = $4 
                                AND CAST(data ->> 'customer_id' as integer) = $5 
                                AND status NOT IN('A')
                              END`;
      const pendingLoan = (
        await client.query(pendingLoanSql, [
          parseInt(payload.doptorId),
          projectId,
          parseInt(payload.samityId),
          9,
          parseInt(payload.data.customerId),
        ])
      ).rows[0] as any;
      const productMstSql = `Select a.is_multiple_loan_allow from loan.product_mst a inner join loan.global_limit b on 
      a.id=b.product_id where b.customer_id=$1 and b.is_disbursed=false`;
      const productMstInfo = (await client.query(productMstSql, [payload.data.customerId])).rows[0];

      if (parseInt(pendingLoan.count) > 0) throw new BadRequestError(`ইতিমধ্যে একটি  ঋণ বিতরণ আবেদন অপেক্ষমান আছে`);
      else {
        if (parseInt(loanAccount.count) > 0 && productMstInfo?.is_multiple_loan_allow != true)
          throw new BadRequestError(`ইতিমধ্যে ঋণ সক্রিয় আছে`);
        else {
          if (parseInt(otherLoans.count) > 0) throw new BadRequestError(`ইতিমধ্যে অন্য কোনো দপ্তরে ঋণ সক্রিয় আছে`);
          else {
            const cusDataSql = `SELECT name_bn, customer_code FROM samity.customer_info WHERE id = $1`;
            const cusData = (await client.query(cusDataSql, [parseInt(payload.data.customerId)])).rows[0] as any;
            const samityService: SamityService = Container.get(SamityService);
            const customerLoanInfo = await samityService.getCustomerLoanInfo(Number(payload.data.customerId));
            const remarks = `ঋণ বিতরণ করা হয়েছে- সদস্যের নাম: ${cusData.name_bn} (${cusData.customer_code}), ঋণের পরিমাণ: ${customerLoanInfo[0]?.loanAmount} টাকা`;
            return remarks;
          }
        }
      }
    }
  }

  async leftPadding(number: any, length: any) {
    var len = length - ("" + number).length;
    return (len > 0 ? new Array(++len).join("0") : "") + number;
  }

  //approve loan disbursement application and create loan schedule
  async loanDisbursementApproval(
    allData: any,
    transaction: PoolClient,
    userId: number,
    officeId: number,
    doptorId: number
  ) {
    const camelCaseData = toCamelKeys(allData) as any;
    console.log("CAMEL CASE DATA----", camelCaseData);

    const productSql = `SELECT 
                            doptor_id,
                            cal_type, 
                            product_gl, 
                            grace_amt_repay_ins, 
                            grace_period,
                            holiday_effect,
                            installment_amount_method,
                            installment_division_digit,
                            is_multiple_disbursement_allow
                          FROM 
                            loan.product_mst 
                          WHERE 
                            id = $1`;
    const productInfo = (await transaction.query(productSql, [camelCaseData.productId])).rows[0];

    const { is_multiple_disbursement_allow } = productInfo;

    const globalLimitGetsql =
      "Select COUNT(*),account_id from loan.global_limit where customer_id=$1 and account_id is NOT NULL group by account_id";

    const globalLimitGetInfo = (await transaction.query(globalLimitGetsql, [camelCaseData.customerId])).rows[0];
    if (is_multiple_disbursement_allow && globalLimitGetInfo?.count > 0) {
      this.loanDisbursementForMultipleDisbursement(
        allData,
        transaction,
        userId,
        officeId,
        doptorId,
        globalLimitGetInfo.account_id
      );
      return;
    }
    const samityService: SamityService = Container.get(SamityService);
    const customerInfo = await samityService.getMainMember(1, 1, {
      id: Number(camelCaseData.customerId),
    });

    const accSerialSql = `SELECT COUNT(*),sanction_limit FROM loan.global_limit WHERE customer_id = $1 and account_id is NULL group by sanction_limit`;
    const accSerialInfo = (await transaction.query(accSerialSql, [Number(camelCaseData.customerId)])).rows[0];
    if (customerInfo.data.length <= 0) throw new BadRequestError(`সদস্যের তথ্য পাওয়া যায়নি`);

    const customerLoanInfo = await samityService.getCustomerLoanInfo(Number(camelCaseData.customerId));
    if (customerLoanInfo.length <= 0) throw new BadRequestError(`সদস্যের ঋণের আবেদনের তথ্য পাওয়া যায়নি`);

    const accountPrefixSql = `SELECT account_prefix FROM loan.product_mst WHERE id = $1`;
    const accountPrefix = (await transaction.query(accountPrefixSql, [Number(camelCaseData.productId)])).rows[0]
      ?.account_prefix;
    if (!accountPrefix) throw new BadRequestError(`প্রদত্ত প্রোডাক্টে অ্যাকাউন্ট প্রিফিক্স উল্লেখ নেই`);

    const { sql: customerLoanAccountSql, params: customerLoanAccountParams } = buildInsertSql("loan.account_info", {
      samityId: Number(camelCaseData.samityId),
      customerId: Number(camelCaseData.customerId),
      doptorId: doptorId,
      projectId: camelCaseData.projectId ? Number(camelCaseData.projectId) : null,
      officeId: officeId,
      productId: Number(camelCaseData.productId),
      accountNo: customerInfo.data[0].customerCode + accountPrefix + (await this.leftPadding(accSerialInfo.count, 2)),
      accountTitle: customerInfo.data[0].nameBn,
      openDate: new Date(),
      withdrawInstruction: "N",
      accountStatus: "ACT",
      alltrn: "C",
      authorizeStatus: "A",
      createdBy: userId,
      createdAt: new Date(),
    });

    const resCusLoanAccount = (await transaction.query(customerLoanAccountSql, customerLoanAccountParams)).rows[0];
    const { sql: loanAccountBalSql, params: loanAccountBalParams } = buildInsertSql("loan.account_balance", {
      doptorId: doptorId,
      projectId: camelCaseData.projectId ? Number(camelCaseData.projectId) : null,
      officeId: officeId,
      productId: Number(camelCaseData.productId),
      accountId: resCusLoanAccount.id,
      currentBalance: 0,
      blockAmt: 0,
      createdBy: userId,
      createdAt: new Date(),
    });
    await transaction.query(loanAccountBalSql, loanAccountBalParams);
    let productDetails: any = [];
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
    const transactionService: TransactionService = Container.get(TransactionService);
    const batchNum = await transactionService.generateBatchNumber(transaction);
    const cashTranNum = await transactionService.generateTransactionNumber(transaction);
    const chequeTranNum = await transactionService.generateTransactionNumber(transaction);
    if (camelCaseData.transaction.type === "cash") {
      productDetails = [
        {
          productId: camelCaseData.productId,
          projectId: camelCaseData.projectId ? camelCaseData.projectId : null,
          accountId: resCusLoanAccount.id,
          naration: camelCaseData.transaction.narration
            ? `${camelCaseData.transaction.narration} | ঋণ বিতরণ করা হয়েছে- সদস্যের নাম: ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode}), ঋণের পরিমাণ: ${customerLoanInfo[0]?.loanAmount}`
            : `ঋণ বিতরণ করা হয়েছে- সদস্যের নাম: ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode}), ঋণের পরিমাণ: ${customerLoanInfo[0]?.loanAmount}`,
          drcrCode: "D",
          glacId: productInfo.product_gl,
          batchNum,
          tranNum: cashTranNum,
          tranAmt: is_multiple_disbursement_allow
            ? camelCaseData?.transaction?.disbursedAmount
            : customerLoanInfo[0]?.loanAmount,
          tranCode: "LDG",
          tranType: "CASH",
        },
        {
          productId: camelCaseData.productId,
          projectId: camelCaseData.projectId ? camelCaseData.projectId : null,
          naration: camelCaseData.transaction.narration
            ? `${camelCaseData.transaction.narration} | ঋণ বিতরণ করা হয়েছে- সদস্যের নাম: ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode}), ঋণের পরিমাণ: ${customerLoanInfo[0]?.loanAmount}`
            : `ঋণ বিতরণ করা হয়েছে- সদস্যের নাম: ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode}), ঋণের পরিমাণ: ${customerLoanInfo[0]?.loanAmount}`,
          drcrCode: "C",
          glacId: cashInHandGl[0].id,
          batchNum,
          tranNum: cashTranNum,
          tranAmt: is_multiple_disbursement_allow
            ? camelCaseData?.transaction?.disbursedAmount
            : customerLoanInfo[0]?.loanAmount,
          tranCode: "LDG",
          tranType: "CASH",
        },
      ];
    } else if (camelCaseData.transaction.type === "cheque" || "transfer") {
      const chequeGlSql = `SELECT gl_id FROM loan.office_wise_account WHERE account_no = $1`;
      const chequeGlInfo = (await transaction.query(chequeGlSql, [camelCaseData.transaction.accountNo])).rows[0];

      productDetails = [
        {
          productId: camelCaseData.productId,
          projectId: camelCaseData.projectId ? camelCaseData.projectId : null,
          accountId: resCusLoanAccount.id,
          naration: camelCaseData.transaction.narration
            ? `${camelCaseData.transaction.narration} | ${camelCaseData.remarks}`
            : `${camelCaseData.remarks}`,
          drcrCode: "D",
          glacId: productInfo.product_gl,
          tranAmt: is_multiple_disbursement_allow
            ? camelCaseData?.transaction?.disbursedAmount
            : customerLoanInfo[0]?.loanAmount,
          tranCode: "LDG",
          tranType: "TRANSFER",
          batchNum,
          tranNum: chequeTranNum,
          chequeNum: camelCaseData.transaction.chequeNum,
          chequeDate: new Date(camelCaseData.transaction.chequeDate).toLocaleDateString("en-GB"),
          bankId: camelCaseData.transaction.bankId,
          branchId: camelCaseData.transaction.branchId,
          transferAcNo: camelCaseData.transaction.accountNo,
        },
        {
          productId: camelCaseData.productId,
          projectId: camelCaseData.projectId ? camelCaseData.projectId : null,
          naration: camelCaseData.transaction.narration
            ? `${camelCaseData.transaction.narration} | ${camelCaseData.remarks}`
            : `${camelCaseData.remarks}`,

          drcrCode: "C",
          glacId: chequeGlInfo.gl_id,
          tranAmt: is_multiple_disbursement_allow
            ? camelCaseData?.transaction?.disbursedAmount
            : customerLoanInfo[0]?.loanAmount,
          batchNum,
          tranNum: chequeTranNum,
          chequeNum: camelCaseData.transaction.chequeNum,
          chequeDate: new Date(camelCaseData.transaction.chequeDate).toLocaleDateString("en-GB"),
          bankId: camelCaseData.transaction.bankId,
          branchId: camelCaseData.transaction.branchId,
          transferAcNo: camelCaseData.transaction.accountNo,
          tranCode: "LDG",
          tranType: "TRANSFER",
        },
      ];
    }

    const transactionInfo = await transactionService.generalTransactionEngine(
      doptorId,
      officeId,
      camelCaseData.projectId ? camelCaseData.projectId : null,
      userId,
      null,
      productDetails,
      transaction
    );
    let refDocNo, isDisbursed;
    if (camelCaseData.transaction.type === "cash") refDocNo = cashTranNum;
    else if (camelCaseData.transaction.type === "cheque") refDocNo = chequeTranNum;
    else throw new BadRequestError(`লেনদেনে ত্রুটি হয়েছে`);
    if (is_multiple_disbursement_allow) {
      if (+accSerialInfo?.sanction_limit == Number(camelCaseData?.transaction?.disbursedAmount)) {
        isDisbursed = true;
      } else {
        isDisbursed = false;
      }
    } else {
      isDisbursed = true;
    }
    const disbursementArray = [
      {
        disbursedAmount: camelCaseData?.transaction?.disbursedAmount,
        disbursedDate: moment().format("DD/MM/YYYY"),
      },
    ];
    const { sql: globalLimitsql, params: globalLimitparams } = buildUpdateWithWhereSql(
      "loan.global_limit",
      { customerId: Number(camelCaseData.customerId), id: Number(camelCaseData.sanctionId) },
      {
        accountId: resCusLoanAccount.id,
        isDisbursed,
        disbursedDate: new Date(),
        disbursedBy: userId,
        disbursedAmount: is_multiple_disbursement_allow
          ? camelCaseData?.transaction?.disbursedAmount
          : customerLoanInfo[0]?.loanAmount,
        disbursementLog: JSON.stringify(disbursementArray),
        refDocNo,
        updatedBy: userId,
        updatedAt: new Date(),
      }
    );

    const resGlobalLimit = (await transaction.query(globalLimitsql, globalLimitparams)).rows[0];

    if (isDisbursed) {
      const samitySql = `SELECT 
                          b.return_value AS meeting_day, 
                          a.week_position 
                        FROM 
                          samity.samity_info a 
                          INNER JOIN master.code_master b ON a.meeting_day = b.id 
                        WHERE 
                          a.id = $1`;
      const samityInfo = (await transaction.query(samitySql, [Number(camelCaseData.samityId)])).rows[0];

      const serviceCharge = Container.get(ServiceChargeService);

      const data = await serviceCharge.get(
        Number(customerLoanInfo[0]?.loanAmount),
        Number(customerLoanInfo[0].loanTerm),
        Number(customerLoanInfo[0].serviceChargeRate),
        productInfo.cal_type,
        Number(customerLoanInfo[0].installmentNo),
        customerLoanInfo[0].installmentFrequency,
        moment(new Date()),
        productInfo.grace_amt_repay_ins ? productInfo.grace_amt_repay_ins : "NO",
        productInfo.grace_period,
        samityInfo.meeting_day,
        samityInfo.week_position ? Number(samityInfo.week_position) : undefined,
        productInfo.doptor_id ? Number(productInfo.doptor_id) : undefined,
        officeId,
        productInfo.holiday_effect ? productInfo.holiday_effect : undefined,
        productInfo.installment_amount_method,
        productInfo?.installment_division_digit ? productInfo.installment_division_digit : undefined
      );

      let schedule = data.schedule;

      for (const value of schedule) {
        const { sql: scheduleSql, params: scheduleParams } = buildInsertSql("loan.schedule_info", {
          doptorId,
          officeId: officeId,
          projectId: camelCaseData.projectId ? Number(camelCaseData.projectId) : null,
          productId: Number(camelCaseData.productId),
          samityId: Number(camelCaseData.samityId),
          customerId: Number(camelCaseData.customerId),
          accountId: resCusLoanAccount.id,
          installmentNo: value.scheduleNo,
          dueDate: new Date(value.installmentDate as any).toLocaleDateString("en-GB"),
          principalAmount: value.installmentPrincipalAmt,
          interestAmount: value.installmentServiceChargeAmt,
          totalAmount: value.total,
          createdBy: userId,
          createdAt: new Date(),
        });
        (await transaction.query(scheduleSql, scheduleParams)).rows[0];
      }
      let lastLoanAmount = customerInfo.data[0].lastLoanAmount ? customerInfo.data[0].lastLoanAmount : [];
      let allLoanNumbers;
      if (lastLoanAmount.length > 0) {
        lastLoanAmount = lastLoanAmount.filter((value: any) => value.productId == camelCaseData.productId);
        allLoanNumbers = lastLoanAmount.map((value: any) => value.noOfLoan);
      } else allLoanNumbers = [0];

      const newLoanNo = Math.max(...allLoanNumbers);
      lastLoanAmount.push({
        lastLoanAmount: customerLoanInfo[0]?.loanAmount,
        productId: camelCaseData.productId,
        noOfLoan: Number(newLoanNo) + 1,
      });

      const { sql: cusUpdateSql, params: cusUpdateParams } = buildUpdateWithWhereSql(
        "samity.customer_info",
        { id: Number(camelCaseData.customerId) },
        {
          // numberOfLoan: JSON.stringify(finalPreValue),
          lastLoanAmount: JSON.stringify(lastLoanAmount),
          updatedBy: userId,
          updatedAt: new Date(),
        }
      );
      transaction.query(cusUpdateSql, cusUpdateParams);
    }
    const insuranceCheckSql = `SELECT 
                                  allow_insurance, 
                                  COALESCE(insurance_percent, 0) insurance_percent, 
                                  insurance_gl 
                                FROM 
                                  loan.product_mst 
                                WHERE 
                                  id = $1`;
    const insuranceCheckInfo = (await transaction.query(insuranceCheckSql, [camelCaseData.productId])).rows[0];
    if (insuranceCheckInfo.allow_insurance) {
      let insuranceAmount = (insuranceCheckInfo?.insurance_percent / 100) * customerLoanInfo[0]?.loanAmount;
      if (insuranceAmount > 0) {
        if (!insuranceCheckInfo.insurance_gl) {
          throw new BadRequestError(`বীমার জিএল এর তথ্য পাওয়া যায়নি`);
        }
        const insuranceTrnNumber = await transactionService.generateTransactionNumber(transaction);
        const insuranceTransactionSets = [
          {
            productId: camelCaseData.productId,
            projectId: camelCaseData.projectId ? camelCaseData.projectId : null,
            naration: `ঋণ বিতরণের বীমার তথ্য- সদস্যের নাম: ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode}), ঋণের পরিমাণ: ${customerLoanInfo[0]?.loanAmount}`,
            drcrCode: "C",
            glacId: insuranceCheckInfo.insurance_gl,
            batchNum,
            tranNum: insuranceTrnNumber,
            tranAmt: insuranceAmount,
            tranCode: "INS",
            tranType: "CASH",
          },
          {
            productId: camelCaseData.productId,
            projectId: camelCaseData.projectId ? camelCaseData.projectId : null,
            naration: `ঋণ বিতরণের বীমার তথ্য - সদস্যের নাম: ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode}), ঋণের পরিমাণ: ${customerLoanInfo[0]?.loanAmount}`,
            drcrCode: "D",
            glacId: cashInHandGl[0].id,
            batchNum,
            tranNum: insuranceTrnNumber,
            tranAmt: insuranceAmount,
            tranCode: "INS",
            tranType: "CASH",
          },
        ];
        const insuranceTransactionInfo = await transactionService.generalTransactionEngine(
          doptorId,
          officeId,
          camelCaseData.projectId ? camelCaseData.projectId : null,
          userId,
          null,
          insuranceTransactionSets,
          transaction
        );
      }
    }

    //customerInfo.data[0].nameBn;

    await transaction.query("COMMIT");
    return resGlobalLimit;
  }
  //approve loan disbursement application and create loan schedule for multiple disbursement
  async loanDisbursementForMultipleDisbursement(
    allData: any,
    transaction: PoolClient,
    userId: number,
    officeId: number,
    doptorId: number,
    accountId: number
  ) {
    const camelCaseData = toCamelKeys(allData) as any;

    const disbursedAmount = camelCaseData?.transaction?.disbursedAmount;

    console.log("Disbursed Amount----", disbursedAmount);

    const productSql = `SELECT 
                            doptor_id,
                            cal_type, 
                            product_gl, 
                            grace_amt_repay_ins, 
                            grace_period,
                            holiday_effect,
                            installment_amount_method,
                            installment_division_digit,
                            is_multiple_disbursement_allow
                          FROM 
                            loan.product_mst 
                          WHERE 
                            id = $1`;
    const productInfo = (await transaction.query(productSql, [camelCaseData.productId])).rows[0];

    const samityService: SamityService = Container.get(SamityService);
    const customerInfo = await samityService.getMainMember(1, 1, {
      id: Number(camelCaseData.customerId),
    });

    if (customerInfo.data.length <= 0) throw new BadRequestError(`সদস্যের তথ্য পাওয়া যায়নি`);

    const customerLoanInfo = await samityService.getCustomerLoanInfo(Number(camelCaseData.customerId));
    if (customerLoanInfo.length <= 0) throw new BadRequestError(`সদস্যের ঋণের আবেদনের তথ্য পাওয়া যায়নি`);

    let productDetails: any = [];
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
    const transactionService: TransactionService = Container.get(TransactionService);
    const batchNum = await transactionService.generateBatchNumber(transaction);
    const cashTranNum = await transactionService.generateTransactionNumber(transaction);
    const chequeTranNum = await transactionService.generateTransactionNumber(transaction);
    if (camelCaseData.transaction.type === "cash") {
      productDetails = [
        {
          productId: camelCaseData.productId,
          projectId: camelCaseData.projectId ? camelCaseData.projectId : null,
          accountId,
          naration: camelCaseData.transaction.narration
            ? `${camelCaseData.transaction.narration} | ঋণ বিতরণ করা হয়েছে- সদস্যের নাম: ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode}), ঋণের পরিমাণ: ${customerLoanInfo[0]?.loanAmount}`
            : `ঋণ বিতরণ করা হয়েছে- সদস্যের নাম: ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode}), ঋণের পরিমাণ: ${customerLoanInfo[0]?.loanAmount}`,
          drcrCode: "D",
          glacId: productInfo.product_gl,
          batchNum,
          tranNum: cashTranNum,
          tranAmt: disbursedAmount,
          tranCode: "LDG",
          tranType: "CASH",
        },
        {
          productId: camelCaseData.productId,
          projectId: camelCaseData.projectId ? camelCaseData.projectId : null,
          naration: camelCaseData.transaction.narration
            ? `${camelCaseData.transaction.narration} | ঋণ বিতরণ করা হয়েছে- সদস্যের নাম: ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode}), ঋণের পরিমাণ: ${customerLoanInfo[0]?.loanAmount}`
            : `ঋণ বিতরণ করা হয়েছে- সদস্যের নাম: ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode}), ঋণের পরিমাণ: ${customerLoanInfo[0]?.loanAmount}`,
          drcrCode: "C",
          glacId: cashInHandGl[0].id,
          batchNum,
          tranNum: cashTranNum,
          tranAmt: disbursedAmount,
          tranCode: "LDG",
          tranType: "CASH",
        },
      ];
    } else if (camelCaseData.transaction.type === "cheque" || "transfer") {
      const chequeGlSql = `SELECT gl_id FROM loan.office_wise_account WHERE account_no = $1`;
      const chequeGlInfo = (await transaction.query(chequeGlSql, [camelCaseData.transaction.accountNo])).rows[0];

      productDetails = [
        {
          productId: camelCaseData.productId,
          projectId: camelCaseData.projectId ? camelCaseData.projectId : null,
          accountId,
          naration: camelCaseData.transaction.narration
            ? `${camelCaseData.transaction.narration} | ${camelCaseData.remarks}`
            : `${camelCaseData.remarks}`,
          drcrCode: "D",
          glacId: productInfo.product_gl,
          tranAmt: disbursedAmount,
          tranCode: "LDG",
          tranType: "TRANSFER",
          batchNum,
          tranNum: chequeTranNum,
          chequeNum: camelCaseData.transaction.chequeNum,
          chequeDate: new Date(camelCaseData.transaction.chequeDate).toLocaleDateString("en-GB"),
          bankId: camelCaseData.transaction.bankId,
          branchId: camelCaseData.transaction.branchId,
          transferAcNo: camelCaseData.transaction.accountNo,
        },
        {
          productId: camelCaseData.productId,
          projectId: camelCaseData.projectId ? camelCaseData.projectId : null,
          naration: camelCaseData.transaction.narration
            ? `${camelCaseData.transaction.narration} | ${camelCaseData.remarks}`
            : `${camelCaseData.remarks}`,

          drcrCode: "C",
          glacId: chequeGlInfo.gl_id,
          tranAmt: disbursedAmount,
          batchNum,
          tranNum: chequeTranNum,
          chequeNum: camelCaseData.transaction.chequeNum,
          chequeDate: new Date(camelCaseData.transaction.chequeDate).toLocaleDateString("en-GB"),
          bankId: camelCaseData.transaction.bankId,
          branchId: camelCaseData.transaction.branchId,
          transferAcNo: camelCaseData.transaction.accountNo,
          tranCode: "LDG",
          tranType: "TRANSFER",
        },
      ];
    }

    const transactionInfo = await transactionService.generalTransactionEngine(
      doptorId,
      officeId,
      camelCaseData.projectId ? camelCaseData.projectId : null,
      userId,
      null,
      productDetails,
      transaction
    );

    //previous data at global limit for the customer
    const globalLimitPreSql = `SELECT 
                                a.sanction_limit, 
                                a.disbursed_amount, 
                                a.disbursement_log,
                                c.current_balance
                              FROM loan.global_limit a 
                              INNER JOIN loan.account_info b ON a.customer_id=b.customer_id AND a.account_id=b.id AND a.product_id = b.product_id
                              INNER JOIN loan.account_balance c ON c.account_id = b.id
                              WHERE
                                b.customer_id = $1
                                and b.account_status = 'ACT'`;
    const globalLimitPreValue = (await transaction.query(globalLimitPreSql, [camelCaseData.customerId])).rows[0];
    const previousDisbursedAmount = globalLimitPreValue?.disbursed_amount
      ? Number(globalLimitPreValue.disbursed_amount)
      : 0;
    let previuosDibursedLog =
      globalLimitPreValue?.disbursement_log && globalLimitPreValue?.disbursement_log.length > 0
        ? globalLimitPreValue.disbursement_log
        : [];

    console.log("PREVIOUS DISBURSEMENT LOG----", previuosDibursedLog);

    const totalDisbursedAmount = previousDisbursedAmount + Number(disbursedAmount);
    let refDocNo, isDisbursed;

    //set disbursement status
    if (totalDisbursedAmount === Number(globalLimitPreValue.sanction_limit)) {
      const samitySql = `SELECT 
                          b.return_value AS meeting_day, 
                          a.week_position 
                        FROM 
                          samity.samity_info a 
                          INNER JOIN master.code_master b ON a.meeting_day = b.id 
                        WHERE 
                          a.id = $1`;
      const samityInfo = (await transaction.query(samitySql, [Number(camelCaseData.samityId)])).rows[0];

      const serviceCharge = Container.get(ServiceChargeService);

      const data = await serviceCharge.get(
        Number(customerLoanInfo[0]?.loanAmount),
        Number(customerLoanInfo[0].loanTerm),
        Number(customerLoanInfo[0].serviceChargeRate),
        productInfo.cal_type,
        Number(customerLoanInfo[0].installmentNo),
        customerLoanInfo[0].installmentFrequency,
        moment(new Date()),
        productInfo.grace_amt_repay_ins ? productInfo.grace_amt_repay_ins : "NO",
        productInfo.grace_period,
        samityInfo.meeting_day,
        samityInfo.week_position ? Number(samityInfo.week_position) : undefined,
        productInfo.doptor_id ? Number(productInfo.doptor_id) : undefined,
        officeId,
        productInfo.holiday_effect ? productInfo.holiday_effect : undefined,
        productInfo.installment_amount_method,
        productInfo?.installment_division_digit ? productInfo.installment_division_digit : undefined
      );

      let schedule = data.schedule;

      for (const value of schedule) {
        const { sql: scheduleSql, params: scheduleParams } = buildInsertSql("loan.schedule_info", {
          doptorId,
          officeId: officeId,
          projectId: camelCaseData.projectId ? Number(camelCaseData.projectId) : null,
          productId: Number(camelCaseData.productId),
          samityId: Number(camelCaseData.samityId),
          customerId: Number(camelCaseData.customerId),
          accountId,
          installmentNo: value.scheduleNo,
          dueDate: new Date(value.installmentDate as any).toLocaleDateString("en-GB"),
          principalAmount: value.installmentPrincipalAmt,
          interestAmount: value.installmentServiceChargeAmt,
          totalAmount: value.total,
          createdBy: userId,
          createdAt: new Date(),
        });
        (await transaction.query(scheduleSql, scheduleParams)).rows[0];
      }
      let lastLoanAmount = customerInfo.data[0].lastLoanAmount ? customerInfo.data[0].lastLoanAmount : [];
      let allLoanNumbers;
      if (lastLoanAmount.length > 0) {
        lastLoanAmount = lastLoanAmount.filter((value: any) => value.productId == camelCaseData.productId);
        allLoanNumbers = lastLoanAmount.map((value: any) => value.noOfLoan);
      } else allLoanNumbers = [0];

      const newLoanNo = Math.max(...allLoanNumbers);
      lastLoanAmount.push({
        lastLoanAmount: customerLoanInfo[0]?.loanAmount,
        productId: camelCaseData.productId,
        noOfLoan: Number(newLoanNo) + 1,
      });

      const { sql: cusUpdateSql, params: cusUpdateParams } = buildUpdateWithWhereSql(
        "samity.customer_info",
        { id: Number(camelCaseData.customerId) },
        {
          // numberOfLoan: JSON.stringify(finalPreValue),
          lastLoanAmount: JSON.stringify(lastLoanAmount),
          updatedBy: userId,
          updatedAt: new Date(),
        }
      );
      transaction.query(cusUpdateSql, cusUpdateParams);
      isDisbursed = true;
    } else {
      isDisbursed = false;
    }
    previuosDibursedLog.push({
      disbursedAmount,
      disbursedDate: moment().format("DD/MM/YYYY"),
    });

    if (camelCaseData.transaction.type === "cash") refDocNo = cashTranNum;
    else if (camelCaseData.transaction.type === "cheque") refDocNo = chequeTranNum;
    else throw new BadRequestError(`লেনদেনে ত্রুটি হয়েছে`);
    const { sql: globalLimitsql, params: globalLimitparams } = buildUpdateWithWhereSql(
      "loan.global_limit",
      { customerId: Number(camelCaseData.customerId), id: Number(camelCaseData.sanctionId) },
      {
        isDisbursed,
        refDocNo,
        disbursedAmount: totalDisbursedAmount,
        disbursementLog: JSON.stringify(previuosDibursedLog),
        updatedBy: userId,
        updatedAt: new Date(),
      }
    );

    const resGlobalLimit = (await transaction.query(globalLimitsql, globalLimitparams)).rows[0];

    const insuranceCheckSql = `SELECT 
                                  allow_insurance, 
                                  COALESCE(insurance_percent, 0) insurance_percent, 
                                  insurance_gl 
                                FROM 
                                  loan.product_mst 
                                WHERE 
                                  id = $1`;
    const insuranceCheckInfo = (await transaction.query(insuranceCheckSql, [camelCaseData.productId])).rows[0];
    if (insuranceCheckInfo.allow_insurance) {
      let insuranceAmount = (insuranceCheckInfo?.insurance_percent / 100) * customerLoanInfo[0]?.loanAmount;
      if (insuranceAmount > 0) {
        if (!insuranceCheckInfo.insurance_gl) {
          throw new BadRequestError(`বীমার জিএল এর তথ্য পাওয়া যায়নি`);
        }
        const insuranceTrnNumber = await transactionService.generateTransactionNumber(transaction);
        const insuranceTransactionSets = [
          {
            productId: camelCaseData.productId,
            projectId: camelCaseData.projectId ? camelCaseData.projectId : null,
            naration: `ঋণ বিতরণের বীমার তথ্য- সদস্যের নাম: ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode}), ঋণের পরিমাণ: ${customerLoanInfo[0]?.loanAmount}`,
            drcrCode: "C",
            glacId: insuranceCheckInfo.insurance_gl,
            batchNum,
            tranNum: insuranceTrnNumber,
            tranAmt: insuranceAmount,
            tranCode: "INS",
            tranType: "CASH",
          },
          {
            productId: camelCaseData.productId,
            projectId: camelCaseData.projectId ? camelCaseData.projectId : null,
            naration: `ঋণ বিতরণের বীমার তথ্য - সদস্যের নাম: ${customerInfo.data[0].nameBn} (${customerInfo.data[0].customerCode}), ঋণের পরিমাণ: ${customerLoanInfo[0]?.loanAmount}`,
            drcrCode: "D",
            glacId: cashInHandGl[0].id,
            batchNum,
            tranNum: insuranceTrnNumber,
            tranAmt: insuranceAmount,
            tranCode: "INS",
            tranType: "CASH",
          },
        ];
        const insuranceTransactionInfo = await transactionService.generalTransactionEngine(
          doptorId,
          officeId,
          camelCaseData.projectId ? camelCaseData.projectId : null,
          userId,
          null,
          insuranceTransactionSets,
          transaction
        );
      }
    }

    await transaction.query("COMMIT");
    return resGlobalLimit;
  }

  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }

  async webSiteSync(transaction: PoolClient, officeId?: number) {
    let sql = ``;
    let samityResult = [];
    if (officeId) {
      sql = `select id from coop.samity_info where office_id=$1`;
      samityResult = (await transaction.query(sql, [officeId])).rows;
    } else {
      sql = `select id from coop.samity_info`;
      samityResult = (await transaction.query(sql)).rows;
    }

    for (const element of samityResult) {
      const samityDataPageDataSql = `SELECT
                                       a.samity_name,
                                       a.samity_code,
                                       a.samity_level,
                                       a.samity_district_id,
                                       a.samity_division_id,
                                       a.samity_upa_city_id,
                                       a.samity_upa_city_type,
                                       a.samity_uni_thana_paw_id,
                                       a.samity_uni_thana_paw_type,
                                       a.samity_type_id,
                                       a.mobile,
                                       a.email,
                                       b.name_bangla,
                                       c.project_name_bangla,
                                       d.name_bn office_name,
                                       e.name_bn doptor_name,
                                       f.district_name_bangla,
                                       g.upazila_name_bangla,
                                       h.division_name_bangla as samity_division_name_bangla,
                                       i.type_name samiy_type_name,
                                       j.name_bn doptor_name
                                     FROM
                                       coop.samity_info a
                                     LEFT JOIN users.user b ON
                                       b.id = a.organizer_id
                                     LEFT JOIN master.project_info c ON
                                       c.id = a.project_id
                                     INNER JOIN master.office_info d ON
                                       d.id = a.office_id
                                     INNER JOIN master.doptor_info e ON
                                       e.id = a.doptor_id
                                     INNER JOIN master.district_info f ON
                                       f.id = a.district_id
                                     INNER JOIN master.upazila_info g ON
                                       g.id = a.upazila_id
                                     INNER JOIN master.division_info h ON
                                       h.id=a.samity_division_id
                                     INNER JOIN coop.samity_type i ON
                                       i.id=a.samity_type_id
                                     INNER JOIN master.doptor_info j ON
                                       j.id=a.doptor_id
                                     WHERE
                                       a.id = $1`;
      const samityDataForPageData = (await transaction.query(samityDataPageDataSql, [element.id])).rows[0];

      const sql = `Select * from portal.page_data where samity_id = $1 and status = true`;

      const result = (await transaction.query(sql, [element.id])).rows[0];

      if (result.id) {
        const committeeInfoSql = `SELECT * FROM coop.committee_info WHERE samity_id=$1`;
        const committeeInfoDataResult = (
          await (await pgConnect.getConnection("slave")).query(committeeInfoSql, [element.id])
        ).rows[0];

        let committeeMembers = [];

        if (committeeInfoDataResult) {
          const committeeMemberSql = `select
          b.id,
          b.samity_id,
          b.committee_id,
          b.committee_role_id,
              a.member_name,
              a.member_name_bangla,
              a.member_photo,
              a.member_sign,
              c.role_name
            from
          coop.committee_member b
             left join  coop.member_info a on b.samity_id=a.samity_id and b.member_id=a.id
             left join master.committee_role c on c.id=b.committee_role_id 
            where
              b.samity_id = $1`;
          committeeMembers = (await transaction.query(committeeMemberSql, [element.id])).rows;
        }

        // result.data.committeeMemberWithPhoto = committeeMembers;

        const budgetSql = `SELECT
                     a.id,
                     a.samity_id,
                     a.start_year,
                     a.end_year,
                     a.amount,
                     b.glac_name,
                     b.glac_code
                   FROM
                     coop.budget_info a
                   INNER JOIN coop.glac_mst b ON
                     a.glac_id = b.id
                   WHERE samity_id = $1`;
        const budgetResult = (await transaction.query(budgetSql, [element.id])).rows;
        const { sql: pageDataUpdateSql, params: pageDataParams } = buildUpdateWithWhereSql(
          "portal.page_data",
          { samityId: element.id },
          {
            data: {
              mainBudgetData: budgetResult ? budgetResult : [],
              committeeMemberWithPhoto: committeeMembers,
              samityDataForPageData: samityDataForPageData,
            },
            updatedBy: "scheduler",
            updatedAt: new Date(),
          }
        );

        const pageData = (await transaction.query(pageDataUpdateSql, pageDataParams)).rows;
      }
    }
  }
}
