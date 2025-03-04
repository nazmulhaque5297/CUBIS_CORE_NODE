/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-10-24 12:52:05
 * @modify date 2021-10-24 12:52:05
 * @desc samity registration services
 */
import { toCamelKeys, toSnakeCase } from "keys-transform";
import lo, { omit, uniqBy } from "lodash";
import { PoolClient } from "pg";
import { BadRequestError, buildSql } from "rdcd-common";
import Container, { Service } from "typedi";
import { pgConnect } from "../../../../../db-coop/factory/connection.db";
import { minioPresignedGet } from "../../../../../utils/minio.util";
import { isExistsByColumn } from "../../../../../utils/service.utils";
import { buildInsertSql, buildUpdateSql, buildUpdateWithWhereSql } from "../../../../../utils/sql-builder.util";
import {
  SamityAttrs,
  SamityInputAttrs,
  memberAreaAttrs,
  memberAreaInputAttrs,
  workingAreaAttrs,
  workingAreaInputAttrs,
} from "../../interfaces/init/init-samity-info.interface";
import { RegistrationStepServices } from "../reg-steps.service";

@Service()
export class SamityRegistrationServices {
  constructor() {}
  async get(createdBy: string, isPagination: boolean, limit: number, offset: number, allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT * FROM temps.samity_info";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 1) {
      const createSql = buildSql(sql, allQuery, "AND", this.filter, "id", limit, offset);
      queryText = isPagination ? createSql[0] : createSql[1];

      var samityReg = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = isPagination
        ? "SELECT * FROM temps.samity_info WHERE created_by = $1 ORDER BY id LIMIT $2 OFFSET $3"
        : "SELECT * FROM temps.samity_info WHERE created_by = $1  ORDER BY id ";
      var samityReg = await (
        await pgConnect.getConnection("slave")
      ).query(queryText, isPagination ? [createdBy, limit, offset] : [createdBy]);
    }
    return samityReg.rows;
  }

  async getSamityReport(samityId: number, isReportFromArchive: boolean): Promise<any> {
    const sqlForSamityLevel = `select samity_level from temps.samity_info where id=$1`;
    const { samity_level: samityLevel } = isReportFromArchive
      ? (await (await pgConnect.getConnection("archive")).query(sqlForSamityLevel, [samityId])).rows[0]
      : (await (await pgConnect.getConnection("slave")).query(sqlForSamityLevel, [samityId])).rows[0];
    const samity: any = {};

    //get samity info
    const samityQuery = `
        SELECT 
        a.id,
        a.samity_name,
        a.samity_code,
        a.samity_level,
        a.organizer_id,
        a.office_id,
        a.samity_details_address,
        a.purpose,
        a.no_of_share,
        a.share_price,
        a.sold_share,
        a.phone,
        a.mobile,
        a.email,
        a.enterprising_id,
        a.status,
        a.website,
        a.certificate_get_by,
        a.samity_formation_date,
        a.old_registration_no,
        a.samity_registration_date,
        a.account_type,
        a.account_no,
        a.account_title,
        a.by_law,
        a.member_admission_fee,
        a.chalan_number,
        a.chalan_date,
        b.project_name,
        b.project_name_bangla,
        c.division_name AS office_division_name,
        c.division_name_bangla AS office_division_name_bangla,
        d.district_name AS office_district_name,
        d.district_name_bangla AS office_district_name_bangla,
        e.upa_city_name_bangla,
        f.uni_thana_paw_name_bangla,
        g.type_name AS samity_type_name,
        h.org_name,
        h.org_name_bangla
      FROM temps.samity_info a
        FULL JOIN master.project_info b ON a.project_id = b.id
        INNER JOIN master.division_info c ON a.samity_division_id = c.id
        INNER JOIN master.district_info d ON a.samity_district_id = d.id
        INNER JOIN coop.samity_type g ON a.samity_type_id = g.id
        INNER JOIN master.mv_upazila_city_info e on  a.samity_upa_city_id=e.upa_city_id and a.samity_upa_city_type = e.upa_city_type
        INNER JOIN master.mv_union_thana_paurasabha_info f on  a.samity_uni_thana_paw_id=f.uni_thana_paw_id and a.samity_uni_thana_paw_type = f.uni_thana_paw_type
        INNER JOIN master.enterprising_org h on h.id = a.enterprising_id
      WHERE 
        a.id = $1
      ORDER BY 
        c.division_name,
        d.district_name,
        e.upa_city_name_bangla 
      `;

    const {
      rows: [samityInfo],
    } = isReportFromArchive
      ? await (await pgConnect.getConnection("archive")).query(samityQuery, [samityId])
      : await (await pgConnect.getConnection("slave")).query(samityQuery, [samityId]);

    //console.log("samityInfosamityInfo", samityInfo);

    samity.samityInfo = samityInfo ? samityInfo : {};

    //by law
    samity.byLaw = samity.samityInfo.by_law;
    delete samity.samityInfo.by_law;

    //get working areas
    const workingAreaQuery = `
      SELECT 
      a.id,
      a.status,
      a.details_address,
      c.division_name,
      c.division_name_bangla,
      d.district_name,
      d.district_name_bangla,
      e.upa_city_name_bangla,
      f.uni_thana_paw_name_bangla
    FROM 
      temps.working_area a
      INNER JOIN master.division_info c ON a.division_id = c.id
      LEFT JOIN master.district_info d ON a.district_id = d.id
      LEFT JOIN master.mv_upazila_city_info e ON  a.upa_city_id=e.upa_city_id AND a.upa_city_type = e.upa_city_type
      LEFT JOIN master.mv_union_thana_paurasabha_info f ON  a.uni_thana_paw_id=f.uni_thana_paw_id AND a.uni_thana_paw_type = f.uni_thana_paw_type
    WHERE
      a.samity_id=$1`;

    const { rows: workingAreas } = isReportFromArchive
      ? await (await pgConnect.getConnection("archive")).query(workingAreaQuery, [samityId])
      : await (await pgConnect.getConnection("slave")).query(workingAreaQuery, [samityId]);
    samity.workingArea = workingAreas;

    //member areas
    const memberAreaQuery = `
      SELECT 
      a.id,
      a.status,
      a.details_address,
      c.division_name,
      c.division_name_bangla,
      d.district_name,
      d.district_name_bangla,
      e.upa_city_name_bangla,
      f.uni_thana_paw_name_bangla
    FROM 
      temps.member_area a
      INNER JOIN master.division_info c ON a.division_id = c.id
      LEFT JOIN master.district_info d ON a.district_id = d.id
      LEFT JOIN master.mv_upazila_city_info e ON  a.upa_city_id=e.upa_city_id AND a.upa_city_type = e.upa_city_type
      LEFT JOIN master.mv_union_thana_paurasabha_info f ON  a.uni_thana_paw_id=f.uni_thana_paw_id AND a.uni_thana_paw_type = f.uni_thana_paw_type
    WHERE
      a.samity_id=$1`;

    const { rows: memberAreas } = isReportFromArchive
      ? await (await pgConnect.getConnection("archive")).query(memberAreaQuery, [samityId])
      : await (await pgConnect.getConnection("slave")).query(memberAreaQuery, [samityId]);
    samity.memberArea = memberAreas;

    //get member info

    let members: any[];
    if (samityLevel == "P") {
      const memberQuery = `
        SELECT
        a.id,
        a.member_code,
        a.nid,
        a.dob,
        a.member_name,
        a.member_name_bangla,
        a.father_name,
        a.mother_name,
        a.spouse_name,
        a.gender_id,
        a.education_level_id,
        a.mobile,
        a.email,
        a.brn,
        a.member_photo,
        a.member_sign,
        a.documents,
        b.id as member_address_id,
        b.address_type,
        b.details_address,
        d.district_name,
        d.district_name_bangla,
        e.upa_city_name_bangla,
        e.upa_city_name,
        e.upa_city_type,
        f.uni_thana_paw_name_bangla,
        f.uni_thana_paw_name,
        f.uni_thana_paw_type,
        g.display_value AS occupation_name,
        g.return_value as occupation_code,
        h.no_of_share,
        h.share_amount,
        h.savings_amount,
        h.loan_outstanding
      FROM temps.member_info a
        FULL OUTER JOIN temps.member_address_info b ON a.id = b.member_id
        INNER JOIN master.district_info d ON b.district_id = d.id
        INNER JOIN master.mv_upazila_city_info e ON  b.upa_city_id=e.upa_city_id AND b.upa_city_type = e.upa_city_type
        INNER JOIN master.mv_union_thana_paurasabha_info f ON  b.uni_thana_paw_id=f.uni_thana_paw_id AND b.uni_thana_paw_type = f.uni_thana_paw_type
        LEFT JOIN master.code_master g ON a.occupation_id = g.id
        LEFT JOIN temps.member_financial_info h on a.id = h.member_id
      WHERE
        a.samity_id=$1
    `;

      members = isReportFromArchive
        ? await (
            await (await pgConnect.getConnection("archive")).query(memberQuery, [samityId])
          ).rows
        : await (
            await (await pgConnect.getConnection("slave")).query(memberQuery, [samityId])
          ).rows;

      //get member info with member address in json format
      const membersWithAddress = members.map((member) => {
        const memberAddress = members.filter((memberAddress) => memberAddress.id === member.id);
        member.address = memberAddress.map((m) => {
          return {
            id: m.member_address_id,
            address_type: m.address_type,
            district_name: m.district_name,
            upa_city_name_bangla: m.upa_city_name_bangla,
            upa_city_name: m.upa_city_name,
            upa_city_type: m.upa_city_type,
            uni_thana_paw_name_bangla: m.uni_thana_paw_name_bangla,
            uni_thana_paw_name: m.uni_thana_paw_name,
            uni_thana_paw_type: m.uni_thana_paw_type,
            details_address: m.details_address,
          };
        });
        return omit(member, [
          "member_address_id",
          "address_type",
          "district_name",
          "upa_city_name_bangla",
          "upa_city_name",
          "upa_city_type",
          "uni_thana_paw_name_bangla",
          "uni_thana_paw_name",
          "uni_thana_paw_type",
          "details_address",
        ]);
      });

      //filter unique member
      const uniqueMembers = await minioPresignedGet(uniqBy(membersWithAddress, "id"), ["member_photo", "member_sign"]);

      for (const element of uniqueMembers) {
        if (element.documents.length > 0) {
          for (const [index, e] of element.documents.entries()) {
            element.documents[index] = await minioPresignedGet(e, ["fileName"]);
          }
        }
      }

      samity.members = uniqueMembers;
    } else if (samityLevel == "C") {
      const memberQuery = `select
                               a.*,
                               b.samity_code,
                               b.samity_details_address,
                               b.phone,
                               b.samity_formation_date,
                               b.samity_registration_date,
                               c.member_name_bangla as samity_signatory_person,
                               d.project_name_bangla
                               
                             from
                               temps.member_info a
                             inner join coop.samity_info b on
                               a.ref_samity_id = b.id
                             inner join coop.member_info c on
                               b.id = c.samity_id
                             left join master.project_info d on d.id=b.project_id
                             where
                               a.samity_id = $1
                               and c.committee_signatory_person = 'Y'`;

      members = isReportFromArchive
        ? await (
            await (await pgConnect.getConnection("archive")).query(memberQuery, [samityId])
          ).rows
        : await (
            await (await pgConnect.getConnection("slave")).query(memberQuery, [samityId])
          ).rows;

      samity.members = await minioPresignedGet(members, ["member_photo", "member_sign", "fileName"]);
    } else if (samityLevel == "N") {
      const memberQuery = ` select
                                B.id,
                                B.member_name,
                                B.member_photo,
                                B.member_code,
                                B.member_sign,
                                B.documents,
                                B.member_admission_date,
                                A.id as national_samity_id,
                                C.samity_id as central_samity_id,
                                C.samity_code as central_samity_code,
                                c.samity_details_address as central_samity_details_address,
                                A.phone,
                                A.samity_formation_date,
                                A.samity_registration_date,
                                C.signatory_samity_name,
                                D.signatory_person_name,
                                D.samity_signatory_person
                              from 
                                temps.samity_info A
                              inner join temps.member_info B on
                                A.id = B.samity_id,
                                (
                                select
                                  a.id,
                                  a.samity_id,
                                  b.samity_code,
                                  b.samity_details_address,
                                  a.member_name as signatory_samity_name,
                                  a.ref_samity_id
                                from
                                  coop.member_info a
                                  inner join coop.samity_info b on a.samity_id=b.id
                                where
                                  a.committee_signatory_person = 'Y' ) C,
                                (
                                select
                                  id,
                                  samity_id,
                                  member_name as signatory_person_name,
                                  member_name_bangla as samity_signatory_person,
                                  ref_samity_id
                                from
                                  coop.member_info
                                where
                                  committee_signatory_person = 'Y' ) D
                              where
                                A.samity_level = 'N'
                                and B.ref_samity_id = C.samity_id
                                and C.ref_samity_id = D.samity_id
                                and A.id=$1`;

      members = isReportFromArchive
        ? await (
            await (await pgConnect.getConnection("archive")).query(memberQuery, [samityId])
          ).rows
        : await (
            await (await pgConnect.getConnection("slave")).query(memberQuery, [samityId])
          ).rows;

      samity.members = await minioPresignedGet(members, ["member_photo", "member_sign", "fileName"]);
    }

    //committee designation
    const committeeDesignationQuery = `
       SELECT
         a.member_name,
         a.member_name_bangla,
         a.committee_organizer,
         a.committee_contact_person,
         a.committee_signatory_person
       FROM
         temps.member_info a
       WHERE
         a.samity_id = $1 
         AND (a.committee_organizer = 'Y'
         OR a.committee_contact_person = 'Y'
         OR a.committee_signatory_person = 'Y')`;

    const { rows: committeeDesignation } = isReportFromArchive
      ? await (await pgConnect.getConnection("archive")).query(committeeDesignationQuery, [samityId])
      : await (await pgConnect.getConnection("slave")).query(committeeDesignationQuery, [samityId]);

    const committeeDesignationList = {
      committee_organizer: null,
      committee_contact_person: null,
      committee_signatory_person: null,
    };

    const committee_organizer = committeeDesignation.find((item) => item.committee_organizer === "Y");
    committeeDesignationList.committee_organizer = committee_organizer
      ? committee_organizer.member_name_bangla || committee_organizer.member_name
      : null;

    const committee_contact_person = committeeDesignation.find((item) => item.committee_contact_person === "Y");
    committeeDesignationList.committee_contact_person = committee_contact_person
      ? committee_contact_person.member_name_bangla || committee_contact_person.member_name
      : null;

    const committee_signatory_person = committeeDesignation.find((item) => item.committee_signatory_person === "Y");
    committeeDesignationList.committee_signatory_person = committee_signatory_person
      ? committee_signatory_person.member_name_bangla || committee_signatory_person.member_name
      : null;

    //get committee info
    const committeeQuery = `
       SELECT 
         id,
         committee_type,
         election_date,
         effect_date,
         duration,
         no_of_member,
         expire_date
       FROM 
         temps.committee_info
       WHERE 
         samity_id=$1 
         AND committee_type=$2`;

    const {
      rows: [committee],
    } = isReportFromArchive
      ? await (await pgConnect.getConnection("archive")).query(committeeQuery, [samityId, "S"])
      : await (await pgConnect.getConnection("slave")).query(committeeQuery, [samityId, "S"]);
    samity.committee = committee ? { ...committee, ...committeeDesignationList } : {};

    const committeeId: number = committee && committee.id && committee.id;

    //get committee members

    const committeeMemberQuery = `
       SELECT 
         a.id,
         a.committee_type as member_type,
         a.member_id,
         a.member_name as name,
         a.org_name as organization,
         a.mobile,
         a.nid,
         a.dob,
         a.status,
         b.member_name,
         b.member_name_bangla,
         c.role_name
       FROM 
         temps.committee_member a
         LEFT JOIN temps.member_info b ON a.member_id = b.id
         LEFT JOIN master.committee_role c ON a.committee_role_id = c.id
       WHERE
         a.committee_id=$1
         and a.samity_id=$2;`;

    const { rows: committeeMembers } = isReportFromArchive
      ? committeeId
        ? await (await pgConnect.getConnection("archive")).query(committeeMemberQuery, [committeeId, samityId])
        : { rows: [] }
      : committeeId
      ? await (await pgConnect.getConnection("slave")).query(committeeMemberQuery, [committeeId, samityId])
      : { rows: [] };

    samity && samity.committee && (samity.committee.committeeMembers = committeeMembers);

    //get income expense
    const incomeExpenseQuery = `
       SELECT 
         a.id,
         a.glac_id,
         a.orp_code,
         a.tran_date,
         a.inc_amt,
         a.exp_amt,
         a.remarks,
         a.status,
         b.glac_name,
         b.glac_code
       FROM 
         temps.samity_gl_trans a,
         coop.glac_mst b
       WHERE 
         a.glac_id=b.id
         AND samity_id=$1
         AND is_ie_budget=$2;`;

    const { rows: incomeExpenses } = isReportFromArchive
      ? await (await pgConnect.getConnection("archive")).query(incomeExpenseQuery, [samityId, "E"])
      : await (await pgConnect.getConnection("slave")).query(incomeExpenseQuery, [samityId, "E"]);
    samity.incomeExpenses = incomeExpenses;

    const budgetQuery = `
       SELECT 
         a.id,
         a.glac_id,
         a.orp_code,
         a.tran_date,
         a.inc_amt,
         a.exp_amt,
         a.remarks,
         a.status,
         a.financial_year,
         b.glac_name,
         b.glac_code
       FROM 
         temps.samity_gl_trans a,
         coop.glac_mst b
       WHERE 
         a.glac_id=b.id
         AND samity_id=$1
         AND is_ie_budget=$2;
       `;

    const { rows: budgets } = isReportFromArchive
      ? await (await pgConnect.getConnection("archive")).query(budgetQuery, [samityId, "B"])
      : await (await pgConnect.getConnection("slave")).query(budgetQuery, [samityId, "B"]);
    samity.incomeExpenses = incomeExpenses;

    const budgetYears = budgets.map((budget) => budget.financial_year);

    const budgetYearsUnique = [...new Set(budgetYears)];

    const budgetYearData: any = {};

    budgetYearsUnique.forEach((budgetYear) => {
      budgetYearData[`${budgetYear}`] = budgets.filter((budget) => budget.financial_year === budgetYear);
    });

    samity.budgets = budgetYearData;

    //get document info
    const documentQuery = `
       SELECT 
         a.id,
         a.document_no,
         a.effect_date,
         a.expire_date,
         a.document_name,
         b.doc_type_desc as document_type_desc,
         b.doc_type as document_type_short
       FROM 
         temps.samity_document a,
         master.document_type b
       WHERE 
         a.document_id = b.id
         ANd samity_id=$1;`;

    const { rows: documents } = isReportFromArchive
      ? await (await pgConnect.getConnection("archive")).query(documentQuery, [samityId])
      : await (await pgConnect.getConnection("slave")).query(documentQuery, [samityId]);
    samity.samityDocuments = await minioPresignedGet(documents, ["document_name"]);

    return samity;
  }

  async getSamityRegData(samityId: number) {
    const transaction = await (await pgConnect.getConnection("slave")).connect();
    try {
      transaction.query("BEGIN");
      const queryText = `SELECT * FROM temps.samity_info WHERE id=$1`;
      const samityResult = (await transaction.query(queryText, [samityId])).rows;

      const queryTextForMemberArea = `SELECT * FROM temps.member_area WHERE samity_id=$1`;
      const memberAreaResult: memberAreaAttrs[] = (await transaction.query(queryTextForMemberArea, [samityId])).rows;

      const queryTextForWorkingArea = `SELECT * FROM temps.working_area WHERE samity_id=$1`;
      const workingAreaResult: workingAreaAttrs[] = (await transaction.query(queryTextForWorkingArea, [samityId])).rows;

      transaction.query("COMMIT");
      return {
        Samity: samityResult ? toCamelKeys(samityResult) : {},
        MemberArea: memberAreaResult ? toCamelKeys(memberAreaResult) : [],
        WorkingArea: workingAreaResult ? toCamelKeys(workingAreaResult) : [],
      };
    } catch (ex) {
      await transaction.query("ROLLBACK");
      //console.log(ex);
    } finally {
      transaction.release();
    }
  }

  async getRegisteredSamityData() {
    const sql = `SELECT * FROM coop.samity_reg`;
    const result = (await (await pgConnect.getConnection("slave")).query(sql)).rows;

    return result;
  }

  async create(s: SamityInputAttrs, userId: number): Promise<any> {
    const createdBy = userId;
    const createdAt: Date = new Date();
    const memberArea: memberAreaInputAttrs[] = s.memberArea;
    const workingArea: workingAreaInputAttrs[] = s.workingArea;
    const samityCode = await this.generateSamityCode(
      s.samityDivisionId,
      s.samityDistrictId
      // s.officeUnionId
    );
    const createSamityData = lo.omit(s, ["memberArea", "workingArea", "applicationId"]);
    const transaction = await (await pgConnect.getConnection("master")).connect();

    try {
      transaction.query("BEGIN");

      const queryTextForOffice = ` SELECT district_id,upazila_id FROM master.office_info where id=$1`;
      const { district_id, upazila_id } = (await transaction.query(queryTextForOffice, [s.officeId])).rows[0];
      const { sql, params } = buildInsertSql("temps.samity_info", {
        ...createSamityData,
        samityCode,
        createdBy,
        createdAt,
        districtId: district_id ? district_id : null,
        upazilaId: upazila_id ? upazila_id : null,
      });

      const result: any = (await transaction.query(sql, params)).rows[0];

      let samity: any = result ? toCamelKeys(result) : result;

      const queryTextFormember = `select service_rules from coop.service_info where id=$1`;
      const { service_rules: serviceRules } = (await transaction.query(queryTextFormember, [2])).rows[0];

      const requiredMember = serviceRules.samity_member[0][samity.samityLevel];
      samity = { ...samity, requiredMember };

      const samityId: number = samity.id;
      const memberAreaData = [];
      const workingAreaData = [];

      //create member-area

      for await (const element of memberArea) {
        const cleanElement = await this.clean(element);
        cleanElement.samityId = samityId;
        cleanElement.createdBy = createdBy;
        cleanElement.createdAt = new Date();
        const result: memberAreaAttrs | {} = await this.memberAreaCreate(cleanElement, transaction);
        memberAreaData.push(result);
      }

      //create working-area

      for await (const element of workingArea) {
        const cleanElement = await this.clean(element);
        cleanElement.samityId = samityId;
        cleanElement.createdBy = createdBy;
        cleanElement.createdAt = new Date();
        const result: workingAreaAttrs | {} = await this.workingAreaCreate(cleanElement, transaction);
        workingAreaData.push(result);
      }

      //create reg-steps

      const payLoadOfStep = {
        samityId: samityId,
        samityName: samity.samityName,
        userId: createdBy,
        status: "P",
        lastStep: 1,
        url: "/coop/samity-management/coop/add-by-laws",
        createdBy: createdBy,
        createdAt: new Date(),
      };

      const { sql: regSql, params: regParams } = buildInsertSql("temps.reg_steps", payLoadOfStep);

      const regStepResult = (await transaction.query(regSql, regParams)).rows[0];

      //patch in application table
      const queryForIsUsed = `UPDATE coop.application SET is_used=$1 where id=$2`;
      const updateIsUsed = (await pgConnect.getConnection("master")).query(queryForIsUsed, [true, s.applicationId]);
      await transaction.query("COMMIT");

      return {
        samity,
        memberAreaData,
        workingArea,
        regStepResult,
      };
    } catch (ex) {
      await transaction.query("ROLLBACK");
      //console.log("error", ex);
      throw new BadRequestError("সমিতি গঠনে ত্রুটি হয়েছে ");
    } finally {
      transaction.release();
    }
  }

  async update(id: number, s: SamityAttrs, whereData: any): Promise<any> {
    const memberArea: memberAreaInputAttrs[] = s.memberArea;
    const workingArea: workingAreaInputAttrs[] = s.workingArea;
    const updateSamityData = lo.omit(s, ["samityId", "memberArea", "workingArea"]);
    const transaction = (await pgConnect.getConnection("master")).connect();
    try {
      (await transaction).query("BEGIN");

      const { sql, params } = buildUpdateWithWhereSql("temps.samity_info", { id }, { ...updateSamityData });

      // const sql = `UPDATE temp.samity_info SET samity_code = $1,samity_name = $2,samity_level = $3 where sami`
      const result: any = await (await (await transaction).query(sql, params)).rows[0];

      const updateSamity: SamityAttrs | {} = result ? toCamelKeys(result) : {};
      const memberAreaUpdateData = [];
      const workingAreaUpdateData = [];

      //Update member-area

      const deleteMemberAreaSql = `delete from temps.member_area where samity_id=$1`;
      const deleteResult = (await transaction).query(deleteMemberAreaSql, [id]);

      //create member-area

      for await (const element of memberArea) {
        const cleanElement = await this.clean(element);
        cleanElement.samityId = id;
        cleanElement.createdBy = s.updatedBy;
        cleanElement.createdAt = new Date();
        const result: memberAreaAttrs | {} = await this.memberAreaCreate(cleanElement, await transaction);
        memberAreaUpdateData.push(result);
      }

      const deleteWorkingAreaSql = `delete from temps.working_area where samity_id=$1`;
      const deleteWorkingAreaResult = (await transaction).query(deleteWorkingAreaSql, [id]);

      //create working-area

      for await (const element of workingArea) {
        const cleanElement = await this.clean(element);
        cleanElement.samityId = id;
        cleanElement.createdBy = s.updatedBy;
        cleanElement.createdAt = new Date();
        const result: workingAreaAttrs | {} = await this.workingAreaCreate(cleanElement, await transaction);
        workingAreaUpdateData.push(result);
      }

      // for await (const element of memberArea) {
      //   const cleanElement = await this.clean(element);

      //   const result: memberAreaAttrs | {} = await this.memberAreaUpdate(
      //     this.memberWorkingAreaUpdatePayload(cleanElement, s.memberAreaType),
      //     await transaction
      //   );
      //   memberAreaUpdateData.push(result);
      // }

      // //Update working-area

      // for await (const element of workingArea) {
      //   const cleanElement = await this.clean(element);
      //   cleanElement.samityId = id;
      //   cleanElement.updatedBy = s.updatedBy;
      //   cleanElement.updatedAt = s.updatedAt;
      //   const result: workingAreaAttrs | {} = await this.workingAreaUpdate(
      //     this.memberWorkingAreaUpdatePayload(cleanElement, s.workingAreaType),
      //     await transaction
      //   );
      //   workingAreaUpdateData.push(result);
      // }

      await (await transaction).query("COMMIT");
      return {
        updateSamity,
        memberAreaUpdateData,
        workingAreaUpdateData,
      };
    } catch (ex) {
      await (await transaction).query("ROLLBACK");
      throw new BadRequestError(`error is ${ex}`);
    } finally {
      (await transaction).release();
    }
  }

  async updateByLaw(id: number, whereData: any, data: SamityInputAttrs, user: any): Promise<SamityInputAttrs | null> {
    const transaction = await (await pgConnect.getConnection("master")).connect();

    try {
      transaction.query("BEGIN");
      const { sql, params } = buildUpdateWithWhereSql("temps.samity_info", { ...whereData, id: id }, { byLaw: data });

      const result = await transaction.query(sql, params);

      const RegistrationStepService = Container.get(RegistrationStepServices);
      const regStepResult = await RegistrationStepService.updateSteps(id, transaction, 2, user.userId);

      transaction.query("COMMIT");
      return result.rows ? result.rows[0] : null;
    } catch (ex: any) {
      transaction.query("ROLLBACK");
      throw new BadRequestError(ex);
    } finally {
      transaction.release();
    }
  }

  async updateCertificateGetBy(
    id: number,
    whereData: any,
    data: string,
    declaration: boolean
  ): Promise<SamityInputAttrs> {
    const { sql, params } = buildUpdateWithWhereSql(
      "temps.samity_info",
      { ...whereData, id: id },
      { certificateGetBy: data, declaration }
    );
    const result = await (await pgConnect.getConnection("master")).query(sql, params);

    return result.rows[0];
  }

  async uniqueCheck(name: string): Promise<boolean> {
    const {
      rows: [samityCount],
    } = await (
      await pgConnect.getConnection("slave")
    ).query(
      ` SELECT COUNT(id) 
          FROM temps.samity_info
          WHERE samity_code = $1;
         `,
      [name]
    );

    return parseInt(samityCount.count) >= 1 ? true : false;
  }

  async count(allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM temps.samity_info";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = buildSql(sql, allQuery, "AND", this.filter, "id")[1];
      var result = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM temps.samity_info";
      result = await (await pgConnect.getConnection("slave")).query(queryText);
    }
    return result.rows[0].count;
  }

  async uniqueCheckUpdate(name: string, id: number): Promise<boolean> {
    const {
      rows: [samityCount],
    } = await (
      await pgConnect.getConnection("slave")
    ).query(
      `
           SELECT COUNT(id) 
           FROM 
             temps.samity_info
           WHERE 
             samity_code = $1
           AND
             id !=$2;
         `,
      [name, id]
    );

    return parseInt(samityCount.count) >= 1 ? true : false;
  }

  async samityIdExist(id: number): Promise<Boolean> {
    return await isExistsByColumn("id", "temps.samity_info", await pgConnect.getConnection("slave"), { id });
  }

  filter(key: string) {
    return toSnakeCase(key);
  }

  async getSamityCode(samityId: number): Promise<string> {
    const query = `SELECT samity_code
      FROM temps.samity_info
      WHERE id=$1`;
    const {
      rows: [samity],
    } = await (await pgConnect.getConnection("slave")).query(query, [samityId]);
    return samity.samity_code;
  }

  async generateSamityCode(
    officeDivisionId: any,
    officeDistrictId: any
    // officeUnionId: any
  ) {
    const queryTextDivision = `select division_code from master.division_info where id=$1`;
    const officeDivisionCode = await (
      await pgConnect.getConnection("slave")
    ).query(queryTextDivision, [officeDivisionId]);

    const queryTextDistrict = `select district_code from master.district_info where id=$1`;
    const officeDistrictCode = await (
      await pgConnect.getConnection("slave")
    ).query(queryTextDistrict, [officeDistrictId]);

    // const queryTextUnion = `select union_code from coop.union_info where union_id=$1`;
    // const officeUnionCode = await (
    //   await pgConnect.getConnection("slave")
    // ).query(queryTextUnion, [officeUnionId]);

    const samityCodeIs = officeDivisionCode.rows[0].division_code + officeDistrictCode.rows[0].district_code;
    // officeUnionCode.rows[0].union_code;

    const queryTextCount = `SELECT COUNT(samity_code) from temps.samity_info WHERE samity_code LIKE $1`;
    const countRowSamityReg = await (
      await pgConnect.getConnection("slave")
    ).query(queryTextCount, [`${samityCodeIs}%`]);

    if (countRowSamityReg.rows[0].count == 0) {
      return samityCodeIs + "001";
    } else {
      const queryTextLastValue = `select samity_code from temps.samity_info  where samity_code LIKE $1 ORDER BY samity_code DESC LIMIT 1`;
      const lastValue = await (await pgConnect.getConnection("slave")).query(queryTextLastValue, [`${samityCodeIs}%`]);
      return (parseInt(lastValue.rows[0].samity_code) + 1).toString();
    }
  }

  async memberAreaCreate(data: object, transaction: PoolClient): Promise<memberAreaAttrs | {}> {
    const { sql, params } = buildInsertSql("temps.member_area", {
      ...data,
    });
    const result = await (await transaction.query(sql, params)).rows[0];
    const memberArea: memberAreaAttrs | {} = result ? toCamelKeys(result) : {};

    return memberArea;
  }

  async workingAreaCreate(data: object, transaction: PoolClient): Promise<workingAreaAttrs | {}> {
    const { sql, params } = buildInsertSql("temps.working_area", {
      ...data,
    });
    const workingArea = await (await transaction.query(sql, params)).rows[0];

    const returnValue: workingAreaAttrs | {} = workingArea ? toCamelKeys(workingArea) : {};
    return returnValue;
  }

  async memberAreaUpdate(data: memberAreaAttrs, transaction: PoolClient) {
    const { sql, params } = buildUpdateSql("temps.member_area", data.id, {
      ...data,
    });

    const memberArea = toCamelKeys(await (await transaction.query(sql, params)).rows[0]);
    return memberArea;
  }

  async workingAreaUpdate(data: any, transaction: PoolClient) {
    const { sql, params } = buildUpdateSql("temps.working_area", data.id, {
      ...data,
    });
    const workingArea = toCamelKeys(await (await transaction.query(sql, params)).rows[0]);
    return workingArea;
  }

  async clean(obj: any) {
    for (let propName in obj) {
      if (obj[propName] === null || obj[propName] === undefined || obj[propName] === "" || obj[propName] === "") {
        delete obj[propName];
      }
    }
    return obj;
  }

  async sameNameIdCheck(dataArray: any, nameId: string) {
    const nameIdArrays: any = [];
    dataArray.forEach((element: any) => {
      const id = Number(element[nameId]);
      nameIdArrays.push(id);
    });
    let hasDuplicates = (arr: any) => new Set(arr).size != arr.length;
    const allEqual = (arr: any) => arr.every((val: any) => val === arr[0]);
    return [hasDuplicates(nameIdArrays), allEqual(nameIdArrays)];
  }

  async workingAreaIdCheck(id: number, samityId: number): Promise<Boolean> {
    return await isExistsByColumn("id", "temps.working_area", await pgConnect.getConnection("slave"), { id, samityId });
  }

  async memberAreaIdCheck(id: number, samityId: number): Promise<Boolean> {
    return await isExistsByColumn("id", "temps.member_area", await pgConnect.getConnection("slave"), { id, samityId });
  }

  async existuserId(id: string) {
    const sql = `SELECT COUNT(my_gov_id) from citizen.user WHERE my_gov_id=$1`;
    const countResult = (await (await pgConnect.getConnection("slave")).query(sql, [id])).rows[0].count;

    return countResult >= 1 ? true : false;
  }

  async getuserId(id: string) {
    const sql = `SELECT id from citizen.user WHERE my_gov_id=$1`;
    const result = (await (await pgConnect.getConnection("slave")).query(sql, [id])).rows[0].id;

    return result;
  }

  memberWorkingAreaUpdatePayload(data: any, areaType: number) {
    if (areaType == 0) {
      data.districtId = null;
      data.upaCityId = null;
      data.upaCityType = "";
      data.uniThanaPawId = null;
      data.uniThanaPawType = "";
      data.detailsAddress = "";
    } else if (areaType == 1) {
      data.upaCityId = null;
      data.upaCityType = "";
      data.uniThanaPawId = null;
      data.detailsAddress = "";
      data.uniThanaPawType = "";
    } else if (areaType == 2) {
      data.uniThanaPawId = null;
      data.uniThanaPawType = "";
      data.detailsAddress = "";
    } else if (areaType == 3) {
      data.detailsAddress = "";
    }

    return data;
  }

  async checkRegistrationFee(type: string, params: any, value: number) {
    //console.log(type, params, value);
    const samityLevelSql = `select samity_level from temps.samity_info where id=$1`;

    const samityLevelResult = (await (await pgConnect.getConnection("slave")).query(samityLevelSql, [params.id]))
      .rows[0];
    let isMatch = false;

    if (type == "registrationFee" || type == "registrationVat") {
      const serviceRulesSql = `select service_rules from coop.service_info where id=2`;
      const serviceRules = (await (await pgConnect.getConnection("slave")).query(serviceRulesSql)).rows[0];

      for (const element of serviceRules["service_rules"][toSnakeCase(type)]) {
        if (element[samityLevelResult.samity_level] == value) {
          isMatch = true;
        } else {
          isMatch = false;
        }
      }
    }

    return isMatch;
  }

  async registrationFeeUpdate(data: any, samityId: number) {
    try {
      const { sql, params } = buildUpdateWithWhereSql("temps.samity_info", { id: samityId }, data);

      const result = (await (await pgConnect.getConnection("master")).query(sql, params)).rows[0];

      return result ? toCamelKeys(result) : result;
    } catch (ex: any) {
      throw new BadRequestError(ex);
    }
  }

  async samityDoptorId(samityId: number) {
    const sql = `select doptor_id from temps.samity_info where id=$1`;
    const { doptor_id: doptorId } = (await (await pgConnect.getConnection("slave")).query(sql, [samityId])).rows[0];

    return doptorId;
  }
}

// const transaction = await (await pgConnect.getConnection("slave")).connect()

// try{
//   transaction.query("ROLLBACK")

//   transaction.query("ROLLBACK")

// }
// catch(ex:any){
//   transaction.query("ROLLBACK")
// }
// finally{
//   transaction.release()
// }
