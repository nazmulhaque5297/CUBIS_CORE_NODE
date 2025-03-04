import { toCamelKeys, toSnakeCase } from "keys-transform";
import _ from "lodash";
import { PoolClient } from "pg";
import { BadRequestError, buildGetSql, buildUpdateWithWhereSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { getFileName } from "../../../../utils/file.util";
import { uploadObject } from "../../../../utils/minio.util";
import { buildInsertSql } from "../../../../utils/sql-builder.util";

@Service()
export class SamityMigrationServices {
  constructor() {}

  // need to make the any to interface
  async create(data: any, user: any) {
    data.officeId = user.officeId;
    data.createdAt = new Date();

    //add column to samityInfo

    const {
      samityDivisionNameBangla,
      samityDistrictNameBangla,
      samityUpaCityNameBangla,
      samityUniThanaPawNameBangla,
      samityTypeName,
      enterPrisingNameBangla,
      projectNameBangla,
    } = await this.requiredSamityInfoData(
      data.samityInfo.samityDivisionId,
      data.samityInfo.samityDistrictId,
      data.samityInfo.samityUpaCityId ? data.samityInfo.samityUpaCityId : 2753,
      data.samityInfo.samityUniThanaPawId,
      data.samityInfo.samityTypeId,
      data.samityInfo.enterprisingId,
      data.samityInfo.projectId
    );

    data.samityInfo = {
      ...data.samityInfo,
      officeId: user.officeId,
      organizerId: user.userId,
      doptorId: user.doptorId,
      samityDivisionNameBangla,
      samityDistrictNameBangla,
      samityUpaCityNameBangla,
      samityUniThanaPawNameBangla,
      samityTypeName,
      enterPrisingNameBangla,
      projectNameBangla,
    };

    //add column to member Area

    for (const [index, element] of data.memberArea.entries()) {
      const { divisionNameBangla, districtNameBangla, upaCityNameBangla, uniThanaPawNameBangla } =
        await this.requiredAreaData(
          element.divisionId,
          element.districtId ? element.districtId : 0,
          element.upaCityId ? element.upaCityId : 0,
          element.uniThanaPawId ? element.uniThanaPawId : 0
        );
      data.memberArea[index] = {
        ...element,
        divisionNameBangla,
        districtNameBangla,
        upaCityNameBangla,
        uniThanaPawNameBangla,
      };
    }

    // add column to working Area

    for (const [index, element] of data.workingArea.entries()) {
      const { divisionNameBangla, districtNameBangla, upaCityNameBangla, uniThanaPawNameBangla } =
        await this.requiredAreaData(
          element.divisionId,
          element.districtId ? element.districtId : 0,
          element.upaCityId ? element.upaCityId : 0,
          element.uniThanaPawId ? element.uniThanaPawId : 0
        );
      data.workingArea[index] = {
        ...element,
        divisionNameBangla,
        districtNameBangla,
        upaCityNameBangla,
        uniThanaPawNameBangla,
      };
    }

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

    data.memberInfo = {
      ...data.memberInfo,
      doptorId: user.doptorId,
    };

    return data;
  }

  async update(id: number, reqBody: any, user: any, updatedBy: any): Promise<any[]> {
    try {
      let result = [];
      const updatedAt = new Date();

      const data = reqBody.data;
      data.userId = user.userId;
      data.officeId = user.officeId;

      //add column to samityInfo

      const {
        samityDivisionNameBangla,
        samityDistrictNameBangla,
        samityUpaCityNameBangla,
        samityUniThanaPawNameBangla,
        samityTypeName,
        enterPrisingNameBangla,
        projectNameBangla,
      } = await this.requiredSamityInfoData(
        data.samityInfo.samityDivisionId,
        data.samityInfo.samityDistrictId,
        data.samityInfo.samityUpaCityId,
        data.samityInfo.samityUniThanaPawId,
        data.samityInfo.samityTypeId,
        data.samityInfo.enterprisingId,
        data.samityInfo.projectId
      );

      data.samityInfo = {
        ...data.samityInfo,
        officeId: user.officeId,
        organizerId: user.userId,
        doptorId: user.doptorId,
        samityDivisionNameBangla,
        samityDistrictNameBangla,
        samityUpaCityNameBangla,
        samityUniThanaPawNameBangla,
        samityTypeName,
        enterPrisingNameBangla,
        projectNameBangla,
      };

      //add column to member Area

      for (const [index, element] of data.memberArea.entries()) {
        const { divisionNameBangla, districtNameBangla, upaCityNameBangla, uniThanaPawNameBangla } =
          await this.requiredAreaData(
            element.divisionId,
            element.districtId ? element.districtId : 0,
            element.upaCityId ? element.upaCityId : 0,
            element.uniThanaPawId ? element.uniThanaPawId : 0
          );
        data.memberArea[index] = {
          ...element,
          divisionNameBangla,
          districtNameBangla,
          upaCityNameBangla,
          uniThanaPawNameBangla,
        };
      }

      // add column to working Area

      for (const [index, element] of data.workingArea.entries()) {
        const { divisionNameBangla, districtNameBangla, upaCityNameBangla, uniThanaPawNameBangla } =
          await this.requiredAreaData(
            element.divisionId,
            element.districtId ? element.districtId : 0,
            element.upaCityId ? element.upaCityId : 0,
            element.uniThanaPawId ? element.uniThanaPawId : 0
          );
        data.workingArea[index] = {
          ...element,
          divisionNameBangla,
          districtNameBangla,
          upaCityNameBangla,
          uniThanaPawNameBangla,
        };
      }

      const applicationSql = `select id,status,created_by,data from coop.application where id=$1`;
      const applicationData = await (
        await (await pgConnect.getConnection("master")).query(applicationSql, [id])
      ).rows[0];

      const documentInfo: any[] = applicationData.data.document_info
        ? toCamelKeys(applicationData.data.document_info)
        : applicationData.data.document_info;

      for (const element of data.documentInfo) {
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
              nextAppDesignationId: reqBody.nextAppDesignationId,
              updatedBy,
              updatedAt,
            }
          );

          result.push(await (await (await pgConnect.getConnection("master")).query(sql, params)).rows);
        }
      }

      return result;
    } catch (ex: any) {
      throw new BadRequestError(ex);
    }
  }

  async migration(applicationData: any, transaction: PoolClient) {
    let samityInfoData = _.omit(
      applicationData.samityInfo,
      "samityDivisionNameBangla",
      "samityDistrictNameBangla",
      "samityUpaCityNameBangla",
      "samityUniThanaPawNameBangla",
      "samityTypeName",
      "enterPrisingNameBangla",
      "projectNameBangla",
      "isMemberAreaAndWorkingAreaSame"
    );
    function extractYear(dateString: string) {
      const match = dateString.match(/\d{4}/); // Match four consecutive digits for the year
      if (match) {
        return match[0];
      } else {
        return null; // Handle cases where a year is not found
      }
    }

    const memberInfoDataFromApplication = applicationData.memberInfo;
    const memberAreaDataFromApplication = applicationData.memberArea;
    const workingAreaDataFromApplication = applicationData.workingArea;
    const committeeInfoDataFromApplication = applicationData.committeeRegistration;
    const documentDataFromApplication = applicationData.documentInfo;

    const samityPreRegistrationDate = applicationData.samityInfo.samityRegistrationDate;
    const regdate = new Date(samityPreRegistrationDate);
    const regYear: any = extractYear(samityPreRegistrationDate);
    // regdate.getFullYear();

    const createdBy = applicationData.userId;
    const createdAt = new Date();

    //samity Creation
    //Take the district and upazila from office id of samityInfo
    const infoOfOffice = `SELECT district_id,upazila_id from master.office_info where id=$1`;
    const dataOfOffice = await (await transaction.query(infoOfOffice, [applicationData.officeId])).rows[0];

    //add samityCode, district and upazila to samityInfo
    const samityCode = await this.samityCodeGenerator(
      samityInfoData.samityTypeId,
      samityInfoData.samityLevel,
      samityInfoData.samityDistrictId,
      samityInfoData.samityUpaCityId,
      samityInfoData.samityUpaCityType,
      samityInfoData.samityUniThanaPawId,
      transaction,
      regYear
    );
    samityInfoData = {
      ...samityInfoData,
      samityCode,
      districtId: dataOfOffice.district_id,
      upazilaId: dataOfOffice.upazila_id,
      isManual: true,
      createdBy,
      createdAt,
    };

    const { sql: samityCreationSql, params: samityCreationParams } = buildInsertSql("coop.samity_info", {
      ...samityInfoData,
      status: "A",
    });

    const samityResult = await (await transaction.query(samityCreationSql, samityCreationParams)).rows[0];

    const migrateSamityInfo = samityResult ? toCamelKeys(samityResult) : samityResult;

    const memberInfoDataFromDatabase = [];
    const memberAreaDataFromDatabase = [];
    const workingAreaDataFromDatabase = [];

    //member Area

    for (const element of memberAreaDataFromApplication) {
      let data = _.omit(
        element,
        "divisionNameBangla",
        "districtNameBangla",
        "upaCityNameBangla",
        "uniThanaPawNameBangla"
      );
      data = { ...data, samityId: migrateSamityInfo.id, createdBy, createdAt };
      const { sql: memberAreaSql, params: memberAreaParams } = buildInsertSql("coop.member_area", data);

      const memberAreaResult = await (await transaction.query(memberAreaSql, memberAreaParams)).rows[0];

      memberAreaDataFromDatabase.push(memberAreaResult ? toCamelKeys(memberAreaResult) : memberAreaResult);
    }

    //workingArea

    for (const element of workingAreaDataFromApplication) {
      let data = _.omit(
        element,
        "divisionNameBangla",
        "districtNameBangla",
        "upaCityNameBangla",
        "uniThanaPawNameBangla"
      );
      data = { ...data, samityId: migrateSamityInfo.id, createdBy, createdAt };
      const { sql: workingAreaSql, params: workingAreaParams } = buildInsertSql("coop.working_area", data);

      const workingAreaResult = await (await transaction.query(workingAreaSql, workingAreaParams)).rows[0];

      workingAreaDataFromDatabase.push(workingAreaResult ? toCamelKeys(workingAreaResult) : workingAreaResult);
    }

    //member Creation
    let infoData = _.omit(memberInfoDataFromApplication, "isAuthorizer");
    let memberCreateData;

    if (samityInfoData.samityLevel == "P") {
      infoData = {
        memberCode: 1,
        ...infoData,
        samityId: migrateSamityInfo.id,
        isActive: true,
        createdBy,
        createdAt,
      };

      const { sql: memberInfoSql, params: memberInfoParams } = buildInsertSql("coop.member_info", infoData);

      // member insert
      if (samityInfoData.isManual) {
        if (samityInfoData.samityEffectiveness === "A")
          memberCreateData = await (await transaction.query(memberInfoSql, memberInfoParams)).rows[0];
      } else {
        memberCreateData = await (await transaction.query(memberInfoSql, memberInfoParams)).rows[0];
      }
    } else if (samityInfoData.samityLevel == "C" || samityInfoData.samityLevel == "N") {
      const samityInfoSql = `select samity_name, mobile, email from coop.samity_info where id=$1`;
      const {
        samity_name: samityName,
        mobile: mobile,
        email: email,
      } = await (await transaction.query(samityInfoSql, [memberInfoDataFromApplication.refSamityId])).rows[0];

      infoData = {
        memberCode: 1,
        memberName: samityName,
        samityId: migrateSamityInfo.id,
        mobile,
        email,
        isActive: true,
        refSamityId: memberInfoDataFromApplication.refSamityId,
        doptorId: memberInfoDataFromApplication.doptorId,
        createdBy,
        createdAt,
      };

      const { sql: memberInfoSql, params: memberInfoParams } = buildInsertSql("coop.member_info", infoData);

      memberCreateData = await (await transaction.query(memberInfoSql, memberInfoParams)).rows[0];
      memberCreateData = {
        ...infoData,
        samityId: migrateSamityInfo.id,
      };
    }

    if (memberInfoDataFromApplication?.isAuthorizer) {
      const citizenSql = `select id from users.user where nid=$1 or mobile=$2`;

      const citizenResult = await (await transaction.query(citizenSql, [infoData.nid, infoData.mobile])).rows[0];

      const { sql: samityAuthorizerSql, params: samityAuthorizerParams } = buildInsertSql(
        "coop.samity_authorized_person",
        {
          userId: citizenResult ? citizenResult.id : citizenResult,
          samityId: migrateSamityInfo.id,
          memberId: memberCreateData.id,
          nid: infoData.nid ? infoData.nid : null,
          status: true,
          effectDate: new Date(),
          createdBy,
          createdAt,
        }
      );

      const authorizerCreationResult = await (
        await transaction.query(samityAuthorizerSql, samityAuthorizerParams)
      ).rows[0];
    }

    const documents = [];

    for (const element of documentDataFromApplication) {
      if (element.documentId == 30) {
      }
      for (const e of element.documentName) {
        const { sql: documentCreateSql, params: documentCreateParams } = buildInsertSql("coop.samity_document", {
          samityId: migrateSamityInfo.id,
          ..._.omit(element, "documentName", "documentNameBangla"),
          documentName: e.fileName,
          createdBy,
          createdAt,
        });

        const result = (await transaction.query(documentCreateSql, documentCreateParams)).rows[0];

        documents.push(result);
      }
    }

    // insert into page-data
    let samityDataPageDataSql;
    if (applicationData.userType == "user") {
      samityDataPageDataSql = `SELECT
                                a.samity_name,
                                a.samity_code,
                                a.samity_level,
                                a.samity_district_id,
                                a.samity_division_id,
                                a.samity_upa_city_id,
                                a.samity_upa_city_type,
                                a.samity_uni_thana_paw_id,
                                a.samity_uni_thana_paw_type,
                                a.samity_type_id,
                                a.mobile,
                                a.email,
                                b.name,
                                c.project_name_bangla,
                                d.name_bn office_name,
                                e.name_bn doptor_name,
                                f.district_name_bangla,
                                g.upazila_name_bangla,
                                h.division_name_bangla as samity_division_name_bangla,
                                i.type_name samiy_type_name,
                                j.name_bn doptor_name
                              FROM
                                coop.samity_info a
                              LEFT JOIN users.user b ON
                                b.id = a.organizer_id
                              LEFT JOIN master.project_info c ON
                                c.id = a.project_id
                              INNER JOIN master.office_info d ON
                                d.id = a.office_id
                              INNER JOIN master.doptor_info e ON
                                e.id = a.doptor_id
                              INNER JOIN master.district_info f ON
                                f.id = a.district_id
                              INNER JOIN master.upazila_info g ON
                                g.id = a.upazila_id
                              INNER JOIN master.division_info h ON
                                h.id=a.samity_division_id
                              INNER JOIN coop.samity_type i ON
                                i.id=a.samity_type_id
                              INNER JOIN master.doptor_info j ON
                                j.id=a.doptor_id
                              WHERE
                                a.id = $1`;
    } else {
      samityDataPageDataSql = `SELECT
                                 a.samity_name,
                                 a.samity_code,
                                 a.samity_level,
                                 a.samity_district_id,
                                 a.samity_division_id,
                                 a.samity_upa_city_id,
                                 a.samity_upa_city_type,
                                 a.samity_uni_thana_paw_id,
                                 a.samity_uni_thana_paw_type,
                                 a.samity_type_id,
                                 a.mobile,
                                 a.email,
                                 b.name as name_bangla,,
                                 c.project_name_bangla,
                                 d.name_bn office_name,
                                 e.name_bn doptor_name,
                                 f.district_name_bangla,
                                 g.upazila_name_bangla,
                                 h.division_name_bangla as samity_division_name_bangla,
                                 i.type_name samiy_type_name,
                                 j.name_bn doptor_name
                               FROM
                                 coop.samity_info a
                               LEFT JOIN users.user b ON
                                 b.id = a.organizer_id
                               LEFT JOIN master.project_info c ON
                                 c.id = a.project_id
                               INNER JOIN master.office_info d ON
                                 d.id = a.office_id
                               INNER JOIN master.doptor_info e ON
                                 e.id = a.doptor_id
                               INNER JOIN master.district_info f ON
                                 f.id = a.district_id
                               INNER JOIN master.upazila_info g ON
                                 g.id = a.upazila_id
                               INNER JOIN master.division_info h ON
                                 h.id=a.samity_division_id
                               INNER JOIN coop.samity_type i ON
                                 i.id=a.samity_type_id
                               INNER JOIN master.doptor_info j ON
                                 j.id=a.doptor_id
                               WHERE
                                 a.id = $1`;
    }

    const samityId = migrateSamityInfo.id;
    const samityDataForPageData = (await transaction.query(samityDataPageDataSql, [samityId])).rows[0];
    const pageDataInsertSql = `INSERT INTO 
                               portal.page_data(
                                    doptor_id, 
                                    samity_id,
                                    samity_regno,
                                    samity_name, 
                                    data, 
                                    status, 
                                    created_by, 
                                    created_at) 
                              VALUES ($1,$2,$3,$4,$5,$6,$7,$8);`;
    const pageDataValues = [
      migrateSamityInfo.doptorId,
      migrateSamityInfo.id,
      migrateSamityInfo.samityCode,
      migrateSamityInfo.samityName,
      {
        samityRegMainTableValue: samityDataForPageData,
      },
      true,
      "admin",
      new Date(),
    ];

    const pageData = (await transaction.query(pageDataInsertSql, pageDataValues)).rows;

    return { samityId: migrateSamityInfo.id };
  }

  async assignCommitteeDesignation(
    fieldName: string,
    memberId: number,
    samityId: number,
    transaction: PoolClient
  ): Promise<number> {
    const committeeDesignationResetQuery = `
    UPDATE coop.member_info
    SET ${fieldName} = 'N'
    WHERE samity_id = $1 AND ${fieldName} = 'Y'
    `;
    const committeeDesignationResetParams = [samityId];
    await transaction.query(committeeDesignationResetQuery, committeeDesignationResetParams);

    const committeeDesignationUpdateQuery = `
    UPDATE coop.member_info
    SET ${fieldName} = 'Y'
    WHERE id = $1
    RETURNING id
    `;
    const updateResult = await (await transaction.query(committeeDesignationUpdateQuery, [memberId])).rows[0];
    const committeeDesignationUpdateParams = [memberId];
    return updateResult.id;
  }

  async findMemberIdFromName(memberName: string, transaction: PoolClient, samityId: number) {
    const sql = `SELECT id from coop.member_info where member_name_bangla=$1 and samity_id = $2`;
    const name = await (await transaction.query(sql, [memberName, samityId])).rows[0];
    return name.id;
  }

  async findMemberIdFromMemberCode(memberCode: number, transaction: PoolClient, samityId: number) {
    const sql = `SELECT id from coop.member_info where member_code=$1 and samity_id = $2`;
    const result = await (await transaction.query(sql, [memberCode, samityId])).rows[0];
    return result.id;
  }
  //

  async requiredSamityInfoData(
    samityDivisionId: number,
    samityDistrictId: number,
    samityUpaCityId: number,
    samityUniThanaPawId: number,
    samityTypeId: number,
    enterprisingId: number,
    projectId: number
  ) {
    const transaction = await (await pgConnect.getConnection("slave")).connect();

    try {
      transaction.query("BEGIN");

      const samityDivisionNameBangla = await this.requiredDataWithId(
        "divisionNameBangla",
        "master.division_info",
        { id: samityDivisionId },
        transaction
      );

      const samityDistrictNameBangla = samityDistrictId
        ? await this.requiredDataWithId(
            "districtNameBangla",
            "master.district_info",
            { id: samityDistrictId },
            transaction
          )
        : "";

      const samityUpaCityNameBangla = samityUpaCityId
        ? await this.requiredDataWithId(
            "upaCityNameBangla",
            "master.mv_upazila_city_info",
            { upa_city_id: samityUpaCityId },
            transaction
          )
        : "";

      const samityUniThanaPawNameBangla = samityUniThanaPawId
        ? await this.requiredDataWithId(
            "uniThanaPawNameBangla",
            "master.mv_union_thana_paurasabha_info",
            { uni_thana_paw_id: samityUniThanaPawId },
            transaction
          )
        : "";

      const samityTypeName = await this.requiredDataWithId(
        "typeName",
        "coop.samity_type",
        { id: samityTypeId },
        transaction
      );

      const enterPrisingNameBangla = enterprisingId
        ? await this.requiredDataWithId("orgNameBangla", "master.enterprising_org", { id: enterprisingId }, transaction)
        : "";

      const projectNameBangla = projectId
        ? await this.requiredDataWithId("projectNameBangla", "master.project_info", { id: projectId }, transaction)
        : "";

      transaction.query("COMMIT");
      return {
        samityDivisionNameBangla,
        samityDistrictNameBangla,
        samityUpaCityNameBangla,
        samityUniThanaPawNameBangla,
        samityTypeName,
        enterPrisingNameBangla,
        projectNameBangla,
      };
    } catch (error) {
      transaction.query("ROLLBACK");
      throw new BadRequestError(`Error is ${error}`);
    } finally {
      transaction.release();
    }
  }

  async requiredAreaData(divisionId: number, districtId: number, upaCityId: number, uniThanaPawId: number) {
    const transaction = await (await pgConnect.getConnection("slave")).connect();

    try {
      transaction.query("BEGIN");

      const divisionNameBangla = await this.requiredDataWithId(
        "divisionNameBangla",
        "master.division_info",
        { id: divisionId },
        transaction
      );

      const districtNameBangla =
        districtId > 0
          ? await this.requiredDataWithId("districtNameBangla", "master.district_info", { id: districtId }, transaction)
          : "";

      const upaCityNameBangla =
        upaCityId > 0
          ? await this.requiredDataWithId(
              "upaCityNameBangla",
              "master.mv_upazila_city_info",
              { upa_city_id: upaCityId },
              transaction
            )
          : "";

      const uniThanaPawNameBangla =
        uniThanaPawId > 0
          ? await this.requiredDataWithId(
              "uniThanaPawNameBangla",
              "master.mv_union_thana_paurasabha_info",
              { uni_thana_paw_id: uniThanaPawId },
              transaction
            )
          : "";

      transaction.query("COMMIT");
      return {
        divisionNameBangla,
        districtNameBangla,
        upaCityNameBangla,
        uniThanaPawNameBangla,
      };
    } catch (error) {
      transaction.query("ROLLBACK");
      throw new BadRequestError(`Error is ${error}`);
    } finally {
      transaction.release();
    }
  }

  async requiredDataWithId(selectColumnName: string, tableName: string, condition: object, transaction: PoolClient) {
    const { queryText, values } = buildGetSql([toSnakeCase(selectColumnName)], tableName, condition);
    const result = await (await transaction.query(queryText, values)).rows[0][toSnakeCase(selectColumnName)];
    return result;
  }

  async samityCodeGenerator(
    samityTypeId: number,
    samityLevel: string,
    samityDistrictId: number,
    samityUpacityId: number,
    samityUpacityType: string,
    samityUniThanaPawId: number,
    transaction: PoolClient,
    year: number
  ) {
    try {
      const queryText = `SELECT 
      district_code,
      upa_city_code
      FROM master.mv_upazila_city_info 
      WHERE upa_city_id = $1`;
      const result = (await transaction.query(queryText, [samityUpacityId])).rows[0];

      const samityLevelId = () => {
        if (samityLevel === "P" || samityLevel === "p") {
          return 1;
        } else if (samityLevel === "C" || samityLevel === "c") {
          return 2;
        } else if (samityLevel === "N" || samityLevel === "n") {
          return 3;
        } else {
          return null;
        }
      };

      console.log("samityLevelId", samityLevelId);

      const samityCodeWithoutSerial = `${year}.${samityLevelId()}.${
        samityTypeId < 10 ? `0${samityTypeId}` : samityTypeId
      }.${result.district_code < 10 ? "0" + result.district_code : result.district_code}${
        result.upa_city_code < 10 ? "0" + result.upa_city_code : result.upa_city_code
      }`.trim();

      console.log("samityCodeWithoutSerial", samityCodeWithoutSerial);

      // const queryTextLastValue = `SELECT samity_code FROM coop.samity_info  WHERE samity_code LIKE $1 ORDER BY id DESC LIMIT 1`;
      const queryTextLastValue = `SELECT samity_code FROM coop.samity_info  WHERE samity_upa_city_id = $1 and samity_upa_city_type = $2 ORDER BY id DESC LIMIT 1`;

      console.log("queryTextLastValue", queryTextLastValue);

      //last samity Code For same year and same samity type

      // const lastSamityCode = (await transaction.query(queryTextLastValue, [`${year}.${samityLevelId()}.%`])).rows[0];

      const lastSamityCode = (await transaction.query(queryTextLastValue, [samityUpacityId, samityUpacityType]))
        .rows[0];

      if (
        lastSamityCode &&
        lastSamityCode.samity_code.slice(15) &&
        parseInt(lastSamityCode.samity_code.slice(15)) + 1 > 9999
      ) {
        throw new BadRequestError(`সমিতি কোড সিরিয়াল ৯৯৯৯ হতে বড় পারবে না`);
      }

      const initialValue = "0000";
      const serial = lastSamityCode ? (parseInt(lastSamityCode.samity_code.slice(15)) + 1).toString() : "0001";

      const samityCode = samityCodeWithoutSerial + "." +  (serial.length < 4 ? initialValue.substring(0, initialValue.length - serial.length) + serial : serial);

      return samityCode;
    } catch (ex) {}
  }
}
