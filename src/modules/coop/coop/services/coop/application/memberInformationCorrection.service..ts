import { toCamelKeys } from "keys-transform";
import _ from "lodash";
import moment from "moment";
import { PoolClient } from "pg";
import { BadRequestError, buildInsertSql, buildUpdateSql, buildUpdateWithWhereSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../../../db-coop/factory/connection.db";
import { getFileName } from "../../../../../../utils/file.util";
import { minioPresignedGet, uploadObject } from "../../../../../../utils/minio.util";
import { isExistsByColumn } from "../../../../../../utils/service.utils";

@Service()
export class MemberInformationCorrectionServices {
  constructor() {}

  async create(data: any, user: any) {
    data.createdAt = new Date();

    // documents handle

    for (let [index, element] of data.membersInfo.entries()) {
      if (element.documents) {
        for (let [index, e] of element.documents.entries()) {
          if (e.docType == "IMG") {
            element.memberPhoto = e.fileName ? e.fileName : "";
          }
          if (e.docType == "SIG") {
            element.memberSign = e.fileName ? e.fileName : "";
          }
          if (e.base64Image) {
            let bufferObj = Buffer.from(e.base64Image, "base64");

            const fileName = getFileName(e.name);

            await uploadObject({ fileName, buffer: bufferObj });
            if (e.docType == "IMG") {
              element.memberPhoto = fileName;
            }
            if (e.docType == "SIG") {
              element.memberSign = fileName;
            }

            delete element.documents[index].mimeType;
            delete element.documents[index].base64Image;
            delete element.documents[index].fileNameUrl;
            element.documents[index].fileName = fileName;
          }
        }
      }

      delete element.memberPhotoUrl;
      delete element.memberIdSignUrl;
    }

    return data;
  }

  async get(applicationId: any) {
    const sql = `select * from coop.application where id=$1`;
    const result = (await (await pgConnect.getConnection("slave")).query(sql, [applicationId])).rows[0];

    for (const [index, element] of result.data.members_info.entries()) {
      result.data.members_info[index].documents = await minioPresignedGet(element.documents, ["fileName"]);
    }

    return result;
  }

  async getApplicationId(samityId: any, doptorId: number, serviceId: number) {
    try {
      const sql = `SELECT *FROM COOP.APPLICATION WHERE SAMITY_ID = $1
      AND DOPTOR_ID = $2
      AND SERVICE_ID = $3
      AND STATUS NOT IN ($4, $5)`;

      const result = (
        await (await pgConnect.getConnection("slave")).query(sql, [samityId, doptorId, serviceId, "A", "R"])
      ).rows[0];
      if (result) {
        for (const [index, element] of result.data.members_info.entries()) {
          if (result.data.members_info[index].documents && result.data.members_info[index].documents.length > 0) {
            result.data.members_info[index].documents = await minioPresignedGet(
              toCamelKeys(result.data.members_info[index].documents),
              ["fileName"]
            );
          }
        }
      }
      return result ? toCamelKeys(result) : result;
    } catch (ex: any) {
      throw new BadRequestError(ex);
    }
  }

  async update(id: number, reqBody: any, user: any, updatedBy: any): Promise<any[]> {
    let result = [];
    const updatedAt = new Date();
    const data = reqBody.data;
    data.userType = user.type;
    data.userId = user.type == "user" ? user.userId : user.userId;

    const applicationSql = `select id,status,created_by,data from coop.application where id=$1`;
    const applicationData = await (await (await pgConnect.getConnection("master")).query(applicationSql, [id])).rows[0];

    for (let [index, element] of data.membersInfo.entries()) {
      if (element.documents && element.documents.length > 0) {
        for (let [index, e] of element.documents.entries()) {
          if (e.docType == "IMG") {
            element.memberPhoto = e.fileName ? e.fileName : "";
          }
          if (e.docType == "SIG") {
            element.memberSign = e.fileName ? e.fileName : "";
          }
          if (e.base64Image) {
            let bufferObj = Buffer.from(e.base64Image, "base64");

            const fileName = getFileName(e.name);

            await uploadObject({ fileName, buffer: bufferObj });
            if (e.docType == "IMG") {
              element.memberPhoto = fileName;
            }
            if (e.docType == "SIG") {
              element.memberSign = fileName;
            }

            delete element.documents[index].mimeType;
            delete element.documents[index].base64Image;
            delete element.documents[index].fileNameUrl;
            element.documents[index].fileName = fileName;
          }
        }
      }

      delete element.memberPhotoUrl;
      delete element.memberIdSignUrl;
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
            nextAppDesignationId: reqBody.nextAppDesignationId,
            updatedBy,
            updatedAt,
          }
        );

        result.push((await (await pgConnect.getConnection("master")).query(sql, params)).rows);
      }
    }

    return result;
  }

  async dataTransfer(data: any, samityId: number, transaction: PoolClient, createdBy: string, createdAt: Date) {
    for (const element of data.membersInfo) {
      const presentAddress = element.presentAddress;
      const permanentAddress = element.permanentAddress;

      const isMemberExistOnTheSamity = await isExistsByColumn("id", "coop.member_info", transaction, {
        samity_id: samityId,
      });
      const samityLevelSql = `select samity_level, samity_name from coop.samity_info where id=$1`;
      const samityLevel = (await transaction.query(samityLevelSql, [samityId])).rows[0].samity_level;
      let resultForMemberCode;
      if (isMemberExistOnTheSamity) {
        const memberCodeSql = `SELECT
        max(member_code::integer) AS last_member_code
      FROM
        coop.member_info
      WHERE
        samity_id = $1`;

        resultForMemberCode = (await transaction.query(memberCodeSql, [samityId])).rows[0];
      }

      if (element.id && element.actionFor == "update") {
        if (samityLevel == "P") {
          const memberInfoData = _.omit(element, "presentAddress", "permanentAddress", "documents", "actionFor");
          const { sql, params } = buildUpdateWithWhereSql(
            "coop.member_info",
            { id: element.id, samityId: element.samityId },
            {
              ...memberInfoData,
              documents: JSON.stringify(element.documents),
              isActive: true,
              updatedBy: createdBy,
              updatedAt: createdAt,
            }
          );

          const result = (await transaction.query(sql, params)).rows[0];

          if (presentAddress.id && permanentAddress.id) {
            presentAddress.memberId = element.id;
            presentAddress.updatedAt = createdAt;
            presentAddress.updatedBy = createdBy;
            permanentAddress.memberId = element.id;
            permanentAddress.updatedAt = createdAt;
            permanentAddress.updatedBy = createdBy;
            const updatePresentAddress: any = await this.updatedMemberAddress(
              presentAddress,
              presentAddress.id,
              transaction
            );
            const updatepermanentAddress: any = await this.updatedMemberAddress(
              permanentAddress,
              permanentAddress.id,
              transaction
            );
          } else if (!presentAddress.id && !permanentAddress.id) {
            presentAddress.memberId = result.id;
            presentAddress.createdAt = createdAt;
            presentAddress.createdBy = createdBy;
            permanentAddress.memberId = result.id;
            permanentAddress.createdAt = createdAt;
            permanentAddress.createdBy = createdBy;
            const addPresentAddress: any = await this.addPresentAddress(presentAddress, transaction);
            const addpermanentAddress: any = await this.addPresentAddress(permanentAddress, transaction);
          }
        } else if (samityLevel == "C" || samityLevel == "N") {
          const memberInfoData = _.omit(
            element,
            "presentAddress",
            "permanentAddress",
            "actionFor",
            "documents",
            "samitySignatoryPerson",
            "address"
          );
          const { sql, params } = buildUpdateWithWhereSql(
            "coop.member_info",
            { id: element.id, samityId: element.samityId },
            {
              ...memberInfoData,
              documents: JSON.stringify(element.documents),
              isActive: true,
              updatedBy: createdBy,
              updatedAt: createdAt,
            }
          );

          const result = (await transaction.query(sql, params)).rows[0];
        }
      } else if (element.id && element.actionFor == "deactivate") {
        const sql = `update coop.member_info set is_active=false where id=$1 returning *`;
        const result = (await transaction.query(sql, [element.id])).rows[0];
      } else {
        if (samityLevel == "P") {
          const memberInfoData = _.omit(
            element,
            "presentAddress",
            "permanentAddress",
            "actionFor",
            "documents",
            "shareAmount",
            "savingsAmount",
            "loanOutstanding",
            "memberDataFrom"
          );

          const { sql, params } = buildInsertSql("coop.member_info", {
            ...memberInfoData,
            memberAdmissionDate: memberInfoData.memberAdmissionDate ? moment(new Date(), "DD/MM/YYYY").toDate() : null,
            documents: JSON.stringify(element.documents),
            // memberCode: isMemberExistOnTheSamity ? parseInt(resultForMemberCode.last_member_code) + 1 : 1,
            isActive: true,
            createdBy,
            createdAt,
          });
          const result = (await transaction.query(sql, params)).rows[0];
          presentAddress.memberId = result.id;
          presentAddress.createdAt = createdAt;
          presentAddress.createdBy = createdBy;
          permanentAddress.memberId = result.id;
          permanentAddress.createdAt = createdAt;
          permanentAddress.createdBy = createdBy;
          await this.addPresentAddress(presentAddress, transaction);
          await this.addPresentAddress(permanentAddress, transaction);
          await this.memberFinInfo(element, result.id, createdAt, createdBy, transaction);
        } else if (samityLevel == "C" || samityLevel == "N") {
          const memberInfoData = _.omit(
            element,
            "presentAddress",
            "permanentAddress",
            "actionFor",
            "documents",
            "samitySignatoryPerson",
            "address"
          );

          const { sql, params } = buildInsertSql("coop.member_info", {
            ...memberInfoData,
            documents: JSON.stringify(element.documents),
            memberCode: isMemberExistOnTheSamity ? parseInt(resultForMemberCode.last_member_code) + 1 : 1,
            isActive: true,
            createdBy,
            createdAt,
          });
          const result = (await transaction.query(sql, params)).rows[0];
        }
      }
    }
  }

  async addPresentAddress(data: object, transaction: PoolClient): Promise<any> {
    const { sql, params } = buildInsertSql("coop.member_address_info", {
      ...data,
    });
    const result = await (await transaction.query(sql, params)).rows[0];

    return result ? toCamelKeys(result) : result;
  }

  async memberFinInfo(
    data: any,
    memberId: Number,
    createdAt: any,
    createdBy: any,
    transaction: PoolClient
  ): Promise<any> {
    // const sharePriceSql = `SELECT share_price FROM coop.samity_info where id=$1`;
    // const sharePrice = (await transaction.query(sharePriceSql, [data.samityId])).rows[0].share_price;
    const { sql, params } = buildInsertSql("coop.member_financial_info", {
      memberId,
      samityId: data.samityId,
      noOfShare: 0,
      shareAmount: data.shareAmount ? data.shareAmount : 0,
      savingsAmount: data.savingsAmount ? data.savingsAmount : 0,
      loanOutstanding: data.loanOutstanding ? data.loanOutstanding : 0,
      createdAt,
      createdBy,
    });
    const result = await (await transaction.query(sql, params)).rows[0];

    return result ? toCamelKeys(result) : result;
  }

  async updatedMemberAddress(data: object, id: number, transaction: PoolClient): Promise<any> {
    const { sql, params } = buildUpdateSql("coop.member_address_info", id, { ...data }, "id");
    const result = await (await transaction.query(sql, params)).rows[0];

    return result ? toCamelKeys(result) : result;
  }

  async isSamityExistInApplication(samityId: number, serviceId: number) {
    const sql = `SELECT ID, EDIT_ENABLE
    FROM COOP.APPLICATION
    WHERE SAMITY_ID = $1
      AND STATUS NOT IN ($2, $3)
      AND SERVICE_ID = $4`;
    const countId = await (
      await (await pgConnect.getConnection("slave")).query(sql, [samityId, "A", "R", serviceId])
    ).rows;

    // return true;
    if (countId.length != 0) {
      if (countId[0]?.edit_enable) {
        return false;
      } else {
        return true;
      }
    } else {
      return false;
    }
  }

  async nidOrBrnExistUpdate(nidOrBrn: string, memberId: number, samityId: number, type: string): Promise<boolean> {
    const query =
      type == "nid"
        ? `
    SELECT COUNT(nid) 
    FROM 
    temps.member_info
    WHERE 
      nid =$1 and id != $2 and samity_id=$3;
  `
        : `
  SELECT COUNT(brn) 
  FROM 
  temps.member_info
  WHERE 
    brn =$1 and id != $2 and samity_id=$3;
`;
    const result = await (
      await (await pgConnect.getConnection("slave")).query(query, [nidOrBrn, memberId, samityId])
    ).rows[0];

    return parseInt(result.count) >= 1 ? true : false;
  }
}
