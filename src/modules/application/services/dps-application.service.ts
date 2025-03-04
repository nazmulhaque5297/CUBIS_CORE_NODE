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
import { minioPresignedGet, uploadObject as upload } from "../../../utils/minio.util";

@Service()
export class DpsApplicationServices {
  constructor() {}
  async dpsApplicationCreate(payload: any, pool: Pool) {
    let buffer, fileName, mRes;
    const checkRepeatedApplicationInfoSql = `SELECT count (id)
   FROM temps.application
  WHERE service_id = $1 AND status <> 'A' AND ( data ->>'customer_id') = $2`;

    const checkRepeatedApplicationInfo = (
      await pool.query(checkRepeatedApplicationInfoSql, [payload.serviceId, payload.data.customerId])
    ).rows[0];

    if (checkRepeatedApplicationInfo && checkRepeatedApplicationInfo?.count > 0)
      throw new BadRequestError(`প্রদত্ত সদস্যের একটি আবেদন আনুমদনের জন্য অপেক্ষমাণ আছে`);
    /////////////////////////////////////////////////////////
    for (let [index, memberDoc] of payload.data.documentInfo.entries()) {
      if (memberDoc.documentFront && memberDoc.documentFrontType) {
        buffer = Buffer.from(memberDoc.documentFront, "base64");
        if (buffer) {
          fileName = `member-dps-${new Date().getTime()}.${String(memberDoc.documentFrontType).split("/")[1]}`;
          mRes = await upload({
            fileName: fileName,
            buffer: buffer,
          });
        }

        if (mRes) {
          payload.data.documentInfo[index].documentFront = fileName;
        }
      }
      if (memberDoc.documentBack && memberDoc.documentBackType) {
        buffer = Buffer.from(memberDoc.documentBack, "base64");
        if (buffer) {
          fileName = `member-dps-${new Date().getTime()}.${String(memberDoc.documentBackType).split("/")[1]}`;
          mRes = await upload({
            fileName: fileName,
            buffer: buffer,
          });
        }
        if (mRes) {
          payload.data.documentInfo[index].documentBack = fileName;
        }
      }
    }

    for (const [nomineeIndex, nomineeValue] of payload.data.nomineeInfo.entries()) {
      if (nomineeValue.nomineePicture && nomineeValue.nomineePictureType) {
        buffer = Buffer.from(nomineeValue.nomineePicture, "base64");
        if (buffer) {
          fileName = `nominee-${new Date().getTime()}.${String(nomineeValue.nomineePictureType).split("/")[1]}`;
          mRes = await upload({
            fileName: fileName,
            buffer: buffer,
          });
        }
        if (mRes) {
          nomineeValue.nomineePicture = fileName;
        }
      }
      if (nomineeValue.nomineeSign && nomineeValue.nomineeSignType) {
        buffer = Buffer.from(nomineeValue.nomineeSign, "base64");
        if (buffer) {
          fileName = `nominee-${new Date().getTime()}..${String(nomineeValue.nomineeSignType).split("/")[1]}`;
          mRes = await upload({
            fileName: fileName,
            buffer: buffer,
          });
        }
        if (mRes) {
          nomineeValue.nomineeSign = fileName;
        }
      }
      payload.data.nomineeInfo[nomineeIndex] = nomineeValue;
    }
    let { sql, params } = buildInsertSql("temps.application", {
      ...lodash.omit(payload, ["officeId", "serviceName"]),
    });
    let result = await (await pool.query(sql, params)).rows[0];
    return result ? toCamelKeys(result) : {};
  }

  async dpsApplicationInfo(id: number, type: string, componentId: number, pool: Pool) {
    const dpsBasicInfoSql = `SELECT 
                                a.project_id, 
                                a.service_id, 
                                a.data, 
                                a.doptor_id, 
                                b.project_name_bangla, 
                                c.samity_name, 
                                d.product_name, 
                                e.name_bn customer_name
                            FROM 
                                temps.application a 
                                INNER JOIN master.project_info b ON b.id = a.project_id 
                                INNER JOIN samity.samity_info c ON c.id = a.samity_id 
                                INNER JOIN loan.product_mst d ON d.id = CAST(a.data ->> 'product_id' as integer) 
                                INNER JOIN samity.customer_info e ON e.id = CAST(
                                    a.data ->> 'customer_id' as integer
                                ) 
                            WHERE 
                                a.id = $1 and a.component_id =$2`;

    const dpsNomineeInfoSql = `SELECT 
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

    let basicInfo = (await pool.query(dpsBasicInfoSql, [id, componentId])).rows[0];
    basicInfo = toCamelKeys(basicInfo);

    const docTypeNameSql = `SELECT doc_type_desc FROM master.document_type WHERE doc_type = $1`;
    basicInfo.data.documentInfo.map(async (doc: any, index: number) => {
      const docTypeName = (await pool.query(docTypeNameSql, [doc.documentType])).rows[0].doc_type_desc;
      basicInfo.data.documentInfo[index] = { ...doc, docTypeName };
    });
    let nomineeInfo = (await pool.query(dpsNomineeInfoSql, [id, componentId])).rows[0];

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
      "document_info.[].document_front",
      "document_info.[].document_back",
      "nominee_info.[].nominee_picture",
      "nominee_info.[].nominee_sign",
    ]);
    const finalInfo = {
      type: type,
      applicationInfo: {
        ...applicationInfoWithUrl,
        applicationId: id,
        serviceId: basicInfo.serviceId,
      },
      history: await applicationService.getAppHistory(id, pool),
    };
    return finalInfo ? toCamelKeys(finalInfo) : {};
  }

  async leftPadding(number: any, length: any) {
    var len = length - ("" + number).length;
    return (len > 0 ? new Array(++len).join("0") : "") + number;
  }

  async dpsApplicationApproval(
    applicationData: any,
    doptorId: number,
    officeId: number,
    userId: number,
    applicationId: number,
    client: PoolClient
  ) {
    applicationData = applicationData ? toCamelKeys(applicationData) : {};
    const sql = `select count (*) FROM loan.account_info WHERE samity_id = $1 AND customer_id = $2 AND project_id =$3 AND product_id =$4`;
    let dpsAccSerial = await (
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
    dpsAccSerial = Number(dpsAccSerial) + 1;
    dpsAccSerial = await this.leftPadding(dpsAccSerial, 2);

    const { sql: accountInfoSql, params: accountInfoParams } = buildInsertSql("loan.account_info", {
      samityId: applicationData.samityId,
      customerId: applicationData.customerId,
      doptorId: doptorId,
      projectId: applicationData.projectId,
      officeId: officeId,
      productId: applicationData.productId,
      accountNo: customerInfo.data[0].customerCode.toString() + dpsAccSerial,
      accountTitle: customerInfo.data[0].nameBn,
      openDate: new Date(),
      accountStatus: "ACT",
      alltrn: "C",
      authorizeStatus: "A",
      withdrawInstruction: "N",
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
      accountId: accountInfoRes.id,
      currentBalance: 0,
      blockAmt: 0,
      createdBy: userId,
      createdAt: new Date(),
    });
    const accountBalanceRes = (await client.query(accountBalanceSql, accountBalanceParams)).rows[0];

    const installmentInfoSql = `SELECT ins_start_day , ins_end_day FROM loan.product_mst WHERE id = $1`;
    const installmentInfo = (await client.query(installmentInfoSql, [applicationData.productId])).rows[0];
    let nextDate;
    if (applicationData.installmentFrequency == "M") {
      nextDate = moment(new Date());
    } else if (applicationData.installmentFrequency == "W") {
      nextDate = moment(new Date()).add(7, "d");
    }

    const { sql: timeDpsMstSql, params: timeDpsMstParams } = buildInsertSql("loan.time_deposit_mst", {
      doptorId: doptorId,
      officeId: officeId,
      productId: applicationData.productId,
      applicationId,
      accountId: accountInfoRes.id,
      effDate: new Date(),
      expDate: applicationData.maturityDate,
      depositAmt: applicationData.installmentAmount,
      insFrq: applicationData.installmentFrequency,
      intRate: Number(applicationData.intRate),
      totalIns: applicationData.time,
      paidIns: 0,
      insStartDate: new Date(),
      lastInsPaidDate: null,
      nextInsStartDate: moment(nextDate).date(installmentInfo.ins_start_day).format("DD/MM/YYYY"),
      nextInsEndDate: moment(nextDate).date(installmentInfo.ins_end_day).format("DD/MM/YYYY"),
      timePeriod: applicationData.time,
      timeFrq: applicationData.installmentFrequency,
      maturityDate: applicationData.maturityDate,
      maturityAmount: applicationData.maturityAmount,
      createdBy: userId,
      createdAt: new Date(),
    });
    const timeDpsRes = (await client.query(timeDpsMstSql, timeDpsMstParams)).rows[0];
    const memberDocsSql = `SELECT document_data FROM loan.document_info WHERE ref_no = $1`;
    let memberDocs = (await client.query(memberDocsSql, [applicationData.customerId])).rows[0]?.document_data;
    memberDocs = memberDocs ? toCamelKeys(memberDocs) : {};
    if (memberDocs?.dps && memberDocs?.dps[0]) memberDocs.dps = [...memberDocs.dps];
    else memberDocs.dps = [];
    let dpsDocs = [];
    for (const value of applicationData.documentInfo) {
      const dataService: DataService = Container.get(DataService);
      const docTypeId = await dataService.getDocTypeId(value.documentType.toString(), client);
      dpsDocs.push({
        documentTypeId: docTypeId,
        documentType: value.documentType.toString(),
        documentNumber: value.documentNumber ? value.documentNumber : null,
        documentFront: value.documentPictureFront,
        documentBack: value.documentPictureBack,
        status: true,
      });
    }
    memberDocs.dps.push({
      applicationId,
      documents: dpsDocs,
    });
    for (const nomineeValue of applicationData.nomineeInfo) {
      const finalNominee = lodash.omit(nomineeValue, [
        "docType",
        "docNumber",
        "nomineeSign",
        "nomineeSignType",
        "nomineePicture",
        "nomineePictureType",
      ]);
      const { sql: nomineeSql, params: nomineeParams } = buildInsertSql("samity.nominee_info", {
        ...finalNominee,
        accountId: accountInfoRes.id,
        customerId: applicationData.customerId,
        createdBy: userId,
      });
      const resMemNominee = (await client.query(nomineeSql, nomineeParams)).rows[0];
      const dataService: DataService = Container.get(DataService);
      const nomineeDocType = await dataService.getDocTypeId(nomineeValue.docType.toString(), client);
      if (memberDocs?.nominee && memberDocs?.nominee[0]) memberDocs.nominee = [...memberDocs.nominee];
      else memberDocs.nominee = [];
      let nomineeDoc = {
        documentNo: nomineeValue.docNumber,
        documentTypeId: nomineeDocType,
        documentType: nomineeValue.docType.toString(),
        nomineeId: resMemNominee.id,
        nomineePicture: nomineeValue.nomineePicture ? nomineeValue.nomineePicture : "",
        nomineeSign: nomineeValue.nomineeSign ? nomineeValue.nomineeSign : "",
        accountId: accountInfoRes.id,
      };
      memberDocs.nominee.push(nomineeDoc);
    }
    const { sql: memberDocumentsUpdateSql, params: memberDocumentsUpdateParams } = buildUpdateWithWhereSql(
      "loan.document_info",
      { refNo: applicationData.customerId },
      { documentData: memberDocs }
    );
    await client.query(memberDocumentsUpdateSql, memberDocumentsUpdateParams);
  }

  async dpsApplicationCloseInfo(applicationId: number, type: string, componentId: number, pool: Pool) {
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
    const dpsBasicInfoSql = `SELECT 
                                a.total_ins, 
                                a.paid_ins,
                                a.maturity_date,
                                b.account_no,
                                c.current_balance,
                                d.samity_name,
                                e.name_bn,
                                e.father_name,
                                f.document_data ->>'member_picture' member_picture,
                                g.project_name_bangla,
                                h.product_name
                              FROM 
                                loan.time_deposit_mst a 
                                INNER JOIN loan.account_info b ON a.account_id = b.id 
                                INNER JOIN loan.account_balance c ON b.id = c.account_id 
                                INNER JOIN samity.samity_info d ON d.id = b.samity_id
                                INNER JOIN samity.customer_info e ON e.id = b.customer_id 
                                INNER JOIN loan.document_info f ON f.ref_no = e.id
                                INNER JOIN master.project_info g ON g.id = d.project_id
                                INNER JOIN loan.product_mst h ON h.id = b.product_id
                              
                              WHERE 
                                a.account_id = $1
                                AND e.id =$2
                                AND b.account_status = 'ACT'`;
    let basicInfo = (await pool.query(dpsBasicInfoSql, [appInfo.data.customerAcc, appInfo.data.customerId])).rows[0];

    basicInfo = basicInfo ? await minioPresignedGet(basicInfo, ["member_picture"]) : basicInfo;
    const applicationService: ApplicationServices = Container.get(ApplicationServices);

    const finalInfo = {
      type: type,
      applicationInfo: {
        applicationId,
        serviceId: appInfo.serviceId,
        ...basicInfo,
        unpaidInsNumber: appInfo.data.unpaidInsNumber,
        maturityAmount: appInfo.data.maturityAmount,
      },
      history: await applicationService.getAppHistory(applicationId, pool),
    };
    return finalInfo ? toCamelKeys(finalInfo) : {};
  }
}
