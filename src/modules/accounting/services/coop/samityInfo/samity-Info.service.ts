import { toCamelKeys, toSnakeCase } from "keys-transform";
import { omit, uniqBy } from "lodash";
import { buildGetSql, buildSql, buildUpdateSql, isExistsByColumn } from "rdcd-common";
import { Service } from "typedi";
import { liveIp } from "../../../../../../configs/coop.config";
import { pgConnect } from "../../../../../../db-coop/factory/connection.db";
import { minioPresignedGet } from "../../../../../../utils/minio.util";

@Service()
export class SamityInfoServices {
  constructor() {}

  async get(queryParams: any) {
    const { queryText, values } = buildGetSql(["*"], "coop.samity_info", queryParams);

    const result = await (await (await pgConnect.getConnection("slave")).query(queryText, values)).rows;
    return result ? toCamelKeys(result) : {};
  }

  async getSamityByAudit(officeId: number) {
    const queryText = `SELECT B.ID SAMITY_ID,
    B.SAMITY_CODE,
    B.SAMITY_NAME,
    B.STATUS,
    C.NAME_BN,
    A.START_YEAR,
    A.END_YEAR,
    A.INCOME,
    A.EXPENSE,
    (A.INCOME-A.EXPENSE) Profit_loss,
    CASE
        WHEN B.SOLD_SHARE IS NULL OR B.SHARE_PRICE IS NULL
        THEN 0
        ELSE B.SOLD_SHARE * B.SHARE_PRICE
    END AS samityShare
  FROM COOP.AUDIT_INFO A
  LEFT JOIN COOP.SAMITY_INFO B ON B.ID = A.SAMITY_ID
  LEFT JOIN MASTER.OFFICE_EMPLOYEE C ON C.DESIGNATION_ID = A.AUDITOR_DESIGNATION_ID
  WHERE B.OFFICE_ID = A.AUDITOR_OFFICE_ID
  AND A.AUDITOR_OFFICE_ID = $1
  ORDER BY A.ID`;
    const result = (await (await pgConnect.getConnection("slave")).query(queryText, [officeId])).rows;

    return toCamelKeys(result);
  }

  async getAuditBySamity(samityId: number) {
    const queryText = `SELECT B.ID SAMITY_ID,
    A.APPLICATION_ID,
    A.START_YEAR,
    A.END_YEAR,
    A.INCOME,
    A.EXPENSE,
    A.AUDIT_FEE,
    A.AUDIT_FEE_COLLECTION,
    A.AUDIT_FEE_WAIVER,
    A.AUDIT_FEE_OUTSTANDING,
    A.CDF_FEE,
    A.CDF_FEE_COLLECTION,
    A.CDF_FEE_WAIVER,
    A.CDF_FEE_OUTSTANDING
  FROM COOP.AUDIT_INFO A
  LEFT JOIN COOP.SAMITY_INFO B ON B.ID = A.SAMITY_ID
  WHERE A.SAMITY_ID = $1
  ORDER BY A.SAMITY_ID`;
    const result = (await (await pgConnect.getConnection("slave")).query(queryText, [samityId])).rows[0];

    return toCamelKeys(result);
  }

  async getAllSamityByAudit(officeId: number) {
    const queryText = `SELECT A.ID,
    A.SAMITY_CODE,
    A.SAMITY_NAME,
    A.SAMITY_REGISTRATION_DATE,
    A.STATUS,
    A.SAMITY_LEVEL,
    A.SAMITY_DIVISION_ID,
    A.SAMITY_DISTRICT_ID,
    A.SAMITY_UPA_CITY_ID,
    A.SAMITY_UNI_THANA_PAW_ID,
    A.SAMITY_DETAILS_ADDRESS,
    A.OFFICE_ID,
    A.DOPTOR_ID,
    B.DIVISION_NAME_BANGLA,
    C.DISTRICT_NAME_BANGLA,
    D.UPA_CITY_NAME_BANGLA,
    E.UNI_THANA_PAW_NAME_BANGLA,
    F.PROJECT_NAME_BANGLA,
	  G.TYPE_NAME,
    CASE
        WHEN A.SOLD_SHARE IS NULL OR A.SHARE_PRICE IS NULL
        THEN 0
        ELSE A.SOLD_SHARE * A.SHARE_PRICE
    END AS samityShare,
    I.NAME_BN
  FROM COOP.SAMITY_INFO A
  INNER JOIN MASTER.DIVISION_INFO B ON A.SAMITY_DIVISION_ID = B.ID
  INNER JOIN MASTER.DISTRICT_INFO C ON A.SAMITY_DISTRICT_ID = C.ID
  INNER JOIN MASTER.MV_UPAZILA_CITY_INFO D ON A.SAMITY_UPA_CITY_ID = D.UPA_CITY_ID
  INNER JOIN MASTER.MV_UNION_THANA_PAURASABHA_INFO E ON A.SAMITY_UNI_THANA_PAW_ID = E.UNI_THANA_PAW_ID
  LEFT JOIN MASTER.PROJECT_INFO F ON A.PROJECT_ID = F.ID
  LEFT JOIN COOP.SAMITY_TYPE G ON A.SAMITY_TYPE_ID = G.ID
  LEFT JOIN COOP.AUDIT_INFO H ON A.ID = H.SAMITY_ID
  LEFT JOIN master.office_employee I ON H.AUDITOR_DESIGNATION_ID = I.DESIGNATION_ID
  WHERE A.ID NOT IN
      (SELECT SAMITY_ID
        FROM COOP.AUDIT_INFO)
    AND A.OFFICE_ID = $1
  ORDER BY A.ID`;
    const result = (await (await pgConnect.getConnection("slave")).query(queryText, [officeId])).rows;

    return toCamelKeys(result);
  }

  async getBySamityId(samityId: number) {
    const transaction = await (await pgConnect.getConnection("slave")).connect();
    try {
      transaction.query("BEGIN");
      const queryText = `SELECT * FROM coop.samity_info WHERE id=$1`;
      const samityResult = (await transaction.query(queryText, [samityId])).rows;

      const queryTextForMemberArea = `SELECT * FROM coop.member_area WHERE samity_id=$1`;
      const memberAreaResult = (await transaction.query(queryTextForMemberArea, [samityId])).rows;

      const queryTextForWorkingArea = `SELECT * FROM coop.working_area WHERE samity_id=$1`;
      const workingAreaResult = (await transaction.query(queryTextForWorkingArea, [samityId])).rows;

      transaction.query("COMMIT");
      return {
        Samity: samityResult ? toCamelKeys(samityResult) : {},
        MemberArea: memberAreaResult ? toCamelKeys(memberAreaResult) : [],
        WorkingArea: workingAreaResult ? toCamelKeys(workingAreaResult) : [],
      };
    } catch (ex) {
    } finally {
      transaction.release();
    }
  }

  async getAuthorizedPersonSamity(userId: number) {
    const connection = await pgConnect.getConnection("slave");
    const queryText = `select b.samity_name,b.id
    from coop.samity_authorized_person a
    inner join coop.samity_info b on b.id = a.samity_id where a.user_id=$1`;
    const result = (await connection.query(queryText, [userId])).rows;
    return result ? toCamelKeys(result) : {};
  }

  async getSamityOfficeId(samityId: number) {
    const connection = await pgConnect.getConnection("slave");
    const queryText = `select office_id from coop.samity_info where id=$1`;
    const {
      rows: [{ office_id: officeId }],
    } = await connection.query(queryText, [samityId]);
    return officeId;
  }

  async getSamityForSync(officeId?: number) {
    console.log("coop get samity for sycn");
    const connection = pgConnect.getConnection("slave");
    let samity = [];
    let samityInfoForSync = [];

    if (officeId) {
      const samityQuery = `SELECT 
      a.id,
      a.samity_name,
      a.samity_code,
      a.samity_level,
      a.organizer_id,
      a.office_id,
      a.samity_division_id,
      a.samity_district_id,
      a.samity_upa_city_id,
      a.samity_upa_city_type,
      a.samity_uni_thana_paw_id,
      a.samity_uni_thana_paw_type,
      a.samity_details_address,
      a.working_area_type,
      a.member_area_type,
      a.samity_type_id,
      a.project_id,
      b.project_name,
      b.project_name_bangla,
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
      a.by_laws,
      a.member_admission_fee,
      a.is_manual,
      a.samity_details_address,
      c.division_name AS office_division_name,
      c.division_name_bangla AS office_division_name_bangla,
      d.district_name AS office_district_name,
      d.district_name_bangla AS office_district_name_bangla,
      e.upa_city_name_bangla,
      f.uni_thana_paw_name_bangla,
      g.type_name AS samity_type_name,
      h.org_name,
      h.org_name_bangla
    FROM coop.samity_info a
      FULL JOIN master.project_info b ON a.project_id = b.id
      INNER JOIN master.division_info c ON a.samity_division_id = c.id
      INNER JOIN master.district_info d ON a.samity_district_id = d.id
      INNER JOIN coop.samity_type g ON a.samity_type_id = g.id
      inner join master.mv_upazila_city_info e on  a.samity_upa_city_id=e.upa_city_id and a.samity_upa_city_type = e.upa_city_type
      inner join master.mv_union_thana_paurasabha_info f on  a.samity_uni_thana_paw_id=f.uni_thana_paw_id and a.samity_uni_thana_paw_type = f.uni_thana_paw_type
      inner join master.enterprising_org h on h.id = a.enterprising_id
    WHERE 
      a.office_id = $1
    ORDER BY 
      c.division_name,
      d.district_name,
      e.upa_city_name_bangla`;

      const samityParams = [officeId];

      const { rows } = await (await connection).query(samityQuery, samityParams);
      samity = rows;
    } else {
      const samityQuery = `SELECT 
                  id,
                  samity_name,
                  doptor_id,
                  office_id,
                  samity_code,
                  district_id,
                  upazila_id,
                  samity_details_address,
                  share_price
                FROM coop.samity_info 
                WHERE (created_at > dashboard_sync or dashboard_sync is null or updated_at > dashboard_sync)`;

      const { rows } = await (await connection).query(samityQuery);
      samity = rows;
    }

    for await (const s of samity) {
      let membersForSync = [];
      const selectedColumnMember = [
        "id",
        "member_name",
        "member_name_bangla",
        "member_code",
        "mobile",
        "gender_id",
        "occupation_id",
        "dob",
        "email",
        "father_name",
        "mother_name",
      ];

      const memberQuery = buildGetSql(selectedColumnMember, "coop.member_info", { samity_id: s.id });
      const { rows: members } = await (await connection).query(memberQuery.queryText, memberQuery.values);

      for await (const member of members) {
        const selectedColumnAddrss = ["address_type", "district_id", "upa_city_id", "details_address"];

        const addressQuery = buildGetSql(selectedColumnAddrss, "coop.member_address_info", {
          samity_id: s.id,
          member_id: member.id,
        });

        const { rows: addresses } = await (await connection).query(addressQuery.queryText, addressQuery.values);

        member.addresses = addresses;
        membersForSync.push(member);
      }

      s.members = membersForSync;
      samityInfoForSync.push(s);
    }

    return toCamelKeys(samityInfoForSync);
  }

  async updateSyncTime(samityId: number) {
    const connection = pgConnect.getConnection("master");
    const { sql, params } = buildUpdateSql(
      "coop.samity_info",
      samityId,
      {
        dashboard_sync: new Date(),
      },
      "id"
    );

    await (await connection).query(sql, params);
  }

  async getSamityReport(samityId: number): Promise<any> {
    const sqlForSamityLevel = `select samity_level from coop.samity_info where id=$1`;
    const { samity_level: samityLevel } = (
      await (await pgConnect.getConnection("slave")).query(sqlForSamityLevel, [samityId])
    ).rows[0];
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
    a.samity_division_id,
    a.samity_district_id,
    a.samity_upa_city_id,
    a.samity_upa_city_type,
    a.samity_uni_thana_paw_id,
    a.samity_uni_thana_paw_type,
    a.samity_details_address,
    a.working_area_type,
    a.member_area_type,
    a.samity_type_id,
    a.project_id,
    b.project_name,
    b.project_name_bangla,
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
    a.by_laws,
    a.member_admission_fee,
    a.is_manual,
    a.samity_details_address,
    c.division_name AS office_division_name,
    c.division_name_bangla AS office_division_name_bangla,
    d.district_name AS office_district_name,
    d.district_name_bangla AS office_district_name_bangla,
    e.upa_city_name_bangla,
    f.uni_thana_paw_name_bangla,
    g.type_name AS samity_type_name,
    h.org_name,
    h.org_name_bangla
  FROM coop.samity_info a
    FULL JOIN master.project_info b ON a.project_id = b.id
    INNER JOIN master.division_info c ON a.samity_division_id = c.id
    INNER JOIN master.district_info d ON a.samity_district_id = d.id
    INNER JOIN coop.samity_type g ON a.samity_type_id = g.id
    inner join master.mv_upazila_city_info e on  a.samity_upa_city_id=e.upa_city_id and a.samity_upa_city_type = e.upa_city_type
    inner join master.mv_union_thana_paurasabha_info f on  a.samity_uni_thana_paw_id=f.uni_thana_paw_id and a.samity_uni_thana_paw_type = f.uni_thana_paw_type
    inner join master.enterprising_org h on h.id = a.enterprising_id
  WHERE 
    a.id = $1
  ORDER BY 
    c.division_name,
    d.district_name,
    e.upa_city_name_bangla 
  `;

    const {
      rows: [samityInfo],
    } = await (await pgConnect.getConnection("slave")).query(samityQuery, [samityId]);

    samity.samityInfo = samityInfo ? samityInfo : {};

    //by law
    samity.byLaw = samity.samityInfo.by_law;
    delete samity.samityInfo.by_law;

    //get working areas
    const workingAreaQuery = `
  SELECT 
  a.id,
  a.division_id,
  a.district_id,
  a.upa_city_id,
  a.upa_city_type,
  a.uni_thana_paw_id,
  a.uni_thana_paw_type,
  a.details_address,
  a.status,
  c.division_name,
  c.division_name_bangla,
  d.district_name,
  d.district_name_bangla,
  e.upa_city_name_bangla,
  f.uni_thana_paw_name_bangla
FROM 
coop.working_area a
  INNER JOIN master.division_info c ON a.division_id = c.id
  INNER JOIN master.district_info d ON a.district_id = d.id
  LEFT JOIN master.mv_upazila_city_info e ON  a.upa_city_id=e.upa_city_id AND a.upa_city_type = e.upa_city_type
  LEFT JOIN master.mv_union_thana_paurasabha_info f ON  a.uni_thana_paw_id=f.uni_thana_paw_id AND a.uni_thana_paw_type = f.uni_thana_paw_type
WHERE
  a.samity_id=$1`;

    const { rows: workingAreas } = await (await pgConnect.getConnection("slave")).query(workingAreaQuery, [samityId]);
    samity.workingArea = workingAreas;

    //member areas
    const memberAreaQuery = `
  SELECT 
  a.id,
  a.division_id,
  a.district_id,
  a.upa_city_id,
  a.upa_city_type,
  a.uni_thana_paw_id,
  a.uni_thana_paw_type,
  a.details_address,
  a.status,
  c.division_name,
  c.division_name_bangla,
  d.district_name,
  d.district_name_bangla,
  e.upa_city_name_bangla,
  f.uni_thana_paw_name_bangla
FROM 
coop.member_area a
  INNER JOIN master.division_info c ON a.division_id = c.id
  INNER JOIN master.district_info d ON a.district_id = d.id
  LEFT JOIN master.mv_upazila_city_info e ON  a.upa_city_id=e.upa_city_id AND a.upa_city_type = e.upa_city_type
  LEFT JOIN master.mv_union_thana_paurasabha_info f ON  a.uni_thana_paw_id=f.uni_thana_paw_id AND a.uni_thana_paw_type = f.uni_thana_paw_type
WHERE
  a.samity_id=$1`;

    const { rows: memberAreas } = await (await pgConnect.getConnection("slave")).query(memberAreaQuery, [samityId]);
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
  FROM coop.member_info a
    FULL OUTER JOIN coop.member_address_info b ON a.id = b.member_id
    LEFT JOIN master.district_info d ON b.district_id = d.id
    LEFT JOIN master.mv_upazila_city_info e ON  b.upa_city_id=e.upa_city_id AND b.upa_city_type = e.upa_city_type
    LEFT JOIN master.mv_union_thana_paurasabha_info f ON  b.uni_thana_paw_id=f.uni_thana_paw_id AND b.uni_thana_paw_type = f.uni_thana_paw_type
    LEFT JOIN master.code_master g ON a.occupation_id = g.id
    LEFT JOIN coop.member_financial_info h on a.id = h.member_id
  WHERE
    a.samity_id=$1
`;

      members = await (await (await pgConnect.getConnection("slave")).query(memberQuery, [samityId])).rows;

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
      if (uniqueMembers) {
        for (const element of uniqueMembers) {
          if (element.documents && element.documents.length > 0) {
            for (const [index, e] of element.documents.entries()) {
              element.documents[index] = await minioPresignedGet(e, ["fileName"]);
            }
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
                           c.member_photo,
                           c.member_sign,
                           c.documents,
                           d.project_name_bangla
                         from
                         coop.member_info a
                         inner join coop.samity_info b on
                           a.ref_samity_id = b.id
                         inner join coop.member_info c on
                           b.id = c.samity_id
                         left join master.project_info d on d.id=b.project_id
                         where
                           a.samity_id = $1
                           and c.committee_signatory_person = 'Y'`;

      members = await (await (await pgConnect.getConnection("slave")).query(memberQuery, [samityId])).rows;

      members = await minioPresignedGet(uniqBy(members, "id"), ["member_photo", "member_sign"]);

      for (const element of members) {
        if (element.documents && element.documents.length > 0) {
          for (const [index, e] of element.documents.entries()) {
            element.documents[index] = await minioPresignedGet(e, ["fileName"]);
          }
        }
      }

      samity.members = members;
    } else if (samityLevel == "N") {
      const memberQuery = ` select
                            B.id,
                            B.member_name,
                            B.member_photo,
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
                            D.signatory_person_name_bangla
                          from 
                          coop.samity_info A
                          inner join coop.member_info B on
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
                              member_name_bangla as signatory_person_name_bangla,
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

      members = await (await (await pgConnect.getConnection("slave")).query(memberQuery, [samityId])).rows;

      members = await minioPresignedGet(uniqBy(members, "id"), ["member_photo", "member_sign"]);

      if (Array.isArray(members)) {
        for (const element of members) {
          if (element.documents && element.documents.length > 0) {
            for (const [index, e] of element.documents.entries()) {
              element.documents[index] = await minioPresignedGet(e, ["fileName"]);
            }
          }
        }
      }

      samity.members = members;
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
   coop.member_info a
   WHERE
     a.samity_id = $1 
     AND (a.committee_organizer = 'Y'
     OR a.committee_contact_person = 'Y'
     OR a.committee_signatory_person = 'Y')`;

    const { rows: committeeDesignation } = await (
      await pgConnect.getConnection("slave")
    ).query(committeeDesignationQuery, [samityId]);

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
   coop.committee_info
   WHERE 
     samity_id=$1 
     AND committee_type=$2`;

    const {
      rows: [committee],
    } = await (await pgConnect.getConnection("slave")).query(committeeQuery, [samityId, "S"]);
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
   coop.committee_member a
     LEFT JOIN coop.member_info b ON a.member_id = b.id
     LEFT JOIN master.committee_role c ON a.committee_role_id = c.id
   WHERE
     a.committee_id=$1
     and a.samity_id=$2;`;

    const { rows: committeeMembers } = committeeId
      ? await (await pgConnect.getConnection("slave")).query(committeeMemberQuery, [committeeId, samityId])
      : { rows: [] };

    samity && samity.committee && (samity.committee.committeeMembers = committeeMembers);

    //get income expense
    const incomeExpenseQuery = `
    select
    d.id,
    d.glac_id,
    d.tran_date,
    d.glac_name,
    d.glac_code,
    d.orp_code,
    coalesce(d.inc_amt, 0.00) as inc_amt,
    coalesce(d.exp_amt, 0.00) as exp_amt
  from
    (
    select
      a.id,
      a.glac_id,
      a.tran_date,
      b.glac_name,
      b.glac_code,
      case
        when (b.glac_type)::int = 3
                  then 'INC'
        when (b.glac_type)::int = 4
                  then 'EXP'
      end orp_code,
      case
        when (b.glac_type)::int = 3
              then a.tran_amount
      end inc_amt,
      case
        when (b.glac_type)::int = 4
          then a.tran_amount
      end exp_amt
    from
      coop.gl_transaction a,
      coop.glac_mst b
    where
      a.glac_id = b.id
      and samity_id = $1
    ) d
  ;`;

    const { rows: incomeExpenses } = await (
      await pgConnect.getConnection("slave")
    ).query(incomeExpenseQuery, [samityId]);
    samity.incomeExpenses = incomeExpenses;

    const budgetQuery = `
    select
    d.id,
    d.glac_id,
    d.financial_year,
    d.glac_name,
    d.glac_code,
    d.orp_code,
    coalesce(d.inc_amt, 0.00) as inc_amt,
    coalesce(d.exp_amt, 0.00) as exp_amt
  from
    (
    select
      a.id,
      a.glac_id,
      a.start_year || '-' || a.end_year as financial_year,
      b.glac_name,
      b.glac_code,
      case
        when (b.glac_type)::int = 3
            then 'INC'
        when (b.glac_type)::int = 4
            then 'EXP'
      end orp_code,
      case
        when (b.glac_type)::int = 3
            then a.amount
      end inc_amt,
      case
        when (b.glac_type)::int = 4 
              then a.amount
      end exp_amt
    from
      coop.budget_info a,
      coop.glac_mst b
    where
      a.glac_id = b.id
      and samity_id = $1
    ) d
  ;
      `;

    const { rows: budgets } = await (await pgConnect.getConnection("slave")).query(budgetQuery, [samityId]);

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
   coop.samity_document a,
     master.document_type b
   WHERE 
     a.document_id = b.id
     ANd samity_id=$1;`;

    const { rows: documents } = await (await pgConnect.getConnection("slave")).query(documentQuery, [samityId]);
    samity.samityDocuments = await minioPresignedGet(documents, ["document_name"]);

    const isElectedCommitteeExist = await isExistsByColumn(
      "id",
      "coop.committee_info",
      await pgConnect.getConnection("slave"),
      {
        committeeType: "EC",
        samityId,
      }
    );

    if (isElectedCommitteeExist) {
      const committeeFinanApproveReportName =
        samityLevel == "P" ? "2.14_CommitteeOrder_FinalApproval.pdf" : "2.14_CommitteeOrder_FinalApproval_Central.pdf";

      samity.samityDocuments.push({
        id: null,
        documentNo: null,
        effectDate: null,
        expireDate: null,
        documentName: "",
        documentTypeDesc: "নির্বাচনী নোটিশ",
        documentTypeShort: "ecn",
        documentNameUrl: `${liveIp}/jasper/coop/2.15_ElectionCommitteeNotice.pdf?pSamityId=${samityId}`,
      });
    }

    return samity;
  }

  async getByUser(user: any, samityLevel?: any, samityTypeId?: any) {
    const officeId = user.officeId;
    const doptorId = user.doptorId;

    let queryText = `SELECT A.ID,
    A.SAMITY_CODE,
    A.SAMITY_NAME,
    A.SAMITY_LEVEL,
    A.SAMITY_DETAILS_ADDRESS,
    A.SAMITY_UNI_THANA_PAW_ID,
    B.UNI_THANA_PAW_NAME_BANGLA,
    C.TYPE_NAME,
    A.DOPTOR_ID,
    A.OFFICE_ID,
    A.IS_MANUAL,
    A.SAMITY_TYPE_ID,
    A.PROJECT_ID,
	  D.PROJECT_NAME_BANGLA,
	  A.SAMITY_REGISTRATION_DATE,
    A.AMENDMENT_SAMITY_CODE
  FROM COOP.SAMITY_INFO A
  LEFT JOIN MASTER.MV_UNION_THANA_PAURASABHA_INFO B ON (A.SAMITY_UNI_THANA_PAW_ID = B.UNI_THANA_PAW_ID
  AND A.SAMITY_UNI_THANA_PAW_TYPE= B.uni_thana_paw_type)
  LEFT JOIN COOP.SAMITY_TYPE C ON C.ID = A.SAMITY_TYPE_ID
  LEFT JOIN MASTER.PROJECT_INFO D ON D.ID = A.PROJECT_ID
  WHERE A.STATUS = 'A'
    AND A.OFFICE_ID = $1
    AND A.DOPTOR_ID = $2`;

    let params = [officeId, doptorId];
    if (samityLevel && samityTypeId) {
      queryText = queryText + `  AND a.samity_level =$3 AND a.samity_type_id =$4`;
      params.push(samityLevel, samityTypeId);
    }

    if (samityTypeId && !samityLevel) {
      queryText = queryText + `AND a.samity_type_id =$3`;
      params.push(samityTypeId);
    }
    if (samityLevel && !samityTypeId) {
      queryText = queryText + `AND a.samity_level =$3`;
      params.push(samityLevel);
    }
    const result = await (await (await pgConnect.getConnection("slave")).query(queryText, params)).rows;
    return result ? toCamelKeys(result) : {};
  }

  async getByUserAudit(user: any, samityLevel?: any, samityTypeId?: any) {
    const officeId = user.officeId;
    const doptorId = user.doptorId;

    let queryText = `SELECT A.ID,
    A.SAMITY_CODE,
    A.SAMITY_NAME,
    A.SAMITY_LEVEL,
    A.SAMITY_DETAILS_ADDRESS,
    A.SAMITY_UNI_THANA_PAW_ID,
    B.UNI_THANA_PAW_NAME_BANGLA,
    C.TYPE_NAME,
    A.DOPTOR_ID,
    A.OFFICE_ID,
    A.IS_MANUAL,
    A.SAMITY_TYPE_ID,
    A.PROJECT_ID,
	  D.PROJECT_NAME_BANGLA,
	  A.SAMITY_REGISTRATION_DATE,
    A.AMENDMENT_SAMITY_CODE
  FROM COOP.SAMITY_INFO A
  INNER JOIN COOP.AUDIT_INFO E ON E.SAMITY_ID = A.ID
  LEFT JOIN MASTER.MV_UNION_THANA_PAURASABHA_INFO B ON (A.SAMITY_UNI_THANA_PAW_ID = B.UNI_THANA_PAW_ID
  AND A.SAMITY_UNI_THANA_PAW_TYPE= B.uni_thana_paw_type)
  LEFT JOIN COOP.SAMITY_TYPE C ON C.ID = A.SAMITY_TYPE_ID
  LEFT JOIN MASTER.PROJECT_INFO D ON D.ID = A.PROJECT_ID
  WHERE A.OFFICE_ID = $1
    AND A.DOPTOR_ID = $2`;

    let params = [officeId, doptorId];
    if (samityLevel && samityTypeId) {
      queryText = queryText + `  AND a.samity_level =$3 AND a.samity_type_id =$4`;
      params.push(samityLevel, samityTypeId);
    }

    if (samityTypeId && !samityLevel) {
      queryText = queryText + `AND a.samity_type_id =$3`;
      params.push(samityTypeId);
    }
    if (samityLevel && !samityTypeId) {
      queryText = queryText + `AND a.samity_level =$3`;
      params.push(samityLevel);
    }
    const result = await (await (await pgConnect.getConnection("slave")).query(queryText, params)).rows;
    return result ? toCamelKeys(result) : {};
  }

  async getDataFromMainOrTemp(
    isPagination: boolean,
    limit: number,
    offset: number,
    allQuery: object,
    dataFrom: string
  ) {
    var queryText: string = "";
    let sql: string = "SELECT * FROM";

    if (dataFrom == "temp") {
      sql = sql + " temps.samity_info";
      const allQueryValues: any[] = Object.values(allQuery);

      let features;
      if (Object.keys(allQuery).length > 0) {
        const createSql = buildSql(sql, allQuery, "AND", this.filter, "id ", limit, offset);
        const queryText = isPagination ? createSql[0] : createSql[1];
        features = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
      } else {
        queryText = isPagination
          ? "SELECT * FROM temps.samity_info ORDER BY id  LIMIT $1 OFFSET $2"
          : "SELECT * FROM temps.samity_info ORDER BY id ";
        features = await (await pgConnect.getConnection("slave")).query(queryText, isPagination ? [limit, offset] : []);
      }

      return features.rows ? toCamelKeys(features.rows) : features.rows;
    } else if (dataFrom == "main") {
      sql = sql + " coop.samity_info";
      const allQueryValues: any[] = Object.values(allQuery);
      let features;
      if (Object.keys(allQuery).length > 0) {
        const createSql = buildSql(sql, allQuery, "AND", this.filter, "id ", limit, offset);
        const queryText = isPagination ? createSql[0] : createSql[1];
        features = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
      } else {
        queryText = isPagination
          ? "SELECT * FROM coop.samity_info ORDER BY id  LIMIT $1 OFFSET $2"
          : "SELECT * FROM coop.samity_info ORDER BY id ";
        features = await (await pgConnect.getConnection("slave")).query(queryText, isPagination ? [limit, offset] : []);
      }

      return features.rows ? toCamelKeys(features.rows) : features.rows;
    } else {
      const allQueryValues: any[] = Object.values(allQuery);
      let result = [];

      let tempSamitySql = `select
                                      a.*
                                    from
                                     temps.samity_info a
                                     inner join	coop.application b on a.id= (b.data->>'samity_id' )::int 
                                    where
                                      b.service_id = 2
                                      and b.status = 'P'
                                  `;

      if (Object.keys(allQuery).length > 0) {
        const keys = Object.keys(allQuery);
        let count = 1;
        for (const element of keys) {
          tempSamitySql = tempSamitySql + `and ` + toSnakeCase(element) + `=$${count}`;
          count++;
        }

        const createSql = buildSql(sql + " coop.samity_info", allQuery, "AND", this.filter, "id ", limit, offset);
        const queryText = isPagination ? createSql[0] : createSql[1];
        result.push(
          {
            tempSamityInfo: (await (await pgConnect.getConnection("slave")).query(tempSamitySql, allQueryValues)).rows,
          },
          {
            mainSamityInfo: (await (await pgConnect.getConnection("slave")).query(createSql[1], allQueryValues)).rows,
          }
        );
      } else {
        result.push(
          {
            tempSamityInfo: (await (await pgConnect.getConnection("slave")).query(tempSamitySql)).rows,
          },
          {
            mainSamityInfo: (await (await pgConnect.getConnection("slave")).query(sql + " coop.samity_info")).rows,
          }
        );
      }

      return result;
    }
  }

  async usedForLoan(samityId: number) {
    const { sql, params } = buildUpdateSql("coop.samity_info", samityId, { usedForLoan: true }, "id");
    const result = (await (await pgConnect.getConnection("master")).query(sql, params)).rows[0];
    return result ? toCamelKeys(result) : result;
  }

  async count(allQuery: object, dataFrom: string) {
    var queryText: string = "";
    let sql: string = "SELECT COUNT(id) FROM";

    if (dataFrom == "temp") {
      sql = sql + " temps.samity_info";
    } else if (dataFrom == "main") {
      sql = sql + " coop.samity_info";
    } else {
      return 10000;
    }

    const allQueryValues: any[] = Object.values(allQuery);

    if (Object.keys(allQuery).length > 0) {
      queryText = await buildSql(sql, allQuery, "AND", this.filter, "id")[1];
      var result = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM coop.samity_info";
      result = await (await pgConnect.getConnection("slave")).query(queryText);
    }
    return result.rows[0].count;
  }

  filter(key: string) {
    return toSnakeCase(key);
  }
}
