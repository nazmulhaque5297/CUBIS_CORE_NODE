import { toCamelKeys } from "keys-transform";
import { BadRequestError, buildGetSql, buildUpdateWithWhereSql, NotFoundError } from "rdcd-common";
import Container, { Service } from "typedi";
import { getComponentId } from "../../../../../../configs/app.config";
import { pgConnect } from "../../../../../../db-coop/factory/connection.db";
import { EmployeeMigrationServices } from "../../../../../../modules/coop/employee-management/services/employee-migration.service";
import { SamityDocumentsService } from "../../../../../../modules/jasper/services/samity-certificates.service";
import { NotificationService } from "../../../../../../modules/notification/services/base-notification.service";
// import { ComponentNotificationService } from "../../../../../modules/notification/services/component.service";
import moment from "moment-timezone";
import { minioPresignedGet } from "../../../../../../utils/minio.util";
import { buildInsertSql } from "../../../../../../utils/sql-builder.util";
import TransactionService from "../../../../../transaction/services/transaction.service";
import {
  applicationApproval,
  applicationApprovalInput,
} from "../../../interfaces/coop/application-approval/application-approval.interface";
import { AbasayanServices } from "../../abasayan.service";
import { AuditServices } from "../../audit.service";
import { AuthorizedPersonServices } from "../../authorized-person.service";
import { CommitteeRequestServices } from "../../committee-request.service";
import { InvestmentServices } from "../../investment.service";
import { SamityMigrationServices } from "../../samity-migration.service";
import ServiceInfoServices from "../../service-info.service";
import { TempToMainSamityServices } from "../../temp-to-main-samity.service";
import { MemberInformationCorrectionServices } from "../application/memberInformationCorrection.service.";
import { omit } from "lodash";

@Service()
export class ApplicationApprovalServices {
  constructor() {}

  async create(
    data: applicationApprovalInput,
    user: Express.Request["user"],
    originUnitId: number,
    officeId: number,
    serviceId: number
  ): Promise<applicationApproval | {}> {
    const ServiceInfoService = Container.get(ServiceInfoServices);
    const componentId = getComponentId("coop"); //change later if merged to main application
    const serviceAction = await ServiceInfoService.getServiceActionById(serviceId, data.serviceActionId);
    if (serviceAction.applicationStatus == "A" && serviceAction.isFinalAction == true) {
      const applicationDataSql = `select 
                                   data->>'user_type' as user_type,
                                   data->>'user_id' as user_id 
                                  from coop.application 
                                  where id=$1`;
      const { user_id: userId, user_type: userType } = (
        await (await pgConnect.getConnection("slave")).query(applicationDataSql, [data.applicationId])
      ).rows[0];
      if (userType == user.type && userId == (user.type == "user" ? user.userId : user.userId)) {
        throw new BadRequestError("আবেদনকারী এবং অনুমোদনকারী একই ব্যাবহারকারী হতে পারবে না ");
      }
    }

    const transaction = await (await pgConnect.getConnection("master")).connect();

    try {
      // variable declare for jasper report while samity is approving
      let mainSamityId;
      let tempSamityId;
      let samityLevel;

      transaction.query("BEGIN");

      //get next app designation id.

      const { queryText: designationQueryText, values: designationQueryValues } = buildGetSql(
        ["next_app_designation_id"],
        "coop.application",
        {
          id: data.applicationId,
        }
      );

      const {
        rows: [{ next_app_designation_id }],
      } = await transaction.query(designationQueryText, designationQueryValues);

      //insert into application approval table
      const { sql, params } = buildInsertSql("coop.application_approval", {
        ...data,
        actionDate: new Date(),
        createdAt: new Date(),
        createdBy: user.userId,
        userId: user.userId,
        userType: user.type,
        originUnitId,
        officeId,
        designationId: next_app_designation_id || null,
      });

      const [result] = await (await transaction.query(sql, params)).rows;
      //designation id handle if its null, for final approval it will be null.

      let updateQuery = ``;
      let updateParams = [];
      if (data.designationId && data.designationId > 0 && serviceAction.applicationStatus != "C") {
        updateQuery = `UPDATE coop.application SET status = $1, edit_enable = $2,updated_at = $3, updated_by = $4, next_app_designation_id = $5 WHERE id = $6 returning data`;
        updateParams.push(
          serviceAction.applicationStatus,
          serviceAction.applicationStatus === "C" ? true : false,
          new Date(),
          user.userId,
          data.designationId,
          data.applicationId
        );
      } else if (serviceAction.applicationStatus === "C") {
        if (serviceId == 7) {
          updateQuery = `UPDATE coop.application SET next_app_designation_id=null, status = $1,edit_enable = $2, updated_at = $3, updated_by = $4 WHERE id = $5 returning data`;
          updateParams.push(
            serviceAction.applicationStatus,
            serviceAction.applicationStatus === "C" ? true : false,
            new Date(),
            user.userId,
            data.applicationId
          );
        } else if (serviceId == 10) {
          updateQuery = `UPDATE coop.application SET next_app_designation_id= $1, status = $2,edit_enable = $3, updated_at = $4, updated_by = $5 WHERE id = $6 returning data`;
          updateParams.push(
            data.designationId,
            // serviceAction.applicationStatus,
            "P",
            serviceAction.applicationStatus === "C" ? true : false,
            new Date(),
            user.userId,
            data.applicationId
          );
        } else {
          updateQuery = `UPDATE coop.application SET status = $1,edit_enable = $2, updated_at = $3, updated_by = $4 WHERE id = $5 returning data`;
          updateParams.push(
            serviceAction.applicationStatus,
            serviceAction.applicationStatus === "C" ? true : false,
            new Date(),
            user.userId,
            data.applicationId
          );
        }
      } else {
        updateQuery = `UPDATE coop.application SET status = $1,edit_enable = $2, updated_at = $3, updated_by = $4 WHERE id = $5 returning data`;
        updateParams.push(
          serviceAction.applicationStatus,
          serviceAction.applicationStatus === "C" ? true : false,
          new Date(),
          user.userId,
          data.applicationId
        );
      }
      const [applicationData] = await (await transaction.query(updateQuery, updateParams)).rows;

      if (serviceAction.applicationStatus === "O") {
        const updateQuery = `UPDATE coop.application SET next_app_designation_id= $1, status = $2, edit_enable = $3, updated_at = $4, updated_by = $5 WHERE id = $6 returning data`;
        const [applicationData] = await (
          await transaction.query(updateQuery, [
            data.designationId,
            "P",
            serviceAction.applicationStatus === "O" ? true : false,
            new Date(),
            user.userId,
            data.applicationId,
          ])
        ).rows;
      }

      //handle rejection
      if (serviceAction.applicationStatus === "R" && serviceAction.isFinalAction == true) {
        // const PendingApprovalService = Container.get(PendingApprovalServices);
        // await PendingApprovalService.archive(data.applicationId, transaction);

        const updateQuery = `UPDATE coop.application SET status = $1,edit_enable = $2, updated_at = $3, updated_by = $4 WHERE id = $5 returning data`;
        const [applicationData] = await (
          await transaction.query(updateQuery, [
            serviceAction.applicationStatus,
            false,
            new Date(),
            user.userId,
            data.applicationId,
          ])
        ).rows;

        //notification
      }

      //samity approval temp to main samity
      if (serviceAction.applicationStatus === "A" && serviceId === 2 && serviceAction.isFinalAction == true) {
        const {
          data: { samity_id: samityId },
        } = applicationData;

        if (!samityId) {
          throw new NotFoundError("Samity id not found");
        }

        const tempToMainSamityService = Container.get(TempToMainSamityServices);
        const authorizedPersonService = Container.get(AuthorizedPersonServices);

        const newSamityInfo = await tempToMainSamityService.transfer(samityId, transaction);

        mainSamityId = newSamityInfo.samityId;
        samityLevel = newSamityInfo.samityLevel;
        tempSamityId = samityId;
        // update samity table ByLaws
        tempToMainSamityService.updateByLawsData(mainSamityId, transaction);
        //application table samity_id update
        await transaction.query(`UPDATE coop.application SET samity_id = $1 WHERE id = $2`, [
          newSamityInfo.samityId,
          data.applicationId,
        ]);
      }

      //Samity Migration (data transfer from application to coop database)
      if (serviceAction.applicationStatus === "A" && serviceId === 6 && serviceAction.isFinalAction == true) {
        const SamityMigrationService = Container.get(SamityMigrationServices);

        const applicationSql = `select data from coop.application where id=$1`;
        const dataOfApplication = await (await transaction.query(applicationSql, [data.applicationId])).rows[0].data;

        const newSamityInfo = await SamityMigrationService.migration(
          dataOfApplication ? toCamelKeys(dataOfApplication) : {},
          transaction
        );

        //application table samity_id update
        await transaction.query(`UPDATE coop.application SET samity_id = $1 WHERE id = $2`, [
          newSamityInfo.samityId,
          data.applicationId,
        ]);
        mainSamityId = newSamityInfo.samityId;
        tempSamityId = null;
      }
      // samity member correction part
      if (serviceAction.applicationStatus === "A" && serviceId === 7 && serviceAction.isFinalAction == true) {
        const MemberInformationCorrectionService = Container.get(MemberInformationCorrectionServices);
        const createdBy = user.userId;
        const createdAt = new Date();
        const sql = `select samity_id,data from coop.application where id=$1`;
        const result = await (await transaction.query(sql, [data.applicationId])).rows[0];
        const applicationData = result ? toCamelKeys(result) : result;
        await MemberInformationCorrectionService.dataTransfer(
          applicationData.data,
          applicationData.samityId,
          transaction,
          createdBy,
          createdAt
        );
      }

      if (serviceAction.applicationStatus === "A" && serviceId === 8 && serviceAction.isFinalAction == true) {
        const EmployeeMigrationService = Container.get(EmployeeMigrationServices);

        const applicationSql = `select data from coop.application where id=$1`;
        const dataOfApplication = await (await transaction.query(applicationSql, [data.applicationId])).rows[0].data;

        await EmployeeMigrationService.migration(dataOfApplication ? toCamelKeys(dataOfApplication) : {}, transaction);
      }

      //member-information-correction
      if (
        serviceAction.applicationStatus === "A" &&
        (serviceId === 3 || serviceId === 4 || serviceId === 5 || serviceId === 9) &&
        serviceAction.isFinalAction == true
      ) {
        const createdBy = user.userId;
        const createdAt = new Date();
        const sql = `SELECT
                         a.doptor_id,
                         a.samity_id,
                         a.data,
                         b.service_rules->'duration' AS duration_obj
                       FROM
                         coop.application a
                       INNER JOIN coop.service_info b ON
                         a.service_id = b.id
                       WHERE
                         a.id = $1`;
        const result = (await transaction.query(sql, [data.applicationId])).rows[0];
        const applicationData = result ? toCamelKeys(result) : result;
        const CommitteeRequestService = Container.get(CommitteeRequestServices);
        const dataTransfer = await CommitteeRequestService.dataTransfer(
          applicationData.data,
          applicationData.samityId,
          transaction,
          createdBy,
          createdAt,
          applicationData.doptorId,
          applicationData.durationObj
        );
      }
      //***************** */ by lawsamendment approved developement by Hasibuzzaman **********
      if (serviceAction.applicationStatus === "A" && serviceId === 10 && serviceAction.isFinalAction == true) {
        const createdBy = user.userId;
        const createdAt = new Date();
        // *************** get report designation ********************************
        const degSql = `select a.name_bn,a.mobile,a.signature, a.seal,b.name_bn as designation from master.office_employee a inner join master.office_designation b
        on a.designation_id=b.id where a.id=$1`;
        const degResult = (await transaction.query(degSql, [user.employeeId])).rows[0];
        const DesignationDetails = await minioPresignedGet(toCamelKeys(degResult), ["seal", "signature"]);
        // *************** end report designation ********************************
        const sql = `SELECT
                         doptor_id,
                         samity_id,
                         next_app_designation_id,
                         data
                       FROM
                         coop.application
                       WHERE
                         id = $1`;
        const result = (await transaction.query(sql, [data.applicationId])).rows[0];
        const applicationData = result ? toCamelKeys(result) : result;
        // ***************** amendment_samity_code generate and update **************
        const amendmentSamityCodeSql = `select samity_code, amendment_samity_code from coop.samity_info where id=$1`;
        const amendmentSamityCode = (await transaction.query(amendmentSamityCodeSql, [applicationData.samityId]))
          .rows[0];

        let amendmentSamtyCodeArray;
        let amenedmentGenCode;
        if (amendmentSamityCode && amendmentSamityCode.amendment_samity_code) {
          // **************** Extract the last digit from the existing samityCode *****
          const samityCodeArray = amendmentSamityCode.amendment_samity_code;
          const lastDigit = parseInt(samityCodeArray[samityCodeArray.length - 1].samityCode.split("-")[1]);
          //************ Create a new object with an incremented samityCode ***********
          const newObject = {
            date: new Date(),
            samityCode: samityCodeArray[samityCodeArray.length - 1].samityCode.replace(
              `-${lastDigit}`,
              `-${lastDigit + 1}`
            ),
          };
          //********************** Add the new object to the data array **********************
          samityCodeArray.push(newObject);
          amendmentSamtyCodeArray = samityCodeArray;
          amenedmentGenCode = newObject.samityCode;
        } else {
          amendmentSamtyCodeArray = [
            {
              date: new Date(),
              samityCode: amendmentSamityCode.samity_code + "-" + 1,
            },
          ];
          amenedmentGenCode = amendmentSamityCode.samity_code + "-" + 1;
        }
        const samityId = applicationData.samityId;
        const byLaws = applicationData.data.byLaws;
        const memberArea = applicationData.data.memberArea;
        const workingArea = applicationData.data.workingArea;
        const samityInfo = applicationData.data.samityInfo;
        const documentList = applicationData.data.documentList;
        // ***************** isEdit all array key transform false *******
        const updateByeLaws = byLaws.map((item: any) => {
          const updatedData = item.data.map((subItem: any) => {
            const update =
              subItem.type === "partial" &&
              subItem.data.map((item: any) => {
                return {
                  ...item,
                  isEdit: false,
                  isOpen: false,
                };
              });
            return {
              ...subItem,
              isEdit: false,
              isOpen: false,
              ...(update && { data: update }),
            };
          });

          return {
            ...item,
            data: updatedData,
          };
        });
        //******************* */ update samity table **********************
        const { sql: samityUpdateSql, params: samityUpdateParams } = buildUpdateWithWhereSql(
          "coop.samity_info",
          { id: samityId },
          {
            ...samityInfo,
            byLaws: JSON.stringify(updateByeLaws),
            amendmentSamityCode: JSON.stringify(amendmentSamtyCodeArray),
          }
        );
        await transaction.query(samityUpdateSql, samityUpdateParams);
        //********************** update memberArea Table **********************
        for (let memberElement of memberArea) {
          if (memberElement.id) {
            const { sql: memberUpdateSql, params: memberUpdateParams } = buildUpdateWithWhereSql(
              "coop.member_area",
              { id: memberElement.id },
              { ...memberElement, updatedAt: createdAt, updatedBy: createdBy }
            );
            await transaction.query(memberUpdateSql, memberUpdateParams);
          } else {
            const { sql: memberInsertSql, params: memberInsertParams } = buildInsertSql("coop.member_area", {
              ...memberElement,
              samityId,
              createdAt,
              createdBy,
            });
            await transaction.query(memberInsertSql, memberInsertParams);
          }
        }
        ///////////////////////// update workingArea table ////////////////////////
        for (let workingElement of workingArea) {
          if (workingElement.id) {
            const { sql: workingUpdateSql, params: workingUpdateParams } = buildUpdateWithWhereSql(
              "coop.working_area",
              { id: workingElement.id },
              { ...workingElement, updatedAt: createdAt, updatedBy: createdBy }
            );
            await transaction.query(workingUpdateSql, workingUpdateParams);
          } else {
            const { sql: workingInsertSql, params: workingInsertParams } = buildInsertSql("coop.working_area", {
              ...workingElement,
              samityId,
              createdAt,
              createdBy,
            });
            await transaction.query(workingInsertSql, workingInsertParams);
          }
        }
        // update documentList table
        applicationData.data.documentList = [
          ...documentList.map((elements: any) => {
            return {
              samityId,
              documentId: elements.documentType,
              documentName: elements.documentPictureFrontName,
              documentNo: elements.documentNumber,
              createdAt,
              createdBy,
            };
          }),
        ];
        for (let docElement of applicationData.data.documentList) {
          if (docElement?.documentName) {
            const { sql: documentSql, params: documentParams } = buildInsertSql("coop.samity_document", docElement);
            await transaction.query(documentSql, documentParams);
          }
        }
        // update certificate here-------------------->>>>>>>>>>>>>>>>>>>>>>
        const samityDocumentService = Container.get(SamityDocumentsService);
        //2.22_by_lawsAmendementCertificate.pdf
        const amendmendCertificate = await samityDocumentService.getSamityAmendmentCertificate(
          samityId,
          tempSamityId,
          amenedmentGenCode
        );

        await this.insertSamityAmendmendDocument(
          samityId,
          (tempSamityId = samityId),
          amendmendCertificate.fileName,
          amenedmentGenCode,
          41,
          await pgConnect.getConnection("master")
        );
        // BylawsAmendment PDF from nodeJs
        const amendmendPdf = await samityDocumentService.getSamityByLawAmendment(samityId, DesignationDetails);
        await this.insertSamityAmendmendDocument(
          samityId,
          (tempSamityId = samityId),
          amendmendPdf.fileName,
          amenedmentGenCode,
          30,
          await pgConnect.getConnection("master")
        );
      }

      if (serviceAction.applicationStatus === "A" && serviceId === 11 && serviceAction.isFinalAction == true) {
        const createdBy = user.userId;
        const createdAt = new Date();
        const sql = `SELECT
                         doptor_id,
                         samity_id,
                         next_app_designation_id,
                         data
                       FROM
                         coop.application
                       WHERE
                         id = $1`;
        const result = (await transaction.query(sql, [data.applicationId])).rows[0];
        const applicationData = result ? toCamelKeys(result) : result;

        const sqlApproval = `SELECT
        remarks, designation_id
                       FROM
                         coop.application_approval
                       WHERE
                         application_id = $1`;
        const resultApproval = (await transaction.query(sqlApproval, [data.applicationId])).rows;
        const applicationDataApproval = resultApproval ? toCamelKeys(resultApproval) : resultApproval;
        const AbasyanService = Container.get(AbasayanServices);
        const dataTransfer = await AbasyanService.dataTransfer(
          applicationData.data,
          applicationData.samityId,
          applicationData.samityLevel,
          applicationData.samityType,
          applicationData.doptorId,
          applicationData.nextAppDesignationId,
          applicationDataApproval,
          new Date(),
          transaction,
          createdBy,
          createdAt
        );

        await transaction.query(`UPDATE coop.samity_info SET status = $1 WHERE id = $2`, [
          "I",
          applicationData.samityId,
        ]);
      }

      if (serviceAction.applicationStatus === "A" && serviceId === 12 && serviceAction.isFinalAction == true) {
        const createdBy = user.userId;
        const createdAt = new Date();
        const sql = `SELECT
                         doptor_id,
                         samity_id,
                         next_app_designation_id,
                         data
                       FROM
                         coop.application
                       WHERE
                         id = $1`;
        const result = (await transaction.query(sql, [data.applicationId])).rows[0];
        const applicationData = result ? toCamelKeys(result) : result;

        const sqlApproval = `SELECT
                         remarks, designation_id
                       FROM
                         coop.application_approval
                       WHERE
                         application_id = $1`;
        const resultApproval = (await transaction.query(sqlApproval, [data.applicationId])).rows;
        const applicationDataApproval = resultApproval ? toCamelKeys(resultApproval) : resultApproval;
        const InvestmentService = Container.get(InvestmentServices);
        const dataTransfer = await InvestmentService.dataTransfer(
          applicationData.data,
          applicationData.samityId,
          applicationData.samityLevel,
          applicationData.samityType,
          applicationData.doptorId,
          applicationDataApproval,
          new Date(),
          transaction,
          createdBy,
          createdAt
        );
      }

      if (serviceId == 13) {
        const auditService = await Container.get(AuditServices);
        await auditService.update(data, user, user.userId);
      }

      // ************************ audit accounts approved Development by Hasibuzzman *************
      if (serviceAction.applicationStatus === "A" && serviceId === 14 && serviceAction.isFinalAction == true) {
        const createdBy = user.userId;
        const createdAt = new Date();
        const sql = `SELECT
                         doptor_id,
                         samity_id,
                         next_app_designation_id,
                         data
                       FROM
                         coop.application
                       WHERE
                         id = $1`;
        const result = (await transaction.query(sql, [data.applicationId])).rows[0];
        const applicationData = result ? toCamelKeys(result) : result;
        // find glTransation id from gl_transaction  table
        const glSql = `SELECT id FROM coop.gl_transaction WHERE samity_id=$1`;
        const glIdFindResult = (await transaction.query(glSql, [applicationData.samityId])).rows[0];
        // data delete and insert into archive table
        if (glIdFindResult && glIdFindResult.id) {
          const insertSql = `INSERT INTO coop.gl_transaction_archive (samity_id,glac_id,return_type,tran_date,tran_amount,drcr_code,status,remarks,created_by,created_at,updated_by,updated_at) 
          SELECT samity_id,glac_id,return_type,tran_date,tran_amount,drcr_code,status,remarks,created_by,created_at,updated_by,updated_at FROM coop.gl_transaction WHERE samity_id=$1`;
          const inserResult = await transaction.query(insertSql, [applicationData.samityId]);

          const deleteSql = `DELETE FROM coop.gl_transaction WHERE samity_id=$1`;
          const deleteResult = await transaction.query(deleteSql, [applicationData.samityId]);
        }
        // **************************************** Insrt part ********************************
        // insert asset data
        for (let element of applicationData.data.asset) {
          const { sql: assetSql, params: assetParams } = buildInsertSql("coop.gl_transaction", {
            ...omit(element, "glacIdError", "tranAmountError"),
            createdBy,
            createdAt,
          });
          await transaction.query(assetSql, assetParams);
        }
        // insert libality data
        for (let element of applicationData.data.libality) {
          const { sql: libalitySql, params: libalityParams } = buildInsertSql("coop.gl_transaction", {
            ...omit(element, "glacIdError", "tranAmountError"),
            createdBy,
            createdAt,
          });
          await transaction.query(libalitySql, libalityParams);
        }
        // insert income data
        for (let element of applicationData.data.income) {
          const { sql: incomeSql, params: incomeParams } = buildInsertSql("coop.gl_transaction", {
            ...omit(element, "glacIdError", "tranAmountError"),
            createdBy,
            createdAt,
          });
          await transaction.query(incomeSql, incomeParams);
        }
        // insert expense data
        for (let element of applicationData.data.expense) {
          const { sql: expenseSql, params: expenseParams } = buildInsertSql("coop.gl_transaction", {
            ...omit(element, "glacIdError", "tranAmountError"),
            createdBy,
            createdAt,
          });
          await transaction.query(expenseSql, expenseParams);
        }
      }

      if (serviceAction.applicationStatus === "A" && serviceId === 15 && serviceAction.isFinalAction == true) {
        const createdBy = user.userId;
        const createdAt = new Date();
        const sql = `SELECT
                         doptor_id,
                         samity_id,
                         next_app_designation_id,
                         data
                       FROM
                         coop.application
                       WHERE
                         id = $1`;
        const result = (await transaction.query(sql, [data.applicationId])).rows[0];
        const applicationData = result ? toCamelKeys(result) : result;

        const transactionService = Container.get(TransactionService);
        const getGlInfoSql = `SELECT id FROM loan.glac_mst WHERE doptor_id = $1 AND glac_name = $2`;
        const batchNum = await transactionService.generateBatchNumber(transaction);
        const tranNum = await transactionService.generateTransactionNumber(transaction);
        let transactionSets: any = [];

        //audit fee GL get
        if (applicationData?.data?.feeInfo?.auditFee) {
          const auditDrGlId = (
            await transaction.query(getGlInfoSql, [applicationData.doptorId, "নিরীক্ষা ফি (সমবায় সমিতি)"])
          ).rows[0]?.id;
          if (!auditDrGlId) throw new BadRequestError("নিরীক্ষা ফি এর ডেবিট জিএল পাওয়া যায়নি");
          const auditCrGlId = (await transaction.query(getGlInfoSql, [applicationData.doptorId, "নিরীক্ষা ফি আয়"]))
            .rows[0]?.id;
          if (!auditCrGlId) throw new BadRequestError("নিরীক্ষা ফি এর ক্রেডিট জিএল পাওয়া যায়নি");
          transactionSets = [
            {
              drcrCode: "D",
              naration: "",
              glacId: auditDrGlId,
              batchNum,
              tranNum: tranNum,
              tranAmt: applicationData?.data?.feeInfo?.auditFeeCollection,
              tranCode: "",
              tranType: applicationData?.data?.feeType,
            },
            {
              naration: "",
              drcrCode: "C",
              glacId: auditCrGlId,
              batchNum,
              tranNum: tranNum,
              tranAmt: applicationData?.data?.feeInfo?.auditFeeCollection,
              tranCode: "",
              tranType: applicationData?.data?.feeType,
            },
          ];
        }

        //cdf fee GL get
        if (applicationData?.data?.feeInfo?.cdfFee) {
          const cdfDrGlId = (
            await transaction.query(getGlInfoSql, [applicationData.doptorId, "সিডিএফ ফি (সমবায় সমিতি)"])
          ).rows[0]?.id;
          if (!cdfDrGlId) throw new BadRequestError("সিডিএফ ফি এর ডেবিট জিএল পাওয়া যায়নি");
          const cdfCrGlId = (await transaction.query(getGlInfoSql, [applicationData.doptorId, "সিডিএফ ফি আয়"])).rows[0]
            ?.id;
          if (!cdfCrGlId) throw new BadRequestError("সিডিএফ ফি এর ক্রেডিট জিএল পাওয়া যায়নি");
          transactionSets = [
            {
              drcrCode: "D",
              naration: "",
              glacId: cdfDrGlId,
              batchNum,
              tranNum: tranNum,
              tranAmt: applicationData?.data?.feeInfo?.cdfFeeCollection,
              tranCode: "",
              tranType: applicationData?.data?.feeType,
            },
            {
              naration: "",
              drcrCode: "C",
              glacId: cdfCrGlId,
              batchNum,
              tranNum: tranNum,
              tranAmt: applicationData?.data?.feeInfo?.cdfFeeCollection,
              tranCode: "",
              tranType: applicationData?.data?.feeType,
            },
          ];
        }

        let transactionData = (await transactionService.generalTransactionEngine(
          applicationData.doptorId,
          applicationData.data.offceId,
          0,
          applicationData.data.userId,
          null,
          transactionSets,
          transaction
        )) as any;
        let tranDate;
        if (transactionData && transactionData[0]) {
          tranDate = moment(transactionData[0].tranDate).format("DD/MM/YYYY");
        }

        const auditFeeOutstandingFixed =
          applicationData?.data?.feeInfo?.auditFee -
          applicationData?.data?.feeInfo?.auditFeeCollection -
          applicationData?.data?.feeInfo?.auditFeeWaiver;

        const cdfFeeOutstandingFixed =
          applicationData?.data?.feeInfo?.cdfFee -
          applicationData?.data?.feeInfo?.cdfFeeCollection -
          applicationData?.data?.feeInfo?.cdfFeeWaiver;

        const { sql: updateAuditInfoSql, params: updateAuditInfoParams } = buildUpdateWithWhereSql(
          "coop.audit_info",
          { applicationId: applicationData?.data?.refAppId },
          {
            income: applicationData?.data?.income,
            expense: applicationData?.data?.expense,
            ...(applicationData?.data?.feeInfo?.auditFee && {
              auditFee: applicationData?.data?.feeInfo?.auditFee,
              auditFeeCollection: applicationData?.data?.feeInfo?.auditFeeCollection,
              auditFeeWaiver: applicationData?.data?.feeInfo?.auditFeeWaiver,
              auditFeeOutstanding: auditFeeOutstandingFixed,
              auditTranNum: tranNum,
              auditTranDate: tranDate,
            }),
            ...(applicationData?.data?.feeInfo?.cdfFee && {
              cdfFee: applicationData?.data?.feeInfo?.cdfee,
              cdfFeeCollection: applicationData?.data?.feeInfo?.cdfFeeCollection,
              cdfFeeWaiver: applicationData?.data?.feeInfo?.cdfFeeWaiver,
              cdfFeeOutstanding: cdfFeeOutstandingFixed,
              cdfTranNum: tranNum,
              cdfTranDate: tranDate,
            }),
          }
        );

        await transaction.query(updateAuditInfoSql, updateAuditInfoParams);
      }
      await transaction.query("COMMIT");

      //notification
      const notification = Container.get(NotificationService);
      await notification.create(serviceAction.notification, {
        userType: applicationData.data.user_type as "citizen" | "user",
        userId: applicationData.data.user_id,
        doptorId: user.doptorId,
        componentId,
        serviceId,
        applicationStatus: serviceAction.applicationStatus,
        applicationId: data.applicationId,
        serviceActionId: data.serviceActionId,
        message: await notification.createCustomNotificationMessage(serviceId, data.applicationId),
        createdBy: user.userId.toString(),
      });
      //notification end

      // jasper report Generate

      if (mainSamityId && tempSamityId) {
        const samityDocumentService = Container.get(SamityDocumentsService);

        //2.2_By_Law_Primary_Samity.pdf
        const byLawCertificate = await samityDocumentService.getPrimarySamityByLaw(mainSamityId, tempSamityId);
        await this.insertSamityDocument(
          mainSamityId,
          tempSamityId,
          byLawCertificate.fileName,
          30,
          await pgConnect.getConnection("master")
        );

        //2.10_samity_registration_certificate.pdf
        const committeeCertificate = await samityDocumentService.getSamityRegistrationCertificate(
          mainSamityId,
          tempSamityId
        );
        await this.insertSamityDocument(
          mainSamityId,
          tempSamityId,
          committeeCertificate.fileName,
          18,
          await pgConnect.getConnection("master")
        );

        // 2.13_InformationSlip.pdf
        const informationSlip = await samityDocumentService.getInformationSlip(mainSamityId, tempSamityId);
        await this.insertSamityDocument(
          mainSamityId,
          tempSamityId,
          informationSlip.fileName,
          19,
          await pgConnect.getConnection("master")
        );
        //2.14_CommitteeOrder_FinalApproval.pdf
        const committeeOrder = await samityDocumentService.getCommitteeOrderFinalApproval(
          mainSamityId,
          tempSamityId,
          samityLevel
        );
        await this.insertSamityDocument(
          mainSamityId,
          tempSamityId,
          committeeOrder.fileName,
          0,
          await pgConnect.getConnection("master")
        );
      }

      return result ? toCamelKeys(result) : {};
    } catch (error: any) {
      transaction.query("ROLLBACK");
      throw new BadRequestError(error);
    } finally {
      transaction.release();
    }
  }

  async getByApplicationId(applicationId: number, isReportFromArchive: boolean) {
    const query = `select
                    0 id,
                    (
                    select
                      case
                        when a.data->>'user_type' = 'user'
                       then (
                        select
                          name as applicant_name
                        from
                          users.user
                        where
                          id =(a.data->>'user_id')::integer
                        )
                        when a.data->>'user_type' = 'citizen'
                       then (
                        select
                          name as applicant_name
                        from
                          users.user
                        where
                          id =(a.data->>'user_id')::integer
                        )
                      end as sender
                      ), 
                      d.name_bn as reciver ,
                      h.name_bn as reciver_designation,
                      '' as sender_office_name,
                    a.created_at as action_date,
                      '' as remarks,
                      '' as attachment,
                      'আবেদন করা হয়েছে' as action_text
                  from
                    coop.application a
                  inner join master.doptor_info b on
                    a.doptor_id = b.id
                  inner join coop.service_info c on
                    a.service_id = c.id
                  left join master.office_employee d on
                    d.designation_id = a.next_app_designation_id
                  left join master.office_designation h on
                    h.id = a.next_app_designation_id
                  where
                    a.id = $1
                  union
                  
                  select
                    a.id,
                    b.name as sender,
                    d.name_bn as reciver,
                    h.name_bn as reciver_designation,
                    c.name_bn as sender_office_name,
                    a.action_date,
                    a.remarks,
                    a.attachment,
                    arr.item_object->>'action_text' as action_text
                  from
                    coop.application_approval a
                  inner join users.user b on
                    b.id = a.user_id
                  left join master.office_info c on
                    c.id = a.office_id
                  inner join coop.application f on
                    f.id = a.application_id
                  inner join coop.service_info g on
                    g.id = f.service_id
                  left join master.office_employee d on
                    d.designation_id = a.designation_id
                  left join master.office_designation h on
                    h.id = a.designation_id
                  join jsonb_array_elements(g.service_action)
                                     with ordinality arr(item_object,
                    position) on
                    (arr.item_object->>'id')::int  = a.service_action_id
                  where
                    application_id = $2 and a.user_type='user'
                    
                    union
                  
                    select
                      a.id,
                      b.name as sender,
                      d.name_bn as reciver,
                      h.name_bn as reciver_designation,
                      c.name_bn as sender_office_name,
                      a.action_date,
                      a.remarks,
                      a.attachment,
                      arr.item_object->>'action_text' as action_text
                    from
                      coop.application_approval a
                    inner join users.user b on
                      b.id = a.user_id
                    left join master.office_info c on
                      c.id = a.office_id
                    inner join coop.application f on
                      f.id = a.application_id
                    inner join coop.service_info g on
                      g.id = f.service_id
                    left join master.office_employee d on
                      d.designation_id = a.designation_id
                    left join master.office_designation h on
                      h.id = a.designation_id
                    join jsonb_array_elements(g.service_action)
                                       with ordinality arr(item_object,
                      position) on
                      (arr.item_object->>'id')::int  = a.service_action_id
                    where
                      application_id = $2 and a.user_type='citizen'`;

    let data: any;

    data = isReportFromArchive
      ? (await (await pgConnect.getConnection("archive")).query(query, [applicationId, applicationId])).rows
      : (await (await pgConnect.getConnection("slave")).query(query, [applicationId, applicationId])).rows;
    return data ? toCamelKeys(data) : data;
  }

  //   async getAuditInfoById(applicationId: number) {
  //     const auditInfoSql = `SELECT income,
  //     expense,
  //     audit_fee,
  //     cdf_fee
  // FROM coop.audit_info
  // WHERE end_year = CAST(DATE_PART('YEAR', now()) AS text)
  // AND application_id = $1`;
  //     const auditInfoData = (
  //       await (
  //         await pgConnect.getConnection("slave")
  //       ).query(auditInfoSql, [applicationId, applicationId])
  //     ).rows;

  //     return auditInfoData ? toCamelKeys(auditInfoData) : auditInfoData;
  //   }

  async getNeedForCorrection(applicationId: number, user: any) {
    const listOfTheApplicantSql = `select
                                 a.id as approval_id,
                                 a.designation_id,
                                 b.name_bn as designation,
                                 c.name_bn ,
                                 c.id as employee_id
                               from
                                 coop.application_approval a
                               inner join master.office_designation b on
                                 a.designation_id = b.id
                               inner join master.office_employee c on
                                 a.designation_id = c.designation_id
                               where
                                 a.application_id = $1
                               union
                               select
                                 0 as approval_id,
                                 0 designation_id,
                                 'সংগঠক' as designation,
                                 b.name name_bn,
                                 0 as employee_id
                               from
                                 coop.application a
                               inner join users.user b on
                                 (a.data->>'user_id')::int = b.id
                               where
                                 a.id = $2
                                 and a.data->>'user_type' = 'citizen'
                               union
                               select
                                 0 as approval_id,
                                 b.designation_id,
                                 c.name_bn as designation,
                                 b.name name_bn,
                                 b.employee_id
                               from
                                 coop.application a
                               inner join users.user b on
                                 (a.data->>'user_id')::int = b.id
                               inner join master.office_designation c on
                                 b.designation_id = c.id
                               where
                                 a.id = $3
                                 and a.data->>'user_type' = 'user'`;
    const listOfTheApplicant = (
      await (
        await pgConnect.getConnection("slave")
      ).query(listOfTheApplicantSql, [applicationId, applicationId, applicationId])
    ).rows;

    return listOfTheApplicant ? toCamelKeys(listOfTheApplicant) : listOfTheApplicant;
  }

  async insertSamityDocument(
    newSamityId: number,
    tempSamityId: number,
    fileName: string | null,
    documentId: number,
    transaction: any
  ) {
    if (fileName) {
      const { sql, params } = buildInsertSql("coop.samity_document", {
        samityId: newSamityId,
        documentId,
        documentName: fileName,
        createdBy: tempSamityId,
        createdAt: new Date(),
      });

      await transaction.query(sql, params);
    }
  }
  async insertSamityAmendmendDocument(
    newSamityId: number,
    tempSamityId: number,
    fileName: string | null,
    documentNo: string | null,
    documentId: number,
    transaction: any
  ) {
    if (fileName) {
      const { sql, params } = buildInsertSql("coop.samity_document", {
        samityId: newSamityId,
        documentId,
        documentName: fileName,
        documentNo,
        createdBy: tempSamityId,
        createdAt: new Date(),
      });

      await transaction.query(sql, params);
    }
  }

  async isUserAuthorizeForApproveSamityRegistration(applicationId: number, user: any) {
    const sql = `SELECT
                 (DATA->>'samity_id')::int AS samity_id
               FROM
                 coop.application
               WHERE
                 id=$1 AND
                 service_id = $2`;
    const { samity_id: samityId } = (await (await pgConnect.getConnection("slave")).query(sql, [applicationId, 2]))
      .rows[0];

    const sqlForSamityData = `SELECT
                              a.project_id,
                              a.samity_level,
                              b.division_id,
                              b.district_id,
                              b.upa_city_id
                            FROM
                              temps.samity_info a
                            INNER JOIN temps.working_area b ON
                              b.samity_id = a.id
                            WHERE
                              a.id = $1`;
    const result = (await (await pgConnect.getConnection("slave")).query(sqlForSamityData, [samityId])).rows;

    const samityData: any = result ? toCamelKeys(result) : result;

    const designationHeadSql = `SELECT
                               is_office_head
                              FROM
                               master.office_designation
                              WHERE 
                               id=$1`;
    const { is_office_head: designationHead } = (
      await (await pgConnect.getConnection("slave")).query(designationHeadSql, [user.designationId])
    ).rows[0];

    let isDivisionIdUnique = true;
    let isDistrictIdUnique = true;
    let isUpazilaIdUnique = true;
    let firstDivisionId = result[0].divisionId;
    let firstDistrictId = result[0].districtId;
    let firstUpazilaId = result[0].upazilaId;

    for (let j = 1; j < result.length; j++) {
      if (result[j].divisionId != firstDivisionId) {
        isDivisionIdUnique = false;
      } else {
        if (result[j].districtId != firstDistrictId) {
          isDistrictIdUnique = false;
        } else {
          if (result[j].upazilaId != firstUpazilaId) {
            isUpazilaIdUnique = false;
          }
        }
      }
    }

    let approveOfficeLayerId;
    let isUserCanApprove = false;

    if (
      samityData[0].projectId &&
      isDivisionIdUnique &&
      isDistrictIdUnique &&
      isUpazilaIdUnique &&
      samityData[0].samityLevel == "P"
    ) {
      approveOfficeLayerId = 6;
      if (user.layerId === 6 && designationHead == 1) {
        isUserCanApprove = true;
      }
    } else if (
      !samityData[0].projectId &&
      samityData[0].samityLevel == "P" &&
      isDivisionIdUnique &&
      isDistrictIdUnique
    ) {
      approveOfficeLayerId = 3;
      if (user.layerId === 3 && designationHead == 1) {
        isUserCanApprove = true;
      }
    } else if (
      (samityData[0].samityLevel == "C" && isDivisionIdUnique) ||
      (isDivisionIdUnique && !isDistrictIdUnique)
    ) {
      approveOfficeLayerId = 5;
      if (user.layerId === 5 && designationHead == 1) {
        isUserCanApprove = true;
      }
    } else {
      approveOfficeLayerId = 7;
      if (user.layerId === 7 && designationHead == 1) {
        isUserCanApprove = true;
      }
    }

    const officeLayerSql = `SELECT name_bn as office_layer_name FROM master.office_layer WHERE id=$1`;
    const { office_layer_name: approveOfficeLayerName } = (
      await (await pgConnect.getConnection("slave")).query(officeLayerSql, [approveOfficeLayerId])
    ).rows[0];

    return {
      approveOfficeLayerId,
      approveOfficeLayerName,
      isUserCanApprove,
    };
  }

  async isUserAuthorizeForApproveCommitteeFormation(applicationId: number, user: any, serviceId: number) {
    const sql = `SELECT
                   a.samity_id,
                   b.share_price,
                   b.project_id,
                   b.samity_level,
                   c.division_id,
                   c.district_id,
                   c.upa_city_id
                 FROM
                   coop.application a
                 INNER JOIN coop.samity_info b ON
                   a.samity_id = b.id
                 INNER JOIN coop.working_area c ON
                   c.samity_id = b.id
                 WHERE
                   a.id = $1
                   AND a.service_id = $2`;
    let result: any = (await (await pgConnect.getConnection("slave")).query(sql, [applicationId, serviceId])).rows;
    result = result.length > 0 ? toCamelKeys(result) : result;

    const designationHeadSql = `SELECT
                                 is_office_head
                                FROM
                                 master.office_designation
                                WHERE 
                                 id=$1`;
    const { is_office_head: designationHead } = (
      await (await pgConnect.getConnection("slave")).query(designationHeadSql, [user.designationId])
    ).rows[0];

    let isDivisionIdUnique = true;
    let isDistrictIdUnique = true;
    let isUpazilaIdUnique = true;
    let firstDivisionId = result[0].divisionId;
    let firstDistrictId = result[0].districtId;
    let firstUpazilaId = result[0].upazilaId;

    for (let j = 1; j < result.length; j++) {
      if (result[j].divisionId != firstDivisionId) {
        isDivisionIdUnique = false;
      } else {
        if (result[j].districtId != firstDistrictId) {
          isDistrictIdUnique = false;
        } else {
          if (result[j].upazilaId != firstUpazilaId) {
            isUpazilaIdUnique = false;
          }
        }
      }
    }

    let approveOfficeLayerId;
    let isUserCanApprove = false;
    if (serviceId == 3 || serviceId == 5) {
      if (
        isDivisionIdUnique &&
        isDistrictIdUnique &&
        isUpazilaIdUnique &&
        result[0].samityLevel == "P" &&
        result[0].sharePrice <= 50000
      ) {
        approveOfficeLayerId = 6;
        if (user.layerId === 6 && designationHead == 1) {
          isUserCanApprove = true;
        }
      } else if (
        (result[0].samityLevel == "P" && isDivisionIdUnique && isDistrictIdUnique && !isUpazilaIdUnique) ||
        result[0].sharePrice > 50000
      ) {
        approveOfficeLayerId = 3;
        if (user.layerId === 3 && designationHead == 1) {
          isUserCanApprove = true;
        }
      } else if (result[0].samityLevel == "C") {
        approveOfficeLayerId = 3;
        if (user.layerId === 3 && designationHead == 1) {
          isUserCanApprove = true;
        }
      } else if (isDivisionIdUnique && !isDistrictIdUnique) {
        approveOfficeLayerId = 5;
        if (user.layerId === 5 && designationHead == 1) {
          isUserCanApprove = true;
        }
      } else {
        approveOfficeLayerId = 1;
      }
    } else if (serviceId == 4 || serviceId == 9) {
      if (result[0].samityLevel == "P" && result[0].sharePrice <= 50000) {
        approveOfficeLayerId = 6;
        if (user.layerId === 6 && designationHead == 1) {
          isUserCanApprove = true;
        }
      } else {
        approveOfficeLayerId = 3;
        if (user.layerId === 3 && designationHead == 1) {
          isUserCanApprove = true;
        }
      }
    }

    const officeLayerSql = `SELECT name_bn as office_layer_name FROM master.office_layer WHERE id=$1`;
    const { office_layer_name: approveOfficeLayerName } = (
      await (await pgConnect.getConnection("slave")).query(officeLayerSql, [approveOfficeLayerId])
    ).rows[0];

    return {
      approveOfficeLayerId,
      approveOfficeLayerName,
      isUserCanApprove,
    };
  }
}
export { AuditServices };
