import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { getFileName } from "../../../../utils/file.util";
import { uploadObject } from "../../../../utils/minio.util";

@Service()
export class FeeCollectionServices {
  constructor() {}

  async getFeeCollection(samityId: number, startDate: any, endDate: any) {
    const sql = `SELECT 
    SUM(CASE WHEN drcr_code = 'C' THEN coalesce(tran_amount, 0) ELSE 0 END) AS cr_amount,
      SUM(CASE WHEN drcr_code = 'D' THEN coalesce(tran_amount, 0) ELSE 0 END) AS dr_amount,
      SUM(CASE WHEN drcr_code = 'C' THEN coalesce(tran_amount, 0) ELSE 0 END)-SUM(CASE WHEN drcr_code = 'D' THEN coalesce(tran_amount, 0) ELSE 0 END) AS profit,
    ceil((SUM(CASE WHEN drcr_code = 'C' THEN coalesce(tran_amount, 0) ELSE 0 END)-
       SUM(CASE WHEN drcr_code = 'D' THEN coalesce(tran_amount, 0) ELSE 0 END))/100)*10 AS audit_fee,
    ceil((SUM(CASE WHEN drcr_code = 'C' THEN coalesce(tran_amount, 0) ELSE 0 END)-
       SUM(CASE WHEN drcr_code = 'D' THEN coalesce(tran_amount, 0) ELSE 0 END))/100)*3 AS cdf_fee
    FROM coop.gl_transaction
  WHERE samity_id= $1 and DATE(tran_date) BETWEEN $2 AND $3`;

    const result = (await (await pgConnect.getConnection("slave")).query(sql, [samityId, startDate, endDate])).rows[0];

    return result;
  }

  async create(data: any, user: any) {
    data.createdAt = new Date();

    for (const element of data.documentInfo) {
      let attachment = [];
      for (let elementDocumentName of element.documentName) {
        if (elementDocumentName.base64Image) {
          let bufferObj = Buffer.from(elementDocumentName.base64Image, "base64");

          const fileName = getFileName(elementDocumentName.name);

          await uploadObject({ fileName, buffer: bufferObj });
          attachment.push({ fileName });
        }
      }
      element.documentName = attachment;
    }
    return { ...data, offceId: user.type == "user" ? user.officeId : null };
  }

  // async update(id: number, reqBody: any, user: any, updatedBy: any): Promise<any[]> {
  //   let result = [];
  //   const updatedAt = new Date();

  //   const data = reqBody.data;
  //   data.userType = user.type;
  //   data.userId = user.type == "user" ? user.userId : user.userId;
  //   const applicationSql = `select id,status,created_by,data from coop.application where id=$1`;
  //   const applicationData = await (await (await pgConnect.getConnection("master")).query(applicationSql, [id])).rows[0];

  //   const documents: any[] = applicationData.data.document_info
  //     ? toCamelKeys(applicationData.data.document_info)
  //     : applicationData.data.document_info;

  //   for (const element of data.documentInfo) {
  //     element.documentName[0].fileName = element.documentName[0].oldFileName
  //       ? element.documentName[0].oldFileName
  //       : element.documentName[0].fileName;
  //     if (element.documentName[0].base64Image) {
  //       let bufferObj = Buffer.from(element.documentName[0].base64Image, "base64");

  //       const fileName = getFileName(element.documentName[0].name);

  //       await uploadObject({ fileName, buffer: bufferObj });
  //       element.documentName[0].fileName = fileName;
  //       delete element.documentName[0].base64Image;
  //     }
  //     delete element.documentName[0].name,
  //       delete element.documentName[0].mimeType,
  //       delete element.documentName[0].oldFileName;
  //   }

  //   if (applicationData.status === "C") {
  //     const { sql, params } = buildUpdateWithWhereSql(
  //       "coop.application",
  //       {
  //         id,
  //       },
  //       { data: reqBody.data, updatedBy, updatedAt, status: "C" }
  //     );

  //     result.push(await (await (await pgConnect.getConnection("master")).query(sql, params)).rows);
  //   } else if (applicationData.status === "P") {
  //     const approvalSql = `SELECT * FROM coop.application_approval WHERE application_id=$1`;
  //     const approvalData = (await (await pgConnect.getConnection("slave")).query(approvalSql, [id])).rows;

  //     if (approvalData.length > 0) {
  //       const { sql, params } = buildUpdateWithWhereSql(
  //         "coop.application",
  //         {
  //           id,
  //         },
  //         { data: reqBody.data, updatedBy, updatedAt }
  //       );

  //       result.push(await (await (await pgConnect.getConnection("master")).query(sql, params)).rows);
  //     } else if (approvalData.length == 0) {
  //       const { sql, params } = buildUpdateWithWhereSql(
  //         "coop.application",
  //         {
  //           id,
  //         },
  //         {
  //           data,
  //           updatedBy,
  //           updatedAt,
  //         }
  //       );
  //       result.push(await (await (await pgConnect.getConnection("master")).query(sql, params)).rows);
  //     }
  //   }
  //   return result;
  // }

  // async dataTransfer(
  //   data: any,
  //   samityId: number,
  //   samityLevel: string,
  //   samityType: number,
  //   doptorId: number,
  //   workFlow: object,
  //   investmentDate: Date,
  //   transaction: PoolClient,
  //   createdBy: string,
  //   createdAt: Date
  // ) {
  //   try {
  //     let docInfo = data.documentInfo.map((value: any) => {
  //       return { documentInfo: value.documentName, documentNameBangla: value.documentNameBangla };
  //     });

  //     const investmentInfoData = {
  //       samityId,
  //       samityLevel: data.samityInfo.samityLevel,
  //       samityType: data.samityInfo.samityType,
  //       doptorId,
  //       investmentDate,
  //       applyDate: data.applyDate,
  //       remarks: data.content,
  //       workflow: JSON.stringify(workFlow),
  //       attachment: JSON.stringify(docInfo),
  //       status: "A",
  //       createdBy,
  //       createdAt,
  //     };

  //     const { sql, params } = buildInsertSql("coop.investment_info", investmentInfoData);

  //     let investmentData = await (await transaction.query(sql, params)).rows[0];
  //     investmentData = investmentData ? toCamelKeys(investmentData) : investmentData;

  //     return { investmentData };
  //   } catch (ex: any) {
  //     throw new BadRequestError(ex);
  //   }
  // }

  async isSamityExistOnApplication(
    samityId: number,
    serviceId: number,
    requestType: string,
    applicationId: number | null
  ): Promise<{ isExist: Boolean; message: string }> {
    const serviceNameSql = ` SELECT service_name from coop.service_info where id=$1`;
    const { service_name: serviceName } = await (
      await (await pgConnect.getConnection("slave")).query(serviceNameSql, [serviceId])
    ).rows[0];

    let sql;
    let count;

    if (requestType == "post") {
      sql = `SELECT 
      count(id) 
     FROM coop.application 
     WHERE samity_id = $1 AND status = $2 AND service_id = $3`;
      count = (await (await pgConnect.getConnection("slave")).query(sql, [samityId, "P", serviceId])).rows[0].count;
    } else if (requestType == "update") {
      sql = `SELECT 
      count(id) 
     FROM coop.application 
     WHERE samity_id = $1 AND status != $2 AND service_id = $3 AND id != $4`;
      count = (await (await pgConnect.getConnection("slave")).query(sql, [samityId, "A", serviceId, applicationId]))
        .rows[0].count;
    }

    return count > 0
      ? {
          isExist: true,
          message: ` সমিতিটির জন্য ${serviceName}  অনুমোদনের জন্য অপেক্ষমান রয়েছে `,
        }
      : {
          isExist: false,
          message: ``,
        };
  }

  async isSamityExistOnFeeCollection(
    samityId: number,
    requestType: string
  ): Promise<{ isExist: Boolean; message: string }> {
    let sql;
    let count;

    if (requestType == "post") {
      sql = `SELECT 
      count(id) 
     FROM coop.audit_info 
     WHERE samity_id = $1`;
      count = (await (await pgConnect.getConnection("slave")).query(sql, [samityId])).rows[0].count;
    } else if (requestType == "update") {
      sql = `SELECT 
      count(id) 
     FROM coop.audit_info 
     WHERE samity_id = $1 `;
      count = (await (await pgConnect.getConnection("slave")).query(sql, [samityId])).rows[0].count;
    }

    return count > 0
      ? {
          isExist: true,
          message: `সমিতির নিরীক্ষা ও সিডিএফ ফি প্রদান করা হয়েছে`,
        }
      : {
          isExist: false,
          message: ``,
        };
  }
}
