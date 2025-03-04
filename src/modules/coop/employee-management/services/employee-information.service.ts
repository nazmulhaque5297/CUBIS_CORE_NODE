import _ from "lodash";
import path from "path";
import { Service } from "typedi";
import { toCamelKeys } from "keys-transform";
import { buildUpdateWithWhereSql } from "rdcd-common";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { uploadObject } from "../../../../utils/minio.util";

@Service()
export class EmployeeInformationServices {
  constructor() { }

  async create(data: any, user: any) {
    data.createdAt = new Date();

    // documents handle

    if (data.imageDocument) {
      if (data.imageDocument.documentPictureFront) {
        let bufferObj = Buffer.from(data.imageDocument.documentPictureFront, "base64");

        const fileName = `employeeInformation-${data.imageDocument.documentPictureFrontName
          }-${Date.now()} ${path.extname(data.imageDocument.documentPictureFrontName)}`;

        await uploadObject({ fileName, buffer: bufferObj });

        data.imageDocument = {
          ..._.omit(data.imageDocument, "documentPictureFront"),
          fileName,
        };
      }
    }

    if (data.signatureDocument) {
      if (data.signatureDocument.documentPictureFront) {
        let bufferObj = Buffer.from(data.signatureDocument.documentPictureFront, "base64");

        const fileName = `employeeInformation-${data.signatureDocument.documentPictureFrontName
          }-${Date.now()} ${path.extname(data.signatureDocument.documentPictureFrontName)}`;

        await uploadObject({ fileName, buffer: bufferObj });

        data.signatureDocument = {
          ..._.omit(data.signatureDocument, "documentPictureFront"),
          fileName,
        };
      }
    }



    return data;
  }

  async update(id: number, reqBody: any, user: any, updatedBy: any): Promise<any[]> {

    let result = [];
    const updatedAt = new Date();

    const data = reqBody.data;

    if (data.imageDocument) {
      if (data.imageDocument.oldFileName) {
        if (data.imageDocument.documentPictureFront) {
          let bufferObj = Buffer.from(data.imageDocument.documentPictureFront, "base64");

          const fileName = `employeeInformation-${data.imageDocument.documentPictureFrontName
            }-${Date.now()} ${path.extname(data.imageDocument.documentPictureFrontName)}`;



          await uploadObject({ fileName, buffer: bufferObj });

          data.imageDocument = {
            ..._.omit(data.imageDocument, "documentPictureFront", "oldFileName"),
            fileName,
          };
        }
      }
    }
    if (data.signatureDocument) {
      if (data.signatureDocument.oldFileName) {
        if (data.signatureDocument.documentPictureFront) {
          let bufferObj = Buffer.from(data.signatureDocument.documentPictureFront, "base64");

          const fileName = `employeeInformation-${data.signatureDocument.documentPictureFrontName
            }-${Date.now()} ${path.extname(data.signatureDocument.documentPictureFrontName)}`;

          await uploadObject({ fileName, buffer: bufferObj });

          data.signatureDocument = {
            ..._.omit(data.signatureDocument, "documentPictureFront", "oldFileName"),
            fileName,
          };
        }
      }
    }

    const applicationSql = `select id,status,created_by,data from coop.application where id=$1`;
    const applicationData = await (await (await pgConnect.getConnection("slave")).query(applicationSql, [id])).rows[0];

    // const documentInfo: any[] = applicationData.data.document_info;
    const imageDocument: any = applicationData.data.imageDocument;
    const signatureDocument: any = applicationData.data.signatureDocument;

    if (applicationData.status === "C") {
      const { sql, params } = buildUpdateWithWhereSql(
        "coop.application",
        {
          id,
        },
        { data: reqBody.data, updatedBy, updatedAt, status: "P" }
      );

      result.push(await (await (await pgConnect.getConnection("master")).query(sql, params)).rows);
    } else if (applicationData.status === "P") {
      const approvalSql = `SELECT * FROM coop.application_approval WHERE application_id=$1`;
      const approvalData = (await (await pgConnect.getConnection("slave")).query(approvalSql, [id])).rows;

      if (approvalData.length > 0) {
        const { sql, params } = buildUpdateWithWhereSql(
          "coop.application",
          {
            id,
          },
          { data: reqBody.data, updatedBy, updatedAt }
        );

        result.push(await (await (await pgConnect.getConnection("master")).query(sql, params)).rows);
      } else if (approvalData.length == 0) {
        const { sql, params } = buildUpdateWithWhereSql(
          "coop.application",
          {
            id,
          },
          {
            data,
            nextAppDesignationId: reqBody.nextAppDesignationId,
            updatedBy,
            updatedAt,
          }
        );

        result.push(await (await (await pgConnect.getConnection("master")).query(sql, params)).rows);
      }
    }

    return result;
  }

  async getEmployeeInfoBySamityId(samityId: number) {
    const sql = `select a.* , b.designation_name from coop.employee_info a left join coop.employee_designation b on a.designation_id = b.id  where a.samity_id = $1`;
    const result = (await (await pgConnect.getConnection("slave")).query(sql, [samityId])).rows;

    return result ? toCamelKeys(result) : result;
  }
}
