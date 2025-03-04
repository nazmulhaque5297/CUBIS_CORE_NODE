import { toCamelKeys, toSnakeCase } from "keys-transform";
import _ from "lodash";
import { PoolClient } from "pg";
import { buildGetSql, buildUpdateWithWhereSql } from "rdcd-common";
import Container, { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { buildInsertSql } from "../../../../utils/sql-builder.util";
import BadRequestError from "../../../../errors/bad-request.error";

@Service()
export class AuditServices {
  constructor() {}

  async getAuditInfoById(applicationId: number) {
    const auditInfoSql = `SELECT income, 
                          expense, 
                          (income-expense) profit_loss,
                          audit_fee, 
                          cdf_fee
                          FROM coop.audit_info
                          WHERE end_year = CAST(DATE_PART('YEAR', now()) AS text)
                          AND application_id = $1`;
    const auditInfoData = (await (await pgConnect.getConnection("slave")).query(auditInfoSql, [applicationId])).rows[0];

    return auditInfoData;
  }

  async create(data: any, samityId: number, applicationId: number, auditorDesignationId: number, user: any) {
    data.createdAt = new Date();
    const connection = await pgConnect.getConnection("master");
    // const soldShare = data.soldShare;
    // const parsedSold = soldShare ? parseInt(soldShare) : 0;
    // const sharePrice = data.sharePrice;
    // const parsedPrice = sharePrice ? parseInt(sharePrice) : 0;

    // let shareValue;
    // shareValue = parsedSold * parsedPrice;

    const auditInfoData = {
      samityId,
      applicationId,
      startYear: data.samityInfo.startYear,
      endYear: data.samityInfo.endYear,
      auditorOfficeId: data.samityInfo.officeId,
      auditorDesignationId,
      //sharePrice: shareValue,
      auditorAssignBy: data.userId,
      status: "I",
      plannedAuditDate: data.createdAt,
      auditorAssignDate: data.createdAt,
      createdBy: user.userId,
      createdAt: data.createdAt,
    };

    const { sql, params } = buildInsertSql("coop.audit_info", auditInfoData);

    return await (
      await connection.query(sql, params)
    ).rows;
  }

  async update(applicationData: any, user: any, updatedBy: any) {
    let status = "I";

    if (applicationData.serviceActionId == "1" || applicationData.serviceActionId == "2") {
      status = "N";
    } else if (applicationData.serviceActionId == "4") {
      status = "S";
    }
    // else if (applicationData.serviceActionId == "5" || applicationData.serviceActionId == "6") {
    //   status = "R";
    // }

    //audit data
    const auditGetSql = buildGetSql(["documents", "samity_id", "auditor_designation_id"], "coop.audit_info", {
      applicationId: applicationData.applicationId,
    });

    const [auditInfo] = (
      await (await pgConnect.getConnection("slave")).query(auditGetSql.queryText, auditGetSql.values)
    ).rows;

    const { sql: auditUpdateSql, params: auditUpdateParams } = buildUpdateWithWhereSql(
      "coop.audit_info",
      {
        applicationId: applicationData.applicationId,
      },
      { status, updatedBy, updatedAt: new Date() }
    );
    (await (await pgConnect.getConnection("master")).query(auditUpdateSql, auditUpdateParams)).rows;

    if (applicationData.serviceActionId == "3" && applicationData.applicationId && auditInfo.samity_id) {
      let documents: any[] = auditInfo.documents || [];

      if (!applicationData.attachment) {
        throw new BadRequestError("এই সমিতিটির বাৎসরিক হিসাবের রিপোর্ট প্রদান করুন");
      } else {
        documents.push({ attachment: applicationData.attachment });
      }

      const auditAccountSql = `select count(*)
                               from coop.gl_transaction a, coop.audit_info b
                               where DATE_PART('YEAR', a.tran_date) = DATE_PART('YEAR', now())
                               AND a.samity_id = b.samity_id
                               And a.samity_id = $1`;

      const auditAccountParams = [auditInfo.samity_id];

      const auditAccountCheck = await (
        await (await pgConnect.getConnection("slave")).query(auditAccountSql, auditAccountParams)
      ).rows[0];

      if (auditAccountCheck.count == 0) {
        throw new BadRequestError("এই সমিতিটির বাৎসরিক হিসাবের তথ্য প্রদান করুন");
      }
      return true;
    }

    if (applicationData.serviceActionId == "9" && applicationData.applicationId && auditInfo.samity_id) {
      const auditFeeSql = `select audit_fee_collection
                               from coop.audit_info
                               where samity_id = $1`;

      const auditFeeParams = [auditInfo.samity_id];

      const { audit_fee_collection: auditFeeCheck } = await (
        await (await pgConnect.getConnection("slave")).query(auditFeeSql, auditFeeParams)
      ).rows[0];

      const designationId = user.designationId;

      if (auditFeeCheck <= 0) {
        throw new BadRequestError("এই সমিতিটির নিরীক্ষা ফি প্রদান করুন");
      }

      const { sql: auditorUpdateSql, params: auditorUpdateParams } = buildUpdateWithWhereSql(
        "coop.audit_info",
        { applicationId: applicationData.applicationId },
        { status: "F", audit_approved_by: user.designationId, updatedBy, updatedAt: new Date() }
      );
      (await (await pgConnect.getConnection("master")).query(auditorUpdateSql, auditorUpdateParams)).rows;

      return true;
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

  async isSamityExistOnAudit(samityId: number, requestType: string): Promise<{ isExist: Boolean; message: string }> {
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
          message: ` সমিতিটি নিরীক্ষার জন্য অপেক্ষমান `,
        }
      : {
          isExist: false,
          message: ``,
        };
  }
}
