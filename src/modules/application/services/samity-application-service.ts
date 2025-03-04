import DataService from "../../master/services/master-data.service";
import Container, { Service } from "typedi";
import BadRequestError from "../../../errors/bad-request.error";
import lodash from "lodash";
import { PoolClient } from "pg";
import { toCamelKeys } from "keys-transform";
import { buildInsertSql, buildUpdateWithWhereSql } from "../../../utils/sql-builder.util";
import TransactionService from "../../transaction/services/transaction.service";
import moment from "moment-timezone";

@Service()
export class SamityApplicationService {
  constructor() {}
  //left digit padding
  async leftPadding(number: any, length: any) {
    var finalLength = length - number.toString().length;
    return (finalLength > 0 ? new Array(++finalLength).join("0") : "") + number;
  }
  async getDisCode(id: number, transaction: PoolClient) {
    let sql = `SELECT district_code FROM master.district_info
                   WHERE id = $1`;
    const result = await transaction.query(sql, [id]);
    return toCamelKeys(result.rows[0]);
  }
  async getUpaCode(id: number, type: string, transaction: PoolClient) {
    let sql = `SELECT upa_city_code FROM master.mv_upazila_city_info
    WHERE upa_city_id = $1 AND upa_city_type = $2`;
    const result = await transaction.query(sql, [id, type]);
    return toCamelKeys(result.rows[0]);
  }
  async generateSamityCode(
    doptorId: number,
    officeId: number,
    projectId: number,
    samityAllInfo: any,
    transaction: PoolClient
  ) {
    let doptor = doptorId;
    const disCode = (await this.getDisCode(samityAllInfo.basic.districtId, transaction)) as any;
    const upaCode = (await this.getUpaCode(
      samityAllInfo.basic.upaCityId,
      samityAllInfo.basic.upaCityType,
      transaction
    )) as any;
    let samityCode;

    //max samity id
    let sqlCounter = `SELECT COUNT(id) FROM samity.samity_info WHERE doptor_id = $1`;
    const resCounter = await transaction.query(sqlCounter, [doptor]);
    const getProjectCodeSql = `SELECT project_code FROM master.project_info WHERE id = $1`;
    const projectCode = (await transaction.query(getProjectCodeSql, [projectId])).rows[0]?.project_code;

    let code: number = resCounter.rows[0].count ? Number(resCounter.rows[0].count) + 1 : 0 + 1;

    let samityCodeSerial = await this.leftPadding(code, 3);
    let dist = await this.leftPadding(disCode.districtCode, 2);
    let upazila = await this.leftPadding(upaCode.upaCityCode, 2);
    //let project = await this.leftPadding(samityAllInfo.projectId, 2);
    if (doptor == 5) {
      const branchCodeSql = `SELECT branch_code FROM master.pdbf_branch_info WHERE office_id = $1`;
      const branchCode = (await transaction.query(branchCodeSql, [officeId])).rows[0].branch_code;
      if (!branchCode) throw new BadRequestError(`ব্রাঞ্চের কোড পাওয়া যায়নি`);
      else samityCode = branchCode.toString() + projectCode.toString() + samityCodeSerial.toString();
    } else {
      samityCode = dist.toString() + upazila.toString() + projectCode.toString() + samityCodeSerial.toString();
    }
    return samityCode;
  }
  async generateMemberCode(samityId: any, transaction: PoolClient) {
    //max customer id
    let sqlCus = `SELECT max(customer_code) FROM samity.customer_info WHERE samity_id = $1`;
    const resCus = await transaction.query(sqlCus, [samityId]);
    var customerCode: any = 0;

    if (resCus.rows[0].max) {
      customerCode = Number(resCus.rows[0].max);
      customerCode = customerCode + 1;
      let diff = resCus.rows[0].max.length - customerCode.toString().length;
      if (Math.abs(diff) == 1) customerCode = "0" + customerCode.toString();
    }
    return customerCode;
  }
  async getCustomerProducts(
    doptorId: number,
    projectId: number,
    depositNature: string,
    isKishori: boolean,
    transaction: PoolClient
  ): Promise<any> {
    let sql, productId;
    if (isKishori) {
      sql = `SELECT id FROM loan.product_mst WHERE doptor_id = $1 AND project_id = $2 AND 
      deposit_nature = $3 AND is_default_savings = true AND is_kishori_savings = $4`;
      productId = (await transaction.query(sql, [doptorId, projectId, depositNature, isKishori])).rows[0]?.id;
    } else {
      sql = `SELECT id FROM loan.product_mst WHERE doptor_id = $1 AND project_id = $2 AND 
      deposit_nature = $3 AND is_default_savings = true`;
      productId = (await transaction.query(sql, [doptorId, projectId, depositNature])).rows[0]?.id;
    }

    return productId ? productId : undefined;
  }
  async samityMembersApproval(
    userId: number,
    data: any,
    projectId: number,
    doptorId: number,
    officeId: number,
    client: PoolClient
  ) {
    data = data ? toCamelKeys(data) : data;
    let resMem;
    const glGetSql = `SELECT 
                        admission_fee, 
                        passbook_fee, 
                        admission_gl_id, 
                        passbook_gl_id, 
                        is_default_savings_product,
                        is_default_share_product
                      FROM 
                        master.project_info 
                      WHERE 
                        id = $1`;
    const glInfo = (await client.query(glGetSql, [projectId])).rows[0];

    const isDefaultSavingsProduct = glInfo?.is_default_savings_product;
    const isDefaultShareProduct = glInfo?.is_default_share_product;

    const admissionFeeGl = glInfo.admission_gl_id;
    const passbookFeeGl = glInfo.passbook_gl_id;
    // if (info?.userId && samityAllInfo?.userId && info.userId == samityAllInfo.userId)
    //   throw new BadRequestError(`সমিতি তৈরির আবেদনকারী, সমিতিটি অনুমোদন করতে পারবে না`);
    if (glInfo.admission_fee > 0 && !admissionFeeGl)
      throw new BadRequestError(`প্রদত্ত প্রকল্পের ভর্তি ফি জিএল পাওয়া যায়নি`);
    else if (glInfo.passbook_fee > 0 && !passbookFeeGl)
      throw new BadRequestError(`প্রদত্ত প্রকল্পের পাসবুক ফি জিএল পাওয়া যায়নি`);
    var result: any;
    const createInfo = {
      createdBy: userId,
      createdAt: new Date(),
    };

    const samityTypeSql = `SELECT samity_type FROM master.project_info WHERE id = $1`;
    const samityType = (await client.query(samityTypeSql, [projectId])).rows[0].samity_type[0];
    var samityCode;

    if (data.basic && data.setup) {
      data.basic.flag == 1
        ? (samityCode = data?.basic?.coopRegNumber)
        : (samityCode = await this.generateSamityCode(doptorId, officeId, projectId, data, client));
      const { sql, params } = buildInsertSql("samity.samity_info", {
        ...lodash.omit(data.basic, [
          "instituteName",
          "instituteAddress",
          "instituteCode",
          "foName",
          "foCode",
          "weekPosition",
          "workPlaceLat",
          "workPlaceLong",
          "workAreaRadius",
          "meetingDayName",
          "coopSamityId",
        ]),
        foUserId: data.basic.foCode,
        weekPosition: data.basic.meetingType == "M" && data.basic.weekPosition ? Number(data.basic.weekPosition) : null,
        ...data.setup,
        projectId: projectId,
        samityCode: samityCode?.toString(),
        doptorId: doptorId,
        officeId: officeId,
        coopStatus: data.basic.flag == 1 ? true : false,
        coopRegNumber: data.basic.flag == 1 ? data.basic.coopRegNumber : null,
        samityOldCode: data.basic.flag == 1 ? data.basic.coopRegNumber : null,
        formationDate: moment().format("DD/MM/YYYY"),
        ...createInfo,
        samityType: data.basic.samityType ? data.basic.samityType : samityType,
        authorizeStatus: "A",
        authorizedBy: userId,
        authorizedAt: new Date(),
      });
      result = await client.query(sql, params);

      //samity institution info
      if (data.basic.instituteCode && data.basic.instituteName && data.basic.instituteAddress) {
        const { sql: memberInstituteSql, params: memberInstituteParams } = buildInsertSql("samity.institution_info", {
          instituteCode: data.basic.instituteCode ? data.basic.instituteCode : null,
          instituteName: data.basic.instituteName ? data.basic.instituteName : null,
          instituteAddress: data.basic.instituteAddress ? data.basic.instituteAddress : null,
          samityId: result.rows[0].id,
          isActive: true,
          ...createInfo,
        });
        await client.query(memberInstituteSql, memberInstituteParams);
      }
    } else if (data.memberInfo[0].data.samityId) {
      let samitySql = `SELECT * FROM samity.samity_info WHERE id = $1`;
      result = await client.query(samitySql, [data.memberInfo[0].data.samityId]);
    }
    if (!result.rows) throw new BadRequestError("সমিতির তথ্য পাওয়া যায়নি");
    //add member info
    if (data.memberInfo[0]) {
      let codeSerial = 0;
      const transactionService: TransactionService = Container.get(TransactionService);

      const nextTranIdSql = `SELECT nextval('loan.transaction_daily_id_seq') tran_id`;

      const batchNum = await transactionService.generateBatchNumber(client);
      const transactionArray = [];
      let admissionFee: number = 0;
      let passbookFee: number = 0;
      for (const value of data.memberInfo) {
        let admissionGlTranId = (await client.query(nextTranIdSql)).rows[0].tran_id;
        let passbookGlTranId = (await client.query(nextTranIdSql)).rows[0].tran_id;
        //doc no validation
        for (let memberDoc of value.data.memberDocuments) {
          if (memberDoc.documentNumber) {
            const sql = `SELECT COUNT(*) FROM loan.document_info WHERE document_no = $1`;
            const count = (await client.query(sql, [memberDoc.documentNumber])).rows[0].count;

            if (count && Number(count) > 0)
              throw new BadRequestError(`প্রদত্ত ডকুমেন্ট নম্বর দিয়ে পূর্বে নিবন্ধন সম্পন্ন হয়েছে`);
          }
        }
        let cusCode: string = "";
        if (result.rows[0].flag == 1) cusCode = value.data.customerCode;
        else {
          let customerCode = await this.generateMemberCode(result.rows[0].id, client);
          if (customerCode != 0) cusCode = customerCode;
          else {
            const customerLastCode = await this.leftPadding(++codeSerial, 3);
            cusCode = result.rows[0].samity_code + "" + customerLastCode.toString();
          }
        }
        const address = value.address;
        const guardian = value.guardianInfo;
        const nominee = value.nominee;
        const cusData = {
          ...lodash.omit(value.data, [
            "id",
            "fatherNid",
            "motherNid",
            "docTypeId",
            "documentNo",
            "samityId",
            "admissionFee",
            "passbookFee",
            "memberDocuments",
            "samityLevel",
            "secondaryOccupation",
          ]),
        };
        var docData: any = {
          father: null,
          mother: null,
          own: [],
          memberPicture: null,
          memberSign: null,
          nominee: [],
          guardian: null,
        };

        const { sql: memberSql, params: memberParams } = buildInsertSql("samity.customer_info", {
          ...cusData,
          secondaryOccupation: value?.data?.secondaryOccupation ? value.data.secondaryOccupation : null,
          customerCode: cusCode,
          customerOldCode: result.rows[0].flag == 1 || result.rows[0].flag == 4 ? cusCode : null,
          samityId: result.rows[0].id,
          projectId: result.rows[0].project_id,
          doptorId: result.rows[0].doptor_id,
          officeId: result.rows[0].office_id,
          customerStatus: "ACT",
          registrationDate: moment().format("DD/MM/YYYY"),
          // numberOfLoan: JSON.stringify([{ noOfLoan: 0, productId: 0 }]),
          LastLoanAmount: JSON.stringify([]),
          authorizeStatus: "A",
          authorizedBy: userId,
          authorizedAt: new Date(),
          ...createInfo,
        });

        resMem = await client.query(memberSql, memberParams);
        let memberDefaultSavingsProduct, memberDefaultShareProduct;
        //create member account
        if (isDefaultSavingsProduct) {
          if (result.rows[0].project_id == 13 && result.rows[0].samity_type == "G") {
            memberDefaultSavingsProduct = await this.getCustomerProducts(
              result.rows[0].doptor_id,
              result.rows[0].project_id,
              "R",
              true,
              client
            );
          } else {
            memberDefaultSavingsProduct = await this.getCustomerProducts(
              result.rows[0].doptor_id,
              result.rows[0].project_id,
              "R",
              false,
              client
            );
          }
        }

        if (isDefaultShareProduct) {
          if (result.rows[0].project_id == 13 && result.rows[0].samity_type == "G") {
            memberDefaultShareProduct = await this.getCustomerProducts(
              result.rows[0].doptor_id,
              result.rows[0].project_id,
              "S",
              true,
              client
            );
          } else {
            memberDefaultShareProduct = await this.getCustomerProducts(
              result.rows[0].doptor_id,
              result.rows[0].project_id,
              "S",
              false,
              client
            );
          }
        }

        if (isDefaultSavingsProduct && !memberDefaultSavingsProduct)
          throw new BadRequestError(`ডিফল্ট সেভিংস প্রোডাক্ট এর তথ্য পাওয়া যায়নি`);
        if (isDefaultShareProduct && !memberDefaultShareProduct)
          throw new BadRequestError(`ডিফল্ট শেয়ার প্রোডাক্ট এর তথ্য পাওয়া যায়নি`);

        const accountPrefixSql = `Select account_prefix FROM loan.product_mst where id=$1`;

        if (memberDefaultSavingsProduct) {
          const accountPrefixInfo = (await client.query(accountPrefixSql, [memberDefaultSavingsProduct])).rows[0];
          if (!accountPrefixInfo || !accountPrefixInfo?.account_prefix)
            throw new BadRequestError(`প্রদত্ত প্রোডাক্টে অ্যাকাউন্ট প্রিফিক্স উল্লেখ নেই`);
          const { sql: memberSavingsAccountSql, params: memberSavingsAccountParams } = buildInsertSql(
            "loan.account_info",
            {
              samityId: result.rows[0].id,
              customerId: resMem.rows[0].id,
              doptorId: result.rows[0].doptor_id,
              projectId: result.rows[0].project_id,
              officeId: result.rows[0].office_id,
              productId: memberDefaultSavingsProduct,
              accountNo:
                resMem.rows[0].customer_code + accountPrefixInfo?.account_prefix
                  ? accountPrefixInfo.account_prefix
                  : "01",
              accountTitle: resMem.rows[0].name_bn,
              openDate: new Date(),
              withdrawInstruction: "T",
              accountStatus: "ACT",
              alltrn: "B",
              authorizeStatus: "P",
              ...createInfo,
            }
          );

          const resMemSavingsAccount: any = (await client.query(memberSavingsAccountSql, memberSavingsAccountParams))
            .rows[0];
          const { sql: savingsAccountBalSql, params: savingsAccountBalParams } = buildInsertSql(
            "loan.account_balance",
            {
              doptorId: result.rows[0].doptor_id,
              projectId: result.rows[0].project_id,
              officeId: result.rows[0].office_id,
              productId: memberDefaultSavingsProduct,
              accountId: resMemSavingsAccount.id,
              currentBalance: 0,
              blockAmt: 0,
              ...createInfo,
            }
          );
          await client.query(savingsAccountBalSql, savingsAccountBalParams);
        }
        if (memberDefaultShareProduct) {
          const accountPrefixInfo = (await client.query(accountPrefixSql, [memberDefaultShareProduct])).rows[0];
          if (!accountPrefixInfo || !accountPrefixInfo?.account_prefix)
            throw new BadRequestError(`প্রদত্ত প্রোডাক্টে অ্যাকাউন্ট প্রিফিক্স উল্লেখ নেই`);
          const { sql: memberShareAccountSql, params: memberShareAccountParams } = buildInsertSql("loan.account_info", {
            samityId: result.rows[0].id,
            customerId: resMem.rows[0].id,
            doptorId: result.rows[0].doptor_id,
            projectId: result.rows[0].project_id,
            officeId: result.rows[0].office_id,
            productId: memberDefaultShareProduct,
            accountNo:
              resMem.rows[0].customer_code + accountPrefixInfo?.account_prefix
                ? accountPrefixInfo.account_prefix
                : "02",
            accountTitle: resMem.rows[0].name_bn,
            withdrawInstruction: "T",
            openDate: new Date(),
            accountStatus: "ACT",
            alltrn: "B",
            intRate: null,
            currentBalance: 0,
            authorizeStatus: "P",
            ...createInfo,
          });

          const resMemShareAccount: any = (await client.query(memberShareAccountSql, memberShareAccountParams)).rows[0];
          const { sql: shareAccountBalSql, params: shareAccountBalParams } = buildInsertSql("loan.account_balance", {
            doptorId: result.rows[0].doptor_id,
            projectId: result.rows[0].project_id,
            officeId: result.rows[0].office_id,
            productId: memberDefaultShareProduct,
            accountId: resMemShareAccount.id,
            currentBalance: 0,
            blockAmt: 0,
            ...createInfo,
          });
          await client.query(shareAccountBalSql, shareAccountBalParams);
        }

        //customer's father and mother document info
        const docInfo = {
          refNo: resMem.rows[0].id,
          doptorId: result.rows[0].doptor_id,
          officeId: result.rows[0].office_id,
          projectId: result.rows[0].project_id,
          ...createInfo,
        };
        const dataService: DataService = Container.get(DataService);

        const nidDocTypeId = await dataService.getDocTypeId("NID", client);

        if (value.data.fatherNid) {
          docData.father = {
            documentNo: value.data.fatherNid,
            documentTypeId: nidDocTypeId,
            documentType: "NID",
            status: true,
          };
        }

        if (value.data.motherNid) {
          docData.mother = {
            documentNo: value.data.motherNid,
            documentTypeId: nidDocTypeId,
            documentType: "NID",
          };
        }

        //for present address
        if (value.address.pre) {
          const { sql: preAddressSql, params: preAddressParams } = buildInsertSql("master.address_info", {
            ...value.address.pre,
            addressTypeId: 1,
            refNo: resMem.rows[0].id,
            doptorId: result.rows[0].doptor_id,
            officeId: result.rows[0].office_id,
            projectId: result.rows[0].project_id,
            addressFor: "CUS",
            ...createInfo,
          });
          await client.query(preAddressSql, preAddressParams);
        }

        //for permanent address
        if (value.address.per) {
          const { sql: perAddressSql, params: perAddressParams } = buildInsertSql("master.address_info", {
            ...value.address.per,
            addressTypeId: 2,
            refNo: resMem.rows[0].id,
            doptorId: result.rows[0].doptor_id,
            officeId: result.rows[0].office_id,
            projectId: result.rows[0].project_id,
            addressFor: "CUS",
            ...createInfo,
          });
          await client.query(perAddressSql, perAddressParams);
        }

        //guardian data
        if (guardian?.relation || guardian?.occupation || guardian?.documentNo || guardian?.guardianName) {
          const tempGuardian = lodash.omit(guardian, ["documentNo"]);
          const { sql: memberGuardianSql, params: memberGuardianParams } = buildInsertSql("samity.guardian_info", {
            ...tempGuardian,
            refNo: resMem.rows[0].id,
            ...createInfo,
          });
          const resMemGuardian = await client.query(memberGuardianSql, memberGuardianParams);

          docData.guardian = {
            documentNo: guardian.documentNo,
            documentTypeId: nidDocTypeId,
            documentType: "NID",
            status: true,
          };
        }

        let buffer: any;
        let fileName: any;
        let mRes;
        //nominee data
        if (nominee && nominee[0]) {
          let nomineeDoc = {};
          for (const nomineeValue of nominee) {
            const finalNominee = lodash.omit(nomineeValue, [
              "docType",
              "docNumber",
              "nomineeSign",
              "nomineeSignType",
              "nomineePicture",
              "nomineePictureType",
              "birthDate",
            ]);
            const { sql: nomineeSql, params: nomineeParams } = buildInsertSql("samity.nominee_info", {
              ...finalNominee,
              customerId: resMem.rows[0].id,
              ...createInfo,
              dob: nomineeValue?.birthDate,
            });
            const resMemNominee = (await client.query(nomineeSql, nomineeParams)).rows[0];

            const nomineeDocType = await dataService.getDocTypeId(nomineeValue.docType.toString(), client);

            nomineeDoc = {
              ...nomineeDoc,
              documentNo: nomineeValue.docNumber,
              documentTypeId: nomineeDocType,
              documentType: nomineeValue.docType.toString(),
              nomineeId: resMemNominee.id,
              nomineePicture: nomineeValue.nomineePicture ? nomineeValue.nomineePicture : "",
              nomineeSign: nomineeValue.nomineeSign ? nomineeValue.nomineeSign : "",
            };
            docData.nominee.push(nomineeDoc);
          }
        }

        if (value.data.memberDocuments) {
          for (let memberDoc of value.data.memberDocuments) {
            const memberDocTypeId = await dataService.getDocTypeId(memberDoc.documentType.toString(), client);
            docData.own.push({
              documentTypeId: memberDocTypeId,
              documentType: memberDoc.documentType.toString(),
              documentNumber: memberDoc.documentNumber ? memberDoc.documentNumber : null,
              documentFront: memberDoc.documentFront ? memberDoc.documentFront : "",
              documentBack: memberDoc.documentBack ? memberDoc.documentBack : "",
              status: true,
            });
          }
        }

        if (value.memberPicture) docData.memberPicture = value.memberPicture;
        else docData.memberPicture = "";

        if (value.memberSign) docData.memberSign = value.memberSign;
        else docData.memberSign = "";

        const { sql: docSql, params: docParams } = buildInsertSql("loan.document_info", {
          documentData: docData,
          refNo: resMem.rows[0].id,
          doptorId: result.rows[0].doptor_id,
          officeId: result.rows[0].office_id,
          projectId: result.rows[0].project_id,
          ...createInfo,
        });
        client.query(docSql, docParams);

        //admission fee and passbook fee transaction
        if (
          (value?.data?.admissionFee && Number(value.data.admissionFee) > 0) ||
          (value?.data?.passbookFee && Number(value.data.passbookFee) > 0)
        ) {
          admissionFee += Number(value.data.admissionFee);
          passbookFee += Number(value.data.passbookFee);
          //Admission Fee in CashInHandGl

          if (Number(value.data.admissionFee) > 0) {
            const { sql: admissionCashSql, params: admissionCashParams } = buildInsertSql("loan.customer_fee", {
              doptorId: doptorId,
              officeId: officeId,
              projectId: projectId,
              customerId: resMem.rows[0].id,
              fee_type: "admission",
              tranId: admissionGlTranId,
              tranAmt: value.data.admissionFee,
              tranDate: new Date(),
              ...createInfo,
            });
            client.query(admissionCashSql, admissionCashParams);
          }

          if (Number(value.data.passbookFee) > 0) {
            const { sql: passbookCashSql, params: passbookCashParams } = buildInsertSql("loan.customer_fee", {
              doptorId: doptorId,
              officeId: officeId,
              projectId: projectId,
              customerId: resMem.rows[0].id,
              fee_type: "passbook",
              tranId: passbookGlTranId,
              tranAmt: value.data.passbookFee,
              tranDate: new Date(),
              ...createInfo,
            });
            client.query(passbookCashSql, passbookCashParams);
          }
          const totalFee = Number(admissionFee) + Number(passbookFee);
          const tranNum = await transactionService.generateTransactionNumber(client);
          const cashInHandSql = `SELECT 
                                  id 
                                FROM 
                                  loan.glac_mst 
                                WHERE 
                                  doptor_id = $1 
                                  AND parent_child = 'C' 
                                  AND is_cash_in_hand = true`;
          const cashInHandGl = (await client.query(cashInHandSql, [doptorId])).rows[0]?.id;
          if (!cashInHandGl) throw new BadRequestError(`প্রদত্ত দপ্তরের হাতে নগদ জিএল পাওয়া যায়নি`);
          if (admissionFee > 0) {
            transactionArray.push({
              id: admissionGlTranId,
              naration: `Admission fee collected from ${resMem?.rows[0].name_en} (${resMem?.rows[0].customer_code})`,
              drcrCode: "C",
              glacId: admissionFeeGl,
              tranAmt: admissionFee,
              batchNum,
              tranNum,
              tranCode: "ADF",
              tranType: "CASH",
              projectId: result.rows[0].project_id,
            });
          }

          if (passbookFee > 0) {
            transactionArray.push({
              id: passbookGlTranId,
              naration: `Passbook fee collected from ${resMem?.rows[0].name_en} (${resMem?.rows[0].customer_code})`,
              drcrCode: "C",
              glacId: passbookFeeGl,
              tranAmt: passbookFee,
              batchNum,
              tranNum,
              tranCode: "PBF",
              tranType: "CASH",
              projectId: result.rows[0].project_id,
            });
          }
          if (totalFee > 0) {
            transactionArray.push({
              naration: `Total Fee (Cash) collected from ${result.rows[0].samity_name} (${result.rows[0].samity_code})`,
              drcrCode: "D",
              glacId: cashInHandGl,
              tranAmt: totalFee,
              batchNum,
              tranNum,
              tranCode: "FEE",
              tranType: "CASH",
              projectId: result.rows[0].project_id,
            });
          }
        }
      }
      if (transactionArray.length > 0) {
        const allTransactions = await transactionService.generalTransactionEngine(
          doptorId,
          officeId,
          result.rows[0].project_id,
          userId,
          null,
          transactionArray,
          client
        );
      }
    }
  }
  async manualMemberUpdate(userId: number, data: any, client: PoolClient) {
    data = data ? toCamelKeys(data) : data;
    const updateInfo = {
      updatedBy: userId,
      updatedAt: new Date(),
    };

    const nominee = data.nominee;
    const cusData = {
      ...lodash.omit(data.data, [
        "memberId",
        "fatherNid",
        "motherNid",
        "docTypeId",
        "documentNo",
        "samityId",
        "admissionFee",
        "passbookFee",
        "memberDocuments",
        "samityLevel",
      ]),
    };

    const { sql: memberSql, params: memberParams } = buildUpdateWithWhereSql(
      "samity.customer_info",
      { id: data.data.memberId },
      {
        ...cusData,
        ...updateInfo,
      }
    );
    const resMem = (await client.query(memberSql, memberParams)).rows[0];
    //customer's father and mother document info
    const dataService: DataService = Container.get(DataService);

    let sqlDoc: string = `SELECT document_data FROM loan.document_info a WHERE a.ref_no = $1`;
    let documentData = await (await client.query(sqlDoc, [data.data.memberId])).rows[0].document_data;
    documentData = documentData ? toCamelKeys(documentData) : {};
    const nidDocTypeId = await dataService.getDocTypeId("NID", client);

    if (data.data.fatherNid) {
      documentData.father.documentNo = data.data.fatherNid;
    }

    if (data.data.motherNid) {
      documentData.mother.documentNo = data.data.motherNid;
    }

    //for present address
    if (data.address.pre) {
      const { sql: preAddressSql, params: preAddressParams } = buildUpdateWithWhereSql(
        "master.address_info",
        {
          addressTypeId: 1,
          refNo: data.data.memberId,
        },
        {
          ...data.address.pre,
          ...updateInfo,
        }
      );
      client.query(preAddressSql, preAddressParams);
    }

    //for permanent address
    if (data.address.per) {
      const { sql: perAddressSql, params: perAddressParams } = buildUpdateWithWhereSql(
        "master.address_info",
        {
          addressTypeId: 2,
          refNo: data.data.memberId,
        },
        {
          ...data.address.per,
          ...updateInfo,
        }
      );
      client.query(perAddressSql, perAddressParams);
    }

    //guardian data
    if (
      data?.guardianInfo?.relation ||
      data?.guardianInfo?.occupation ||
      data?.guardianInfo?.documentNo ||
      data?.guardianInfo?.guardianName
    ) {
      const memberGuardianCountSql = `SELECT COUNT(*) FROM samity.guardian_info WHERE ref_no = $1`;
      const memberGuardianCount = (await client.query(memberGuardianCountSql, [data.data.memberId])).rows[0].count;

      if (memberGuardianCount <= 0) {
        const tempGuardian = lodash.omit(data.guardianInfo, ["documentNo"]);
        const { sql: memberGuardianSql, params: memberGuardianParams } = buildInsertSql("samity.guardian_info", {
          ...tempGuardian,
          refNo: data.data.memberId,
          createdBy: userId,
          createdAt: new Date(),
        });
        const resMemGuardian = await client.query(memberGuardianSql, memberGuardianParams);
        documentData.guardian = {
          documentTypeId: nidDocTypeId,
          documentType: "NID",
          documentNo: data.guardianInfo.documentNo,
        };
      } else {
        const tempGuardian = lodash.omit(data.guardianInfo, ["documentNo"]);
        const { sql: memberGuardianSql, params: memberGuardianParams } = buildUpdateWithWhereSql(
          "samity.guardian_info",
          { refNo: data.data.memberId },
          {
            ...tempGuardian,
            ...updateInfo,
          }
        );
        const guardianEditRes = await client.query(memberGuardianSql, memberGuardianParams);

        documentData.guardian.documentNo = data.guardianInfo.documentNo;
      }
    }

    //nominee data
    if (nominee && nominee[0]) {
      for (const nomineeValue of nominee) {
        if (
          nomineeValue.id &&
          ((nomineeValue.docType && nomineeValue.docType != " ") ||
            (nomineeValue.relation && nomineeValue.relation != " ") ||
            (nomineeValue.docNumber && nomineeValue.docNumber != " ") ||
            (nomineeValue.percentage && nomineeValue.percentage != " ") ||
            (nomineeValue.nomineeName && nomineeValue.nomineeName != " ") ||
            (nomineeValue.nomineeSign && nomineeValue.nomineeSign != " ") ||
            (nomineeValue.nomineePicture && nomineeValue.nomineePicture != " "))
        ) {
          let finalNominee = lodash.omit(nomineeValue, [
            "docType",
            "docNumber",
            "nomineeSign",
            "nomineeSignType",
            "nomineePicture",
            "nomineePictureType",
            "birthDate",
          ]);

          const { sql: nomineeSql, params: nomineeParams } = buildUpdateWithWhereSql(
            "samity.nominee_info",
            { id: nomineeValue.id },
            {
              ...finalNominee,
              ...updateInfo,
              dob: nomineeValue?.birthDate,
            }
          );
          const resMemNominee = (await client.query(nomineeSql, nomineeParams)).rows[0];

          let nomineeDocIndex = documentData.nominee.findIndex((value: any) => value.nomineeId == nomineeValue.id);

          documentData.nominee[nomineeDocIndex].docType = nomineeValue.docType;
          documentData.nominee[nomineeDocIndex].docType = await dataService.getDocTypeId(
            nomineeValue.docType.toString(),
            client
          );
          documentData.nominee[nomineeDocIndex].documentNo = nomineeValue.docNumber;

          documentData.nominee[nomineeDocIndex].nomineePicture = nomineeValue.nomineePicture;

          documentData.nominee[nomineeDocIndex].nomineeSign = nomineeValue.nomineeSign;
        } else if (
          nomineeValue.docType &&
          nomineeValue.docType != " " &&
          nomineeValue.relation &&
          nomineeValue.relation != " " &&
          nomineeValue.docNumber &&
          nomineeValue.docNumber != " " &&
          nomineeValue.percentage &&
          nomineeValue.percentage != " " &&
          nomineeValue.nomineeName &&
          nomineeValue.nomineeName != " " &&
          ((nomineeValue.nomineeSign && nomineeValue.nomineeSign != " ") ||
            (nomineeValue.nomineePicture && nomineeValue.nomineePicture != " "))
        ) {
          let finalNominee = lodash.omit(nomineeValue, [
            "docType",
            "docNumber",
            "nomineeSign",
            "nomineeSignType",
            "nomineePicture",
            "nomineePictureType",
            "birthDate",
          ]);

          const { sql: nomineeSql, params: nomineeParams } = buildInsertSql("samity.nominee_info", {
            ...finalNominee,
            customerId: data.data.memberId,
            createdBy: userId,
            createdAt: new Date(),
            dob: nomineeValue?.birthDate,
          });
          const resMemNominee = (await client.query(nomineeSql, nomineeParams)).rows[0];
          let nomineeDoc = {};

          const nomineeDocType = await dataService.getDocTypeId(nomineeValue.docType.toString(), client);
          nomineeDoc = {
            ...nomineeDoc,
            documentNo: nomineeValue.docNumber,
            documentTypeId: nomineeDocType,
            documentType: nomineeValue.docType.toString(),
            nomineeId: resMemNominee.id,
          };

          nomineeDoc = { ...nomineeDoc, nomineePicture: nomineeValue.nomineePicture };
          nomineeDoc = { ...nomineeDoc, nomineeSign: nomineeValue.nomineeSign };

          documentData.nominee.push(nomineeDoc);
        }
      }
    }

    if (data.removedNomineeId && data.removedNomineeId[0]) {
      for (let nomineeId of data.removedNomineeId) {
        const { sql: nomineeDelSql, params: nomineeDelParams } = buildUpdateWithWhereSql(
          "samity.nominee_info",
          { id: nomineeId },
          {
            isActive: false,
            ...updateInfo,
          }
        );
        const resMemNominee = (await client.query(nomineeDelSql, nomineeDelParams)).rows[0];

        let removeNomineeDocIndex = documentData.nominee.findIndex((value: any) => value.nomineeId == nomineeId);
        documentData.nominee.splice(removeNomineeDocIndex, 1);
      }
    }

    if (data.data.memberDocuments) {
      for (let memberDoc of data.data.memberDocuments) {
        let memberDocIndex = documentData.own.findIndex((value: any) => value.documentType == memberDoc.documentType);

        if (memberDocIndex != -1) {
          documentData.own[memberDocIndex].documentNumber = memberDoc.documentNumber;
          documentData.own[memberDocIndex].documentFront = memberDoc.documentFront;
          documentData.own[memberDocIndex].documentBack = memberDoc.documentBack;
        } else {
          let documentFront = "";
          let documentBack = "";

          documentFront = memberDoc.documentFront;
          documentBack = memberDoc.documentBack;

          const memberDocTypeId = await dataService.getDocTypeId(memberDoc.documentType.toString(), client);
          documentData.own.push({
            documentTypeId: memberDocTypeId,
            documentType: memberDoc.documentType.toString(),
            documentNumber: memberDoc.documentNumber ? memberDoc.documentNumber : null,
            documentFront: documentFront ? documentFront : "",
            documentBack: documentBack ? documentBack : "",
            status: true,
          });
        }
      }
    }

    documentData.memberPicture = data.memberPicture;
    documentData.memberSign = data.memberSign;

    const { sql: memberDocumentsUpdateSql, params: memberDocumentsUpdateParams } = buildUpdateWithWhereSql(
      "loan.document_info",
      { refNo: data.data.memberId },
      { documentData, ...updateInfo }
    );
    await client.query(memberDocumentsUpdateSql, memberDocumentsUpdateParams);

    return resMem ? toCamelKeys(resMem) : {};
  }
  async samityUpdateApproval(data: any, samityId: number, client: PoolClient) {
    data = data ? toCamelKeys(data) : data;
    const { sql: samityUpdateSql, params: samityUpdateParams } = buildUpdateWithWhereSql(
      "samity.samity_info",
      { id: samityId },
      {
        ...lodash.omit(data, ["userId", "userType"]),
      }
    );
    const result = (await client.query(samityUpdateSql, samityUpdateParams)).rows[0];
    return result ? toCamelKeys(result) : {};
  }
  async mainSamityMembersApproval(
    userId: number,
    applicationData: any,
    projectId: number,
    doptorId: number,
    officeId: number,
    transaction: PoolClient
  ) {
    let createResponse: any;
    let updateResponse: any;
    applicationData = applicationData ? toCamelKeys(applicationData) : applicationData;

    for (let [memberIndex, singleMemberInfo] of applicationData.memberInfo.entries()) {
      if (singleMemberInfo.memberType == "new") {
        createResponse = await this.samityMembersApproval(
          userId,
          { memberInfo: [singleMemberInfo] },
          projectId,
          doptorId,
          applicationData.data.officeId,
          transaction
        );
      } else if (singleMemberInfo.memberType == "update") {
        updateResponse = await this.manualMemberUpdate(userId, singleMemberInfo, transaction);
      } else {
        throw new BadRequestError(`সেবাটির কর্মকান্ডের জন্য সদস্যের ধরণ পাওয়া যায়নি`);
      }
    }

    return {
      createResponse: createResponse ? toCamelKeys(createResponse) : {},
      updateResponse: updateResponse ? toCamelKeys(updateResponse) : {},
    };
  }
  async memberDocumentsValidate(memberInfo: any, doptorId: number) {
    const masterDataService: DataService = Container.get(DataService);

    //members payload docs
    let memberDocs;
    let projectId;
    if (Array.isArray(memberInfo)) {
      memberDocs = memberInfo.map((value: any) => value.data.memberDocuments);
      projectId = memberInfo[0].data.projectId;
    }
    //all docs from db
    let documents = (await masterDataService.getServiceWiseDocs(doptorId, projectId, 14)) as any;
    if (!documents.memberDocs) throw new BadRequestError(`সদস্য ভর্তির প্রয়োজনীয় ডকুমেন্টের তথ্য পাওয়া যায়নি`);

    //all mandatory docs
    let mandatoryDocs = documents.memberDocs.filter((value: any) => value.isMandatory == true);

    //members payload doc types
    const mandatoryDocTypes = mandatoryDocs.map((value: any) => value.docType);

    let err = null;
    if (memberDocs) {
      for (let singleMemberDoc of memberDocs) {
        //document mandatory checking
        let singleMemberDocTypes = singleMemberDoc.map((value: any) => value.documentType);

        //duplicate docs checking
        let duplicateDocTypes = singleMemberDocTypes.filter(
          (item: any, index: number) => singleMemberDocTypes.indexOf(item) != index
        );

        let uniqueDuplicateDocTypes = [...new Set(duplicateDocTypes)];
        let singleUniqueDocType = documents.memberDocs.filter(
          (value: any) => value.docType == uniqueDuplicateDocTypes[0]
        );
        if (uniqueDuplicateDocTypes[0] && singleUniqueDocType[0]) {
          err = `${singleUniqueDocType[0].docTypeDesc} দুইবার প্রদান করা যাবে না`;
          throw new BadRequestError(err);
        }

        let mandatoryDocCheck = mandatoryDocTypes.every((v: any) => singleMemberDocTypes.includes(v));

        //document no mandatory checking
        if (!mandatoryDocCheck) {
          let missinGDocType = mandatoryDocTypes.filter((value: any) => !singleMemberDocTypes.includes(value));
          let missinGDocMsg = documents.memberDocs.filter((value: any) => value.docType == missinGDocType[0]);
          err = `সদস্যের ${missinGDocMsg[0].docTypeDesc} দেওয়া আবশ্যক`;
          throw new BadRequestError(err);
        }
        for (let singleDoc of singleMemberDoc) {
          let mainDoc = documents.memberDocs.filter((value: any) => value.docType == singleDoc.documentType);
          if (mainDoc[0] && mainDoc[0].isDocNoMandatory) {
            if (!singleDoc.documentNumber) {
              err = `সদস্যের ${mainDoc[0].docTypeDesc} এর নম্বর দেওয়া আবশ্যক`;
              throw new BadRequestError(err);
            }

            //document no length checking
            if (!mainDoc[0].docNoLength.includes(String(singleDoc.documentNumber).length)) {
              err = `সদস্যের ${mainDoc[0].docTypeDesc} নম্বর অবশ্যই ${mainDoc[0].docNoLength} ডিজিটের হতে হবে`;
              throw new BadRequestError(err);
            }
          }
        }
      }
    }
  }
}
