import { toCamelKeys } from "keys-transform";
import moment from "moment";
import { PoolClient } from "pg";
import { BadRequestError, buildInsertSql, buildUpdateWithWhereSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { getFileName } from "../../../../utils/file.util";
import { uploadObject } from "../../../../utils/minio.util";

@Service()
export class CommitteeRequestServices {
  constructor() {}

  async create(data: any, user: any) {
    data.createdAt = new Date();
    for (const element of data.documents) {
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

  async update(id: number, reqBody: any, user: any, updatedBy: any): Promise<any[]> {
    let result = [];
    const updatedAt = new Date();

    const data = reqBody.data;
    data.userType = user.type;
    data.userId = user.type == "user" ? user.userId : user.userId;
    const applicationSql = `select id,status,created_by,data from coop.application where id=$1`;
    const applicationData = await (await (await pgConnect.getConnection("master")).query(applicationSql, [id])).rows[0];

    const documents: any[] = applicationData.data.document_info
      ? toCamelKeys(applicationData.data.document_info)
      : applicationData.data.document_info;

    for (const element of data.documents) {
      element.documentName[0].fileName = element.documentName[0].oldFileName
        ? element.documentName[0].oldFileName
        : element.documentName[0].fileName;
      if (element.documentName[0].base64Image) {
        let bufferObj = Buffer.from(element.documentName[0].base64Image, "base64");

        const fileName = getFileName(element.documentName[0].name);

        await uploadObject({ fileName, buffer: bufferObj });
        element.documentName[0].fileName = fileName;
        delete element.documentName[0].base64Image;
      }
      delete element.documentName[0].name,
        delete element.documentName[0].mimeType,
        delete element.documentName[0].oldFileName;
    }

    if (applicationData.status === "C") {
      const { sql, params } = buildUpdateWithWhereSql(
        "coop.application",
        {
          id,
        },
        { data: reqBody.data, updatedBy, updatedAt, status: "C" }
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
            updatedBy,
            updatedAt,
          }
        );

        result.push(await (await (await pgConnect.getConnection("master")).query(sql, params)).rows);
      }
    }

    return result;
  }

  async dataTransfer(
    data: any,
    samityId: number,
    transaction: PoolClient,
    createdBy: string,
    createdAt: Date,
    doptorId: number,
    durationObj: any
  ) {
    try {
      const committeeType =
        data.committeeType == 3 ? "EC" : data.committeeType == 4 ? "E" : data.committeeType == 5 ? "I" : "S";
      const duration =
        data.committeeType == 3
          ? null
          : data.committeeType == 4
          ? 3
          : data.committeeType == 5
          ? null
          : data.committeeType == 9
          ? 2
          : null;
      const effectDate = data.committeeType == 3 ? data.meetingDate : data.effectDate;

      const meetingDateFormate = moment(data.meetingDate, "DD/MM/YYYY").format("YYYY/MM/DD");
      const year = parseInt(durationObj.year);
      const month = parseInt(durationObj.month);
      const day = parseInt(durationObj.day);
      const date = new Date(meetingDateFormate);
      date.setFullYear(date.getFullYear() + year);
      date.setMonth(date.getMonth() + month);
      date.setDate(date.getDate() + day);
      moment(date).format("DD/MM/YYYY");
      const expireDate = data.committeeType == 3 ? date : data.expireDate;

      if (data.committeeType == 4 || data.committeeType == 3) {
        const sql =
          data.committeeType == 4
            ? `UPDATE coop.committee_info 
                       SET 
                      status = $1 
                      WHERE samity_id = $2 AND (committee_type = $3 OR committee_type = $4)   
                      RETURNING *;`
            : `UPDATE coop.committee_info 
                      SET 
                     status = $1 
                     WHERE samity_id = $2 AND committee_type=$3    
                     RETURNING *;`;

        const params = data.committeeType == 4 ? ["I", samityId, "S", "E"] : ["I", samityId, "EC"];
        const updateValue = await (await transaction.query(sql, params)).rows[0];

        if (updateValue) {
          const { sql: committeeMemberSql, params: committeeMemberParams } = buildUpdateWithWhereSql(
            "coop.committee_member",
            { samityId: samityId, committeeId: updateValue.id },
            { status: "I" }
          );
          const updateMembers = await (await transaction.query(committeeMemberSql, committeeMemberParams)).rows;
        }
      }

      const committeeInfoData = {
        samityId: data.samityId,
        committeeType,
        meetingDate: data.meetingDate,
        electionDate: data.electionDate,
        noOfMember: data.members.length,
        effectDate: effectDate ? effectDate : null,
        expireDate: expireDate ? expireDate : null,
        duration,
        status: data.committeeType == 3 || data.committeeType == 4 || data.committeeType == 9 ? "A" : "I",
        doptorId,
        attachment: JSON.stringify(data.documents),
        createdBy,
        createdAt,
      };

      const { sql, params } = buildInsertSql("coop.committee_info", committeeInfoData);

      let committeeData = await (await transaction.query(sql, params)).rows[0];
      committeeData = committeeData ? toCamelKeys(committeeData) : committeeData;

      const committeeMembers = [];

      if (committeeData) {
        for (const element of data.members) {
          const memberData = {
            samityId: data.samityId,
            committeeId: committeeData.id,
            committeeRoleId: element.roleId,
            committeeType,
            isMember: element.isMember,
            memberId: element.memberId ? element.memberId : null,
            memberName: element.memberName,
            nid: element.memberNid,
            dob: element.memberDob ? element.memberDob : null,
            orgName: element.orgName ? element.orgName : "",
            status: "A",
            mobile: element.mobile,
            createdBy,
            createdAt,
          };

          const { sql, params } = await buildInsertSql("coop.committee_member", memberData);

          const result = await (await transaction.query(sql, params)).rows[0];
          committeeMembers.push(result ? toCamelKeys(result) : result);
        }
      }

      return { committeeData, committeeMembers };
    } catch (ex: any) {
      throw new BadRequestError(ex);
    }
  }

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
}
