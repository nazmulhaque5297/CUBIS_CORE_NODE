/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-12-27 10:13:48
 * @modify date 2021-12-27 10:13:48
 * @desc [description]
 */

import { toCamelKeys } from "keys-transform";
import _ from "lodash";
import { BadRequestError, buildGetSql } from "rdcd-common";
import Container, { Service } from "typedi";
import { getComponentId } from "../../../../configs/app.config";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { EmployeeInformationServices } from "../../../../modules/coop/employee-management/services/employee-information.service";
import { notificationObject } from "../../../../modules/notification/interfaces/component.interface";
import { NotificationService } from "../../../../modules/notification/services/base-notification.service";
import { UsersTokenAttrs } from "../../../../modules/user/interfaces/user.interface";
import { minioPresignedGet } from "../../../../utils/minio.util";
import { buildInsertSql, buildUpdateWithWhereSql } from "../../../../utils/sql-builder.util";
import { ApplicationAttrs } from "../interfaces/application.interface";
import { AbasayanServices } from "./abasayan.service";
import { AuditServices } from "./audit.service";
import { CommitteeRequestServices } from "./committee-request.service";
import { AuditAccoutsServices } from "./coop/application/audit-accounts.service";
import { BylawsAmendmentServices } from "./coop/application/byLawsAmendment.service";
import { MemberInformationCorrectionServices } from "./coop/application/memberInformationCorrection.service.";
import { SamityInfoServices } from "./coop/samityInfo/samity-Info.service";
import { InvestmentServices } from "./investment.service";
import { RegistrationStepServices } from "./reg-steps.service";
import { SamityMigrationServices } from "./samity-migration.service";
import ServiceInfoServices from "./service-info.service";

@Service()
export class ApplicationServices {
  constructor() {}

  async get(queryParams: any) {
    const { queryText, values } = buildGetSql(
      ["id,samity_id,service_id,next_app_designation_id,data"],
      "coop.application",
      queryParams
    );
    const result = await (await (await pgConnect.getConnection("slave")).query(queryText, values)).rows;
    const data: any = result.length > 0 ? toCamelKeys(result) : result;
    console.log({ data });
    let convertData = [];

    if (result.length > 0) {
      for (const element of data) {
        let elementWithUrl = [];

        if (element.serviceId == 6) {
          let documentInfo = element.data.documentInfo;
          let elementWithOutDocumentInfo = _.omit(element.data, "documentInfo");
          let DocumentInfotWithUrl = [];
          for (const element of documentInfo) {
            let elementWithoutDocumentName = _.omit(element, "documentName");
            const documentNameConvert = await this.getDocumentUrlForSamityMigration(element.documentName);
            DocumentInfotWithUrl.push({
              ...elementWithoutDocumentName,
              documentName: documentNameConvert,
            });
          }

          elementWithUrl.push({
            ...elementWithOutDocumentInfo,
            documentInfo: DocumentInfotWithUrl,
          });

          convertData.push({
            ..._.omit(element, "data"),
            data: elementWithUrl[0],
          });
        } else if (element.serviceId == 11) {
          let documentInfo = element.data.documentInfo;
          let elementWithOutDocumentInfo = _.omit(element.data, "documentInfo");
          let DocumentInfotWithUrl = [];
          for (const element of documentInfo) {
            let elementWithoutDocumentName = _.omit(element, "documentName");
            const documentNameConvert = await this.getDocumentUrlForSamityMigration(element.documentName);
            DocumentInfotWithUrl.push({
              ...elementWithoutDocumentName,
              documentName: documentNameConvert,
            });
          }

          elementWithUrl.push({
            ...elementWithOutDocumentInfo,
            documentInfo: DocumentInfotWithUrl,
          });

          convertData.push({
            ..._.omit(element, "data"),
            data: elementWithUrl[0],
          });
        } else if (element.serviceId == 12) {
          let documentInfo = element.data.documentInfo;
          let elementWithOutDocumentInfo = _.omit(element.data, "documentInfo");
          let DocumentInfotWithUrl = [];
          for (const element of documentInfo) {
            let elementWithoutDocumentName = _.omit(element, "documentName");
            const documentNameConvert = await this.getDocumentUrlForSamityMigration(element.documentName);
            DocumentInfotWithUrl.push({
              ...elementWithoutDocumentName,
              documentName: documentNameConvert,
            });
          }

          elementWithUrl.push({
            ...elementWithOutDocumentInfo,
            documentInfo: DocumentInfotWithUrl,
          });

          convertData.push({
            ..._.omit(element, "data"),
            data: elementWithUrl[0],
          });
        } else if (element.serviceId == 15) {
          let documentInfo = element.data.documentInfo;
          let elementWithOutDocumentInfo = _.omit(element.data, "documentInfo");
          let DocumentInfotWithUrl = [];
          for (const element of documentInfo) {
            let elementWithoutDocumentName = _.omit(element, "documentName");
            const documentNameConvert = await this.getDocumentUrlForSamityMigration(element.documentName);
            DocumentInfotWithUrl.push({
              ...elementWithoutDocumentName,
              documentName: documentNameConvert,
            });
          }

          elementWithUrl.push({
            ...elementWithOutDocumentInfo,
            documentInfo: DocumentInfotWithUrl,
          });

          convertData.push({
            ..._.omit(element, "data"),
            data: elementWithUrl[0],
          });
        } else if (
          element.serviceId == 3 ||
          element.serviceId == 4 ||
          element.serviceId == 5 ||
          element.serviceId == 9
        ) {
          let result;
          if (queryParams.id) {
            //query for member_role
            const sql = `SELECT JSON_AGG(
                           JSON_BUILD_OBJECT(
                            'role_id', e->>'role_id', 
                            'is_member'  ,e->>'is_member', 
                            'member_id' , e->>'member_id', 
                            'role_rank'  , e->>'role_rank', 
                            'member_dob'    ,e->>'member_dob', 
                            'member_nid'  , e->>'member_nid', 
                            'member_name' , e->>'member_name', 
                            'mobile_number'  , e->>'mobile_number',
                            'org_name', e->>'org_name',
                            'role',c.role_name
                           ) 
                       ) as members
                       FROM coop.application a
                       CROSS JOIN LATERAL JSONB_ARRAY_ELEMENTS(a.data->'members') AS e (members)
                       LEFT JOIN master.committee_role c ON (e->'role_id')::text::int = c.id
                       where a.id=$1
                       GROUP BY a.id`;
            result = (await (await pgConnect.getConnection("slave")).query(sql, [queryParams.id])).rows[0];

            result = result ? toCamelKeys(result) : result;
          }

          // _.omit(element.data, "members");
          delete element.data.members;
          element.data.members = result.members;
          let documents = element.data.documents;
          let elementWithOutDocumentInfo = _.omit(element.data, "documents");

          for (const [index, element] of documents.entries()) {
            documents[index] = await minioPresignedGet(toCamelKeys(element), ["fileName"]);
          }

          elementWithUrl.push({
            ...elementWithOutDocumentInfo,
            documents,
          });

          convertData.push({
            ..._.omit(element, "data"),
            data: elementWithUrl[0],
          });
        } else if (element.serviceId == 8) {
          element.data.imageDocument = await minioPresignedGet(toCamelKeys(element.data.imageDocument), ["fileName"]);
          element.data.signatureDocument = await minioPresignedGet(toCamelKeys(element.data.signatureDocument), [
            "fileName",
          ]);

          convertData.push(element);
        } else {
          convertData.push(element);
        }
      }
    }

    //get is manual
    if (data[0].samityId) {
      const isManualSql = `select is_manual from coop.samity_info where id=$1`;
      const {
        rows: [is_manual],
      } = await (await pgConnect.getConnection("slave")).query(isManualSql, [data[0].samityId]);

      convertData[0].isManual = !!is_manual;
    }

    return convertData;
  }

  async getDocumentUrlForSamityMigration(documentName: any) {
    const m = documentName.map((e: any) => {
      return minioPresignedGet(toCamelKeys(e), ["fileName"]);
    });
    return await Promise.all(m);
  }

  async getByType(type: string, query: string, queryParams: any | undefined) {
    let result;
    const queryText = query;

    if (queryParams) {
      result = (await (await pgConnect.getConnection("slave")).query(queryText, Object.values(queryParams))).rows;
    } else {
      result = (await (await pgConnect.getConnection("slave")).query(queryText)).rows;
    }

    return result;
  }

  async getByCitizen(query: string, queryParams: any | undefined) {
    const data = (await (await pgConnect.getConnection("slave")).query(query, Object.values(queryParams))).rows;
    return data ? toCamelKeys(data) : {};
  }

  async getAllDataBYCitizen(query: string, queryParams: any | undefined) {
    const finalResult = [];
    const data = (await (await pgConnect.getConnection("slave")).query(query, Object.values(queryParams))).rows;

    if (data) {
      for (const element of data) {
        const approvalQueryText = `	SELECT a.id,
                                        a.service_action_id ,
                                        a.remarks,
                                        a.attachment,
                                        arr.item_object->>'action_text' as action_text
                                     FROM coop.application_approval a,
                                          coop.service_info b,jsonb_array_elements(b.service_action) 
                                          with ordinality arr(item_object, position) 
                                     WHERE application_id=$1 and b.id=$2
                                     and arr.position= a.service_action_id ORDER BY a.id desc limit 1`;

        const aprovalData = await (
          await (await pgConnect.getConnection("slave")).query(approvalQueryText, [element.id, element.service_id])
        ).rows[0];

        aprovalData
          ? finalResult.push({
              applicationData: element,
              applicationApprovalData: aprovalData,
            })
          : finalResult.push({
              applicationData: element,
              applicationApprovalData: {
                id: null,
                service_action_id: null,
                action_text: "আবেদন করা হয়েছে ",
              },
            });
      }

      for (const f of finalResult) {
        if (
          f.applicationApprovalData &&
          f.applicationApprovalData.attachment &&
          f.applicationApprovalData.attachment != ""
        ) {
          f.applicationApprovalData = await minioPresignedGet(f.applicationApprovalData, ["attachment"]);
        }
      }
      return finalResult ? toCamelKeys(finalResult) : {};
    }
  }

  async create(appData: ApplicationAttrs, user: any): Promise<{ [key: string]: any }> {
    const createdAt = new Date();
    const createdBy = user.type == "citizen" ? user.userId : user.userId;
    const componentId = getComponentId("coop"); //change later if merged to main application
    if (appData.serviceId == 3 && appData.samityId) {
      const samityInfoService = Container.get(SamityInfoServices);
      const samityInfo: any = await samityInfoService.get({
        id: appData.samityId,
      });

      if (samityInfo[0].noOfShare * samityInfo[0].sharePrice <= 50000) {
        appData.status = "A";
        const createdBy = user.type == "user" ? user.userId : user.userId;
        const createdAt = new Date();
        const sql = `SELECT
                         b.service_rules->'duration' AS duration_obj
                       FROM
                       coop.service_info b
                       WHERE
                         b.id = $1`;
        const result = (await (await pgConnect.getConnection("slave")).query(sql, [appData.serviceId])).rows[0];
        const CommitteeRequestService = Container.get(CommitteeRequestServices);
        const dataTransfer = await CommitteeRequestService.dataTransfer(
          appData.data,
          appData.samityId,
          await (await pgConnect.getConnection("master")).connect(),
          createdBy,
          createdAt,
          appData.doptorId as number,
          result.duration_obj
        );
      }
    }
    const { sql, params } = buildInsertSql("coop.application", {
      ...appData,
      createdBy,
      createdAt,
    });

    const {
      rows: [result],
    } = await (await pgConnect.getConnection("master")).query(sql, params);

    const serviceInfo = Container.get(ServiceInfoServices);
    const service = await serviceInfo.getServiceById(appData.serviceId as number);

    if (service && service.notification) {
      const notification = Container.get(NotificationService);
      await notification.create(service.notification as notificationObject, {
        userType: user.type,
        userId: user.userId,
        doptorId: user.doptorId,
        componentId,
        serviceId: appData.serviceId as number,
        applicationId: result.id,
        message: await notification.createCustomNotificationMessage(appData.serviceId as number, result.id),
        createdBy,
      });
    }
    return toCamelKeys(result);
  }

  async createSamityFinalSunmission(appData: ApplicationAttrs, user: any, tempSamityId: number) {
    const transaction = await (await pgConnect.getConnection("master")).connect();

    const componentId = getComponentId("coop"); //change later if merged to main application

    try {
      transaction.query("BEGIN");

      const applicationSql = `select * from coop.application where data ->'samity_id'=$1 and service_id=$2`;
      const {
        rows: [resultApplicationd],
      } = await (await pgConnect.getConnection("master")).query(applicationSql, [tempSamityId, appData.serviceId]);
      let result;
      if (resultApplicationd) {
        const status = "C";
        const edit_enable = false;
        const id = resultApplicationd.id;
        const { sql, params } = buildUpdateWithWhereSql(
          "coop.application",
          { id },
          { status, edit_enable, updatedAt: new Date() }
        );
        result = (await (await pgConnect.getConnection("master")).query(sql, params)).rows[0];
      } else {
        const createdAt = new Date();
        const { sql, params } = buildInsertSql("coop.application", {
          ...appData,
          createdBy: user.type == "citizen" ? user.userId : user.userId,
          createdAt,
        });

        result = (await (await pgConnect.getConnection("master")).query(sql, params)).rows[0];
      }
      if (result.id) {
        const RegistrationStepService = Container.get(RegistrationStepServices);
        const regStepResult = await await RegistrationStepService.updateSteps(
          tempSamityId,
          transaction,
          9,
          user.type == "citizen" ? user.userId : user.userId
        );
      }

      transaction.query("COMMIT");

      const serviceInfo = Container.get(ServiceInfoServices);
      const service = await serviceInfo.getServiceById(appData.serviceId as number);

      if (service && service.notification) {
        const notification = Container.get(NotificationService);
        await notification.create(service.notification as notificationObject, {
          userType: user.type as "citizen" | "user",
          userId: user.type == "citizen" ? user.userId : user.userId,
          doptorId: user.doptorId,
          componentId,
          serviceId: appData.serviceId as number,
          applicationId: result.id,
          message: await notification.createCustomNotificationMessage(appData.serviceId as number, result.id),
          createdBy: user.type == "citizen" ? user.userId : user.userId,
        });
      }

      return result ? toCamelKeys(result) : result;
    } catch (ex: any) {
      transaction.query("ROLLBACK");
    } finally {
      transaction.release();
    }
  }

  async update(type: string, id: number, reqBody: ApplicationAttrs, user: UsersTokenAttrs) {
    let result: any = [];
    const updatedAt = new Date();
    const updatedBy = user.type === "user" ? user.userId : user.userId;
    if (reqBody.data) {
      reqBody.data.userType = user.type == "user" ? "user" : "citizen";
      reqBody.data.userId = user.type === "user" ? user.userId : user.userId;
    }

    if (type === "name-clearance") {
      const applicationSql = `select id,status,created_by from coop.application where id=$1`;
      const applicationData = await (
        await (await pgConnect.getConnection("master")).query(applicationSql, [id])
      ).rows[0];

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
          const d = await this.getDesignationId(reqBody.data.officeId);

          const { sql, params } = buildUpdateWithWhereSql(
            "coop.application",
            {
              id,
            },
            {
              data: reqBody.data,
              nextAppDesignationId: d.id,
              updatedBy,
              updatedAt,
            }
          );

          result.push(await (await (await pgConnect.getConnection("master")).query(sql, params)).rows);
        }
      }
    } else if (type === "samity-migration") {
      const SamityMigrationService = Container.get(SamityMigrationServices);
      result = await SamityMigrationService.update(id, reqBody, user, updatedBy);
    } else if (type === "employee-information") {
      const EmployeeInformationService = Container.get(EmployeeInformationServices);
      result = await EmployeeInformationService.update(id, reqBody, user, updatedBy);
    } else if (type === "committee-request") {
      const CommitteeRequestService = Container.get(CommitteeRequestServices);
      result = await CommitteeRequestService.update(id, reqBody, user, updatedBy);
    } else if (type === "abasayan") {
      const AbasayanRequestService = Container.get(AbasayanServices);
      result = await AbasayanRequestService.update(id, reqBody, user, updatedBy);
    } else if (type === "investment") {
      const InvestmentRequestService = Container.get(InvestmentServices);
      result = await InvestmentRequestService.update(id, reqBody, user, updatedBy);
    } else if (type === "audit") {
      const AuditRequestService = Container.get(AuditServices);
      result = await AuditRequestService.update(reqBody, user, updatedBy);
    } else if (type === "member-information-correction") {
      const MemberInformationCorrectionService = Container.get(MemberInformationCorrectionServices);
      result = await MemberInformationCorrectionService.update(id, reqBody, user, updatedBy);
    } else if (type === "bylaws-amendment") {
      const BylawsAmendmentService = Container.get(BylawsAmendmentServices);
      result = await BylawsAmendmentService.update(id, reqBody, user, updatedBy);
    } else if (type === "audit-accounts") {
      const AuditAccoutsService = Container.get(AuditAccoutsServices);
      result = await AuditAccoutsService.update(id, reqBody, user, updatedBy);
      return;
    } else if (type === "application-member-info-correction") {
      try {
        const nextAppDesignationSql = `SELECT
                            c.id AS office_designation
                          FROM
                            coop.samity_info a
                          INNER JOIN coop.application b ON
                            a.id = b.samity_id
                          INNER JOIN master.office_designation c ON
                            c.office_id = a.office_id
                          WHERE
                            b.id = $1
                            AND c.is_office_head = '1'`;

        const { office_designation: nextAppDesignationId } = (
          await (await pgConnect.getConnection("slave")).query(nextAppDesignationSql, [id])
        ).rows[0];

        const { sql, params } = buildUpdateWithWhereSql(
          "coop.application",
          { id },
          { nextAppDesignationId, status: "P" }
        );

        result = await (await (await pgConnect.getConnection("master")).query(sql, params)).rows;
      } catch (ex) {
        throw new BadRequestError("No office head found");
      }
    } else if (type === "samity-correction-out-bylaws") {
      try {
        const { sql, params } = buildUpdateWithWhereSql("coop.application", { id }, { data: reqBody });
        result = (await (await pgConnect.getConnection("master")).query(sql, params)).rows;
      } catch (ex) {
        throw new BadRequestError("No office head found");
      }
    } else {
      const { sql, params } = buildUpdateWithWhereSql(
        "coop.application",
        {
          id,
        },
        {
          data: reqBody.data,
          updatedBy,
          updatedAt,
        }
      );

      const {
        rows: [result],
      } = await (await pgConnect.getConnection("master")).query(sql, params);
    }

    return result ? toCamelKeys(result[0]) : result;
  }
  async delete(applicationId: number) {
    const deleteSqlFromApplication = `delete from coop.application where id=$1 returning id`;
    const deleteDataApplication: any = (
      await (await pgConnect.getConnection("master")).query(deleteSqlFromApplication, [applicationId])
    ).rows[0];

    return deleteDataApplication.id;
  }

  async correctionUpdate(id: number, updatedBy: string, remarks: string, user: UsersTokenAttrs) {
    const updatedAt = new Date();
    const userType = user.type;
    const userId = user.userId | user.userId;
    const transaction = await (await pgConnect.getConnection("master")).connect();

    try {
      transaction.query("BEGIN");

      const serviceIdSql = `select service_id from coop.application where id=$1`;
      const { service_id: serviceId } = await (await transaction.query(serviceIdSql, [id])).rows[0];

      const serviceActionIdSql = `select
                                    arr.item_object->>'id' as id
                                  from
                                    coop.service_info,
                                    jsonb_array_elements(service_action) with ordinality arr(item_object,
                                    position)
                                  where
                                    id = $1
                                    and arr.item_object->>'name' = 'সংশোধন সম্পন্ন'`;
      const { id: serviceActionId } = (await transaction.query(serviceActionIdSql, [serviceId])).rows[0];
      let result;
      if (serviceId === 10) {
        const { sql, params } = buildUpdateWithWhereSql(
          "coop.application",
          {
            id,
          },
          {
            updatedAt,
            status: "P",
            editEnable: true,
          }
        );
        result = await (await transaction.query(sql, params)).rows;
      } else {
        const { sql, params } = buildUpdateWithWhereSql(
          "coop.application",
          {
            id,
          },
          {
            updatedAt,
            status: "P",
            editEnable: false,
          }
        );
        result = await (await transaction.query(sql, params)).rows;
      }

      const { sql: approvalSql, params: approvalParams } = buildInsertSql("coop.application_approval", {
        userId,
        applicationId: id,
        remarks,
        officeId: user.type == "user" ? user.officeId : null,
        actionDate: new Date(),
        serviceActionId,
        userType,
        createdBy: userId,
        createdAt: new Date(),
      });

      const approvalInsertResult = await (await transaction.query(approvalSql, approvalParams)).rows[0];
      await transaction.query("COMMIT");
      return { applicationUpdate: result, approvalInsertResult };
    } catch (error) {
      await transaction.query("ROLLBACK");
      return undefined;
    } finally {
      transaction.release();
    }
  }

  async getDataForSamitySubmission(id: number) {
    const queryTextForSamityInfo = `SELECT
                                      a.id AS samity_id,
                                      a.samity_name,
                                      a.samity_type_id,
                                      a.samity_level,
                                      b.type_name AS samity_type_name,
                                      office_id
                                    FROM
                                      temps.samity_info a
                                    INNER JOIN coop.samity_type b ON
                                      a.samity_type_id = b.id
                                    WHERE
                                      a.id = $1`;
    const data = await (await (await pgConnect.getConnection("slave")).query(queryTextForSamityInfo, [id])).rows[0];

    const designationId = await this.getDesignationId(data.office_id);

    return { data, nextAppDesignationId: designationId.id };
  }

  async getDesignationId(officeId: number) {
    const sqlForDesignationId = `select
                                    a.id
                                  from
                                    master.office_designation a
                                  inner join master.office_info b on
                                    a.office_id = b.id
                                  where
                                    a.is_office_head = '1'
                                  and b.id = $1`;
    const result = (await (await pgConnect.getConnection("slave")).query(sqlForDesignationId, [officeId])).rows[0];

    return result ? toCamelKeys(result) : result;
  }

  async countHeadDesingnation(samityId: number) {
    const queryTextForSamityInfo = `SELECT office_id FROM temps.samity_info WHERE id=$1`;
    const data = await (
      await (await pgConnect.getConnection("slave")).query(queryTextForSamityInfo, [samityId])
    ).rows[0];

    const sqlForCountHead = `select COUNT(a.id) from master.office_designation a 
     inner join master.office_info b on a.office_id = b.id where b.id=$1 and a.is_office_head='1'`;
    const result = (await (await pgConnect.getConnection("slave")).query(sqlForCountHead, [data.office_id])).rows[0]
      .count;

    return result ? parseInt(result) : 0;
  }

  async isApplicationApprove(applicationId: number) {
    const sql = `SELECT status FROM coop.application WHERE id=$1 `;
    const data = await (await (await pgConnect.getConnection("slave")).query(sql, [applicationId])).rows[0];

    return data?.status === "A" ? true : false;
  }

  async getPendingListByCitizen(userId: number) {
    const finalResult = [];
    const applicationQueryText = `SELECT 
       a.id as application_id,
       a.samity_id,
       a.status,
       a.edit_enable,
      (a.data->'samity_type_id')::int as samity_type_id,
      (a.data->'office_id')::int as office_id,
      (a.data->'district_id') :: int as district_id,
      (a.data->'division_id')::int as division_id,
       a.data->'samity_name'as samity_name,
       a.next_app_designation_id,
       b.name_bn as office_name,c.division_name_bangla,
       d.district_name_bangla,
       e.type_name as samity_type_name,
       a.service_id,
       f.service_name,
       f.page_link,
       g.name_bn
     FROM coop.application as a
     INNER JOIN  	master.office_info b  ON b.id=(a.data->'office_id')::int
     INNER JOIN master.division_info c ON c.id=(a.data->'division_id')::int
     INNER JOIN master.district_info d ON d.id= (a.data->'district_id')::int
     INNER JOIN  coop.samity_type e ON e.id=(a.data->'samity_type_id')::int
     INNER JOIN coop.service_info f ON a.service_id= f.id
     INNER JOIN  	master.office_designation g  ON a.next_app_designation_id= g.id
     WHERE data::jsonb ? 'user_id' and data->'user_id'=$1 and edit_enable= true`;

    const applicationData = await (
      await (await pgConnect.getConnection("slave")).query(applicationQueryText, [userId.toString()])
    ).rows;

    if (applicationData) {
      for (const element of applicationData) {
        const approvalQueryText = `	SELECT a.id,
                                        a.service_action_id ,
                                        a.remarks,
                                        a.attachment,
                                        arr.item_object->>'action_text' as action_text
                                     FROM coop.application_approval a,
                                          coop.service_info b,jsonb_array_elements(b.service_action) 
                                          with ordinality arr(item_object, position) 
                                     WHERE application_id=$1 and b.id=$2
                                     and arr.position= a.service_action_id ORDER BY a.id desc limit 1`;
        const aprovalData = await (
          await (
            await pgConnect.getConnection("slave")
          ).query(approvalQueryText, [element.application_id, element.service_id])
        ).rows[0];

        aprovalData
          ? finalResult.push({
              applicationData: element,
              applicationApprovalData: aprovalData,
            })
          : finalResult.push({
              applicationData: element,
              applicationApprovalData: {
                id: null,
                service_action_id: null,
                action_text: "আবেদন করা হয়েছে ",
              },
            });
      }
    }

    for (const f of finalResult) {
      if (
        f.applicationApprovalData &&
        f.applicationApprovalData.attachment &&
        f.applicationApprovalData.attachment != ""
      ) {
        f.applicationApprovalData = await minioPresignedGet(f.applicationApprovalData, ["attachment"]);
      }
    }
    return finalResult ? finalResult : [];
  }

  async getNewFormation(allQuery: any, queryObj: any, userInfo: any, user: any, serviceId: number, doptorId: number) {
    let query = queryObj.query;
    let userType = queryObj.param == "citizen" ? "citizen" : "user";
    let result;

    if (queryObj.reqQuery) {
      const { sql, params } = this.queryEnhance(queryObj.param, allQuery, query, queryObj.whereCondition);
      let values = [];

      for (const element of queryObj.param) {
        if (element == "serviceId") {
          values.push(serviceId);
        }

        if (element == "doptorId") {
          values.push(doptorId);
        }
        if (element == "user" || element == "citizen") {
          values.push(userInfo.userId);
        }
        if (element == "designationId") {
          values.push(user.designationId);
        }
      }

      values.push(...params);
      result = (await (await pgConnect.getConnection("slave")).query(sql, values)).rows;

      if (queryObj.approvalFunction) {
        result = await this.approvalData(result);
      }
    } else {
      let values = [];
      for (const element of queryObj.param) {
        if (element == "user" || element == "citizen") {
          values.push(userInfo.userId);
        }
        if (element == "designationId") {
          values.push(user.designationId);
        }

        if (element == "serviceId") {
          values.push(serviceId);
        }

        if (element == "doptorId") {
          values.push(doptorId);
        }
      }
      result = (await (await pgConnect.getConnection("slave")).query(query, values)).rows;

      if (queryObj.approvalFunction) {
        result = await this.approvalData(result);
      }
    }

    result = (await minioPresignedGet(toCamelKeys(result), ["fileName"]))
      ? await minioPresignedGet(toCamelKeys(result), ["fileName"])
      : result;
    return result ? toCamelKeys(result) : result;
  }

  queryEnhance(params: string, reqQuery: any, query: string, whereCondition: any) {
    let returnQuery = query;
    const keys = Object.keys(reqQuery);
    const value = Object.values(reqQuery);

    if (whereCondition.exist) {
      let count = whereCondition.parameter;
      for (const element of keys) {
        returnQuery = returnQuery + ` and ${element}=$${count + 1}`;
        count = count + 1;
      }
    } else {
      let count = params.length > 0 ? params.length + 1 : 1;
      for (const [index, element] of keys.entries()) {
        if (index == 0) {
          returnQuery = returnQuery + ` where ${element}=$${count} `;
          count = count + 1;
        } else {
          returnQuery = returnQuery + ` and ${element}=$${count + 1} `;
          count = count + 1;
        }
      }
    }
    return { sql: returnQuery, params: value };
  }

  async approvalData(applicationData: any) {
    const finalResult = [];

    for (const element of applicationData) {
      const approvalQueryText = `	SELECT a.id,
                                            a.service_action_id ,
                                            a.remarks,
                                            a.attachment,
                                            arr.item_object->>'action_text' as action_text
                                         FROM coop.application_approval a,
                                              coop.service_info b,jsonb_array_elements(b.service_action)
                                              with ordinality arr(item_object, position)
                                         WHERE application_id=$1 and b.id=$2
                                         and arr.position= a.service_action_id ORDER BY a.id desc limit 1`;
      const aprovalData = await (
        await (await pgConnect.getConnection("slave")).query(approvalQueryText, [element.id, element.service_id])
      ).rows[0];

      aprovalData
        ? finalResult.push({
            applicationData: element,
            applicationApprovalData: aprovalData,
          })
        : finalResult.push({
            applicationData: element,
            applicationApprovalData: {
              id: null,
              service_action_id: null,
              action_text: "আবেদন করা হয়েছে ",
            },
          });
    }
    for (const f of finalResult) {
      if (
        f.applicationApprovalData &&
        f.applicationApprovalData.attachment &&
        f.applicationApprovalData.attachment != ""
      ) {
        f.applicationApprovalData = await minioPresignedGet(f.applicationApprovalData, ["attachment"]);
      }
    }
    return finalResult ? finalResult : [];
  }

  async ApplicationSamitySummary(officeId: number) {
    const sql = `select * from coop.application where service_id=$1 and data->'office_id'=$2`;
    const result = (await (await pgConnect.getConnection("slave")).query(sql, [2, officeId])).rows;

    return result ? toCamelKeys(result) : result;
  }

  async isApplicationValidForDelete(applicationId: number): Promise<boolean> {
    const approvalSql = `SELECT count(id) 
                          FROM coop.application_approval
                          WHERE application_id = $1`;
    const count = (await (await pgConnect.getConnection("slave")).query(approvalSql, [applicationId])).rows[0].count;

    return count > 0 ? false : true;
  }

  async tempSamityEditable(applicationId: number) {
    const transaction = await (await pgConnect.getConnection("slave")).connect();

    try {
      transaction.query("BEGIN");
      const samityIdSql = `select 
                           a.data->>'samity_id' as samity_id,
                           b.samity_level 
                    from coop.application a 
                    inner join temps.samity_info b on (a.data->>'samity_id')::INTEGER = b.id
                    where a.id=$1`;
      const { samity_id: samityId, samity_level: samityLevel } = (await transaction.query(samityIdSql, [applicationId]))
        .rows[0];
      const { sql, params } = buildUpdateWithWhereSql(
        "temps.reg_steps",
        {
          samityId,
        },
        {
          status: "P",
          url: "/coop/samity-management/coop/samity-reg-report",
          lastStep: 8,
        }
      );

      const updateRegsteps = (await transaction.query(sql, params)).rows[0];
      return updateRegsteps ? toCamelKeys({ ...updateRegsteps, samityLevel }) : updateRegsteps;
    } catch (ex: any) {
      transaction.query("ROLLBACK");
      throw new BadRequestError(ex);
    } finally {
      transaction.release();
    }
  }
}
