import lodash from "lodash";
import Container, { Service } from "typedi";
import db from "../../../db/connection.db";
import BadRequestError from "../../../errors/bad-request.error";
import DataService from "../../master/services/master-data.service";
import SanctionService from "../../sanction/services/sanction.service";
import { numberToWord } from "../../../utils/eng-to-bangla-digit";
@Service()
export class SanctionApplicationValidationService {
  constructor() {}

  //documents validation
  async customerDocumentsValidate(payload: any) {
    const masterDataService: DataService = Container.get(DataService);
    const sanctionService: SanctionService = Container.get(SanctionService);
    //all docs from db
    let documents = (await sanctionService.getDocumentType(
      parseInt(payload.doptorId),
      parseInt(payload.projectId),
      parseInt(payload.data.productId),
      parseInt(payload.data.customerId)
    )) as any;

    documents.map((value: any, index: number) => {
      documents[index] = {
        ...value.documentProperties,
        docTypeId: value.id,
        ...lodash.omit(value, ["documentProperties", "id"]),
      };
    });

    //all mandatory docs
    let mandatoryDocs = documents.filter((value: any) => value.isMandatory == true);
    //members payload doc types
    const mandatoryDocTypes = mandatoryDocs.map((value: any) => value.docType);
    let singleMemberDoc = payload.data.documentList;

    //document mandatory checking
    let singleMemberDocTypes = singleMemberDoc.map((value: any) => value.documentType);

    //duplicate docs checking
    let duplicateDocTypes = singleMemberDocTypes.filter(
      (item: any, index: number) => singleMemberDocTypes.indexOf(item) != index
    );

    let uniqueDuplicateDocTypes = [...new Set(duplicateDocTypes)];

    let singleUniqueDocType = documents.filter((value: any) => value.docType == uniqueDuplicateDocTypes[0]);
    if (uniqueDuplicateDocTypes[0] && singleUniqueDocType[0]) {
      throw new BadRequestError(`${singleUniqueDocType[0].docTypeDesc} দুইবার প্রদান করা যাবে না`);
    }
    let mandatoryDocCheck = mandatoryDocTypes.every((v: any) => singleMemberDocTypes.includes(v));
    //document no mandatory checking
    if (!mandatoryDocCheck) {
      let missinGDocType = mandatoryDocTypes.filter((value: any) => !singleMemberDocTypes.includes(value));
      let missinGDocMsg = documents.filter((value: any) => value.docType == missinGDocType[0]);
      throw new BadRequestError(missinGDocMsg[0]?.docTypeDesc ? `${missinGDocMsg[0].docTypeDesc} দেওয়া আবশ্যক` : " ");
    }

    const allowedFileTypes = ["jpeg", "jpg", "png", "pdf"];

    //traverse given application documents
    if (singleMemberDoc && singleMemberDoc[0] && singleMemberDoc[0]?.documentType) {
      for (let singleDoc of singleMemberDoc) {
        let mainDoc = documents.filter((value: any) => value.docType == singleDoc.documentType);

        if (mainDoc[0].isDocNoMandatory) {
          if (!singleDoc.documentNumber) {
            throw new BadRequestError(`${mainDoc[0].docTypeDesc} এর নম্বর দেওয়া আবশ্যক`);
          }

          //document no length checking
          if (!mainDoc[0].docNoLength.includes(String(singleDoc.documentNumber).length)) {
            throw new BadRequestError(
              `${mainDoc[0].docTypeDesc} নম্বর অবশ্যই ${mainDoc[0].docNoLength} ডিজিটের হতে হবে`
            );
          }
        }

        //get current document type from all uploaded files list
        let currentDocumentType = documents.filter((value: any) => value.docType == singleDoc.documentType);

        //file upload mandatory check
        if (mandatoryDocCheck && !(singleDoc.documentFront || singleDoc.documentBack)) {
          throw new BadRequestError(`সদস্যের ${currentDocumentType[0].docTypeDesc} এর ছবি/ফাইল সংযুক্ত করা আবশ্যক`);
        }

        //front file type check
        let uploadedSingleFileFrontType =
          singleDoc?.documentFrontType && String(singleDoc.documentFrontType).split("/")[1];

        if (mandatoryDocCheck && singleDoc.documentFront && !allowedFileTypes.includes(uploadedSingleFileFrontType)) {
          throw new BadRequestError(
            `সদস্যের ${currentDocumentType[0].docTypeDesc} এর সম্মুখ ছবি/ফাইল JPEG/JPG/PNG/PDF ফরম্যাটে দিতে হবে`
          );
        }

        //back file type check
        let uploadedSingleFileBackType =
          singleDoc?.documentBackType && String(singleDoc.documentBackType).split("/")[1];

        if (mandatoryDocCheck && singleDoc.documentBack && !allowedFileTypes.includes(uploadedSingleFileBackType)) {
          throw new BadRequestError(
            `সদস্যের ${currentDocumentType[0].docTypeDesc} এর পিছনের ছবি/ফাইল JPEG/JPG/PNG/PDF ফরম্যাটে দিতে হবে`
          );
        }
      }
    }
  }

  // checking customer is Active or not
  async isCustomerActive(payload: any) {
    const pool = db.getConnection("slave");
    const cusSql = `
        SELECT customer_status FROM samity.customer_info
        WHERE id = $1 and doptor_id = $2 and office_id = $3 and project_id = $4 and samity_id = $5
        `;
    const customerStatus = (
      await pool.query(cusSql, [
        parseInt(payload.data.customerId),
        parseInt(payload.doptorId),
        parseInt(payload.officeId),
        parseInt(payload.projectId),
        parseInt(payload.samityId),
      ])
    ).rows[0];

    if (!customerStatus || customerStatus.customer_status !== "ACT") throw new BadRequestError(`সদস্য সক্রিয় নয়`);
    else return true;
  }

  //checking customer has any loan account or not
  async hasAnyLoanAccount(payload: any, isMultipleLoanAllow: boolean) {
    const pool = db.getConnection("slave");
    const loanAccsql = `SELECT 
                            COUNT (*) 
                        FROM 
                            loan.global_limit a 
                            INNER JOIN temps.application b ON CAST(data ->> 'customer_id' as integer) = a.customer_id 
                        WHERE 
                            a.doptor_id = $1 
                            AND a.project_id = $2 
                            AND a.samity_id = $3 
                            AND a.customer_id = $4
                            AND b.service_id = $5 
                            AND a.is_disbursed = false 
                            AND b.status = 'A'`;
    var loanAccount = (
      await pool.query(loanAccsql, [
        parseInt(payload.doptorId),
        parseInt(payload.projectId),
        parseInt(payload.samityId),
        parseInt(payload.data.customerId),
        parseInt(payload.serviceId),
      ])
    ).rows[0] as any;

    const cusDataSql = `SELECT name_bn, customer_code FROM samity.customer_info WHERE id = $1`;
    const cusData = (await pool.query(cusDataSql, [parseInt(payload.data.customerId)])).rows[0] as any;

    //checking customer has any running loan
    const runningLoanCheckSql = `SELECT 
                                  COUNT(*) 
                                FROM 
                                  loan.global_limit a 
                                  INNER JOIN loan.account_info b ON b.customer_id = a.customer_id 
                                  INNER JOIN loan.product_mst c ON c.id = b.product_id 
                                WHERE 
                                    a.doptor_id = $1 
                                    AND a.project_id = $2 
                                    AND a.samity_id = $3 
                                    AND a.customer_id = $4 
                                    AND a.is_disbursed = true 
                                    AND b.account_status != 'CLS'
                                    AND c.deposit_nature = 'L'`;

    const runningLoanCheck = (
      await pool.query(runningLoanCheckSql, [
        payload.doptorId,
        payload.projectId,
        payload.samityId,
        payload.data.customerId,
      ])
    ).rows[0];

    //checking customer has any loan account or not in other doptor/project
    const otherLoansSql = `SELECT
                                COUNT (*) 
                            FROM
                              loan.global_limit a 
                              INNER JOIN loan.account_info b ON b.customer_id = a.customer_id
                              INNER JOIN loan.product_mst c ON c.id = b.product_id
                            WHERE
                                a.customer_id = $4 
                                AND 
                                (
                                a.doptor_id != $1 
                                OR a.project_id != $2 
                                OR a.samity_id != $3 
                                OR a.is_disbursed = true 
                                )
                                AND b.account_status != 'CLS'
                                AND c.deposit_nature = 'L'`;
    var otherLoans = (
      await pool.query(otherLoansSql, [
        parseInt(payload.doptorId),
        parseInt(payload.projectId),
        parseInt(payload.samityId),
        parseInt(payload.data.customerId),
      ])
    ).rows[0] as any;

    //checking customer has any pending loan account or not
    const pendingLoanSql = `SELECT 
                                COUNT(*) 
                            FROM 
                                temps.application 
                            WHERE 
                                doptor_id = $1 
                                AND project_id = $2 
                                AND samity_id = $3
                                AND CAST(data ->> 'customer_id' as integer) = $4
                                AND service_id = $5 
                                AND status != 'A'`;

    const pendingLoan = (
      await pool.query(pendingLoanSql, [
        parseInt(payload.doptorId),
        parseInt(payload.projectId),
        parseInt(payload.samityId),
        parseInt(payload.data.customerId),
        parseInt(payload.serviceId),
      ])
    ).rows[0] as any;

    if (parseInt(pendingLoan.count) > 0)
      throw new BadRequestError(`ইতিমধ্যে এই সদস্যের (${cusData.name_bn}) একটি ঋণ আবেদন অপেক্ষমান আছে`);
    else if (parseInt(loanAccount.count) > 0)
      throw new BadRequestError(
        `ইতিমধ্যে এই সদস্যের (${cusData.name_bn}) একটি ঋণ অনুমোদিত আছে। ঋণ বিতরণের জন্য অপেক্ষা করুন`
      );
    else if (isMultipleLoanAllow != true && parseInt(runningLoanCheck.count) > 0)
      throw new BadRequestError(`ইতিমধ্যে এই সদস্যের (${cusData.name_bn}) একটি ঋণ চলমান আছে`);
    else if (isMultipleLoanAllow != true && parseInt(otherLoans.count) > 0)
      throw new BadRequestError(`ইতিমধ্যে এই সদস্যের (${cusData.name_bn}) অন্য কোনো দপ্তরে ঋণ সক্রিয় আছে`);
    else return true;
  }

  //account balance checking based on default product status
  async defaultProductChecking(payload: any) {
    const pool = db.getConnection("slave");
    const isDefaultSavingsProductSql = `SELECT is_default_savings_product FROM master.project_info WHERE id =$1`;
    const isDefaultSavingsProduct = (await pool.query(isDefaultSavingsProductSql, [payload.projectId])).rows[0]
      ?.is_default_savings_product;
    if (isDefaultSavingsProduct) {
      //checking sanction policy
      const loanStatusSql = `SELECT last_loan_amount FROM samity.customer_info WHERE id = $1`;
      const allLoanStatus = (await pool.query(loanStatusSql, [payload.data.customerId])).rows[0].last_loan_amount;
      let loanNo: number = 0;
      let loanStatus = allLoanStatus.filter((allLoanStatus: any) => allLoanStatus.productId == payload.data.productId);
      if (loanStatus[0]) {
        loanStatus = loanStatus.map((value: any) => value.noOfLoan);
        const maxLoanNo = Math.max(...loanStatus);
        loanNo = maxLoanNo;
      } else loanNo = 0;
      // loanStatus = loanStatus[0]
      //   ? loanStatus
      //   : [{ noOfLoan: 0, productId: payload.data.productId }];

      const loanPolicySql = `SELECT 
                  loan_no, 
                  min_amount, 
                  max_amount, 
                  deposit_percent, 
                  share_percent 
                FROM 
                  loan.product_sanction_policy 
                WHERE 
                  loan_no = $1 AND 
                  doptor_id = $2 AND 
                  project_id = $3 AND 
                  product_id = $4`;
      const loanPolicy = (
        await pool.query(loanPolicySql, [
          Number(loanNo) + 1,
          parseInt(payload.doptorId),
          parseInt(payload.projectId),
          parseInt(payload.data.productId),
        ])
      ).rows[0];

      if (!loanPolicy) throw new BadRequestError(`সদস্যের ঋণের কোনো পলিসি পাওয়া যায়নি`);
      else {
        const sql = `SELECT id FROM loan.product_mst
          WHERE doptor_id = $1 AND project_id = $2 AND deposit_nature = 'R'`;

        //checking minimum savings account balance
        const savingsAccountProduct = (await pool.query(sql, [payload.doptorId, payload.projectId])).rows[0] as any;

        const accSql = `SELECT id, account_no FROM loan.account_info
            WHERE customer_id = $1 and 
            product_id = $2 and 
            samity_id = $3 and 
            doptor_id = $4 and 
            project_id = $5`;
        const savingsAccount = (
          await pool.query(accSql, [
            parseInt(payload.data.customerId),
            parseInt(savingsAccountProduct.id),
            parseInt(payload.samityId),
            parseInt(payload.doptorId),
            parseInt(payload.projectId),
          ])
        ).rows as any;

        if (!savingsAccount[0]) throw new BadRequestError(`সদস্যের সেভিংস একাউন্টের তথ্য নেই`);
        else {
          const currentBalSql = `SELECT current_balance FROM loan.account_balance WHERE account_id = $1`;
          let currentBalance = (await pool.query(currentBalSql, [parseInt(savingsAccount[0].id)])).rows[0]
            .current_balance;

          const minBalance = (parseInt(payload.data.loanAmount) * loanPolicy.deposit_percent) / 100;

          if (currentBalance < minBalance) throw new BadRequestError(`সদস্যের সেভিংস একাউন্টে পর্যাপ্ত ব্যালেন্স নেই`);
          else {
            //checking minimum share account balance
            //           const shareSql = `SELECT id FROM loan.product_mst
            // WHERE doptor_id = $1 AND project_id = $2 AND deposit_nature = 'S'`;
            //           const shareAccountProduct = (
            //             await pool.query(shareSql, [
            //               parseInt(payload.doptorId),
            //               parseInt(payload.projectId),
            //             ])
            //           ).rows[0] as any;
            //           const accSql = `SELECT id, current_balance, account_no FROM loan.account_info
            //           WHERE customer_id = $1 and
            //           product_id = $2 and
            //           samity_id = $3 and
            //           doptor_id = $4 and
            //           project_id = $5`;
            //           const shareAccount = (
            //             await pool.query(accSql, [
            //               parseInt(payload.data.customerId),
            //               parseInt(shareAccountProduct.id),
            //               parseInt(payload.samityId),
            //               parseInt(payload.doptorId),
            //               parseInt(payload.projectId),
            //             ])
            //           ).rows as any;
            //           let currentShare: number;
            //           if (!shareAccount[0])
            //             throw new BadRequestError(`সদস্যের শেয়ার একাউন্টের তথ্য নেই`);
            //           else {
            //             const currentShareSql = `SELECT current_balance FROM loan.account_balance WHERE account_id = $1`;
            //             currentShare = (
            //               await pool.query(currentShareSql, [
            //                 parseInt(shareAccount[0].id),
            //               ])
            //             ).rows[0].current_balance;
            //             const minShareBalance =
            //               (parseInt(payload.data.loanAmount) * loanPolicy.share_percent) /
            //               100;
            //             if (currentShare < minShareBalance)
            //               throw new BadRequestError(
            //                 `সদস্যের শেয়ার একাউন্টে পর্যাপ্ত ব্যালেন্স নেই`
            //               );
            //           }
          }
        }
      }
    }
    return true;
  }

  async multipleDisbursed(payload: any) {
    const pool = db.getConnection("slave");

    const accountInfoSql = `SELECT
                              a.sanction_limit,SUM(c.total_paid_amount) as total_paid_amount,
                              d.allow_percent,a.profit_amount,b.id
                            FROM
                              loan.global_limit a
                              INNER JOIN loan.account_info b ON b.customer_id = a.customer_id and a.customer_id=b.id
                              INNER JOIN loan.schedule_info c ON c.account_id=b.id
                              INNER JOIN loan.product_mst d ON d.id = b.product_id
                            WHERE
                                a.customer_id= $4 
                                AND 
                                a.doptor_id =$1 
                                AND
                                a.project_id = $2 
                                AND a.samity_id =$3
                                AND a.is_disbursed = true 
                                AND b.account_status != 'CLS'
                                AND d.deposit_nature = 'L'
                            GROUP BY  a.sanction_limit,d.allow_percent,a.profit_amount,b.id`;
    const accountInfo = (
      await pool.query(accountInfoSql, [payload.doptorId, payload.projectId, payload.samityId, payload.data.customerId])
    ).rows as any;

    console.log("Account Info-----", accountInfo);

    if (accountInfo && accountInfo.length >= 1) {
      if (accountInfo?.length > 1) {
        throw new BadRequestError("একাধিক ঋণ চলমান রয়েছে");
      }

      let {
        sanction_limit: sanctionLimit,
        allow_percent: allowPercent,
        total_paid_amount: totalPaidAmount,
        profit_amount: profitAmount,
      } = accountInfo[0];

      sanctionLimit = +sanctionLimit;
      allowPercent = +allowPercent;
      profitAmount = +profitAmount;
      totalPaidAmount = +totalPaidAmount;
      let totalSanctionLimit = sanctionLimit + profitAmount;
      const barrierAmount = (totalSanctionLimit * allowPercent) / 100;

      if (totalPaidAmount < barrierAmount) {
        throw new BadRequestError(`পূর্ববর্তী লোন এর  ${numberToWord(allowPercent)}% অবশ্যই পরিশোধ থাকতে হবে`);
      }
    }
    return true;
  }

  async loanAmountChecking(payload: any) {
    const pool = db.getConnection("slave");
    const loanStatusSql = `SELECT last_loan_amount FROM samity.customer_info WHERE id = $1`;
    const allLoanStatus = (await pool.query(loanStatusSql, [payload.data.customerId])).rows[0].last_loan_amount;
    let loanStatus = allLoanStatus.filter((allLoanStatus: any) => allLoanStatus.productId == payload.data.productId);

    let noOfLoan;
    if (loanStatus[0]) {
      loanStatus = loanStatus.map((value: any) => value.noOfLoan);
      const maxLoanNo = Math.max(...loanStatus);
      noOfLoan = maxLoanNo;
    } else noOfLoan = 0;

    const loanPolicySql = `SELECT 
                  loan_no, 
                  min_amount, 
                  max_amount, 
                  deposit_percent, 
                  share_percent 
                FROM 
                  loan.product_sanction_policy 
                WHERE 
                  loan_no = $1 AND 
                  doptor_id = $2 AND 
                  project_id = $3 AND 
                  product_id = $4`;
    const loanPolicy = (
      await pool.query(loanPolicySql, [
        Number(noOfLoan) + 1,
        parseInt(payload.doptorId),
        parseInt(payload.projectId),
        parseInt(payload.data.productId),
      ])
    ).rows[0];

    if (!loanPolicy) throw new BadRequestError(`সদস্যের ঋণের কোনো পলিসি পাওয়া যায়নি`);
    else {
      if (parseInt(payload.data.loanAmount) < loanPolicy.min_amount)
        throw new BadRequestError(`সর্বনিম্ন ঋণের পরিমান  ${numberToWord(loanPolicy.min_amount)}`);
      else {
        if (parseInt(payload.data.loanAmount) > loanPolicy.max_amount)
          throw new BadRequestError(`সর্বোচ্চ ঋণের পরিমান ${numberToWord(loanPolicy.max_amount)}`);
        else return true;
      }
    }
  }

  async getCustomerLoanDetails(payload: any) {
    const pool = db.getConnection("slave");
    const cusDataSql = `SELECT name_bn, customer_code FROM samity.customer_info WHERE id = $1`;
    const cusData = (await pool.query(cusDataSql, [parseInt(payload.data.customerId)])).rows[0] as any;
    let repFrq = payload.data.frequency == "M" ? "মাসিক" : payload.data.frequency == "W" ? "সাপ্তাহিক" : "";
    const remarks = `সদস্যের নাম: ${cusData.name_bn} (${cusData.customer_code}),\n ঋণের পরিমাণ: ${parseInt(
      payload.data.loanAmount
    )} টাকা,\n ঋণের মেয়াদ: ${parseInt(payload.data.loanTerm)} মাস,\n সার্ভিস চার্জ: ${parseInt(
      payload.data.serviceCharge
    )} টাকা,\n কিস্তি আদায়ের সময়: ${repFrq},\n কিস্তির পরিমান: ${payload.data.installmentAmount} টাকা`;
    return remarks;
  }
}
