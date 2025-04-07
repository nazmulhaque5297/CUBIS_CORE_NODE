import { toCamelKeys } from "keys-transform";
import { BadRequestError } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../../db-coop/factory/connection.db";
import { minioPresignedGet } from "../../../../../utils/minio.util";

@Service()
export class MemberInfoServices {
  constructor () {}

  async getBySamityId (samityId: number, doptorId: number) {
    const transaction = await (await pgConnect.getConnection("slave")).connect();

    try {
      transaction.query("BEGIN");

      // const serviceIdSql = `SELECT
      //                         id
      //                       FROM
      //                         coop.service_info
      //                       WHERE
      //                         service_name_english = $1
      //                         AND doptor_id = $2`;

      // const { id: serviceId } = await (
      //   await transaction.query(serviceIdSql, ["member_information_correction", doptorId])
      // ).rows[0];

      
      // remove doptor concept for server table find server id 
      const serviceIdSql = `SELECT
      id
    FROM
      coop.service_info
    WHERE
      service_name_english = $1`;
      const { id: serviceId } = await (
        await transaction.query(serviceIdSql, ["member_information_correction"])
      ).rows[0];

      const samityLevelSql = `SELECT 
                               samity_level
                              FROM 
                               coop.samity_info 
                              WHERE
                               id=$1`;
      const { samity_level: samityLevel } = (await transaction.query(samityLevelSql, [samityId])).rows[0];
      let memberInfo: any;

      if (samityLevel === "P") {
        const sqlMemberInfo = `SELECT
                                 mi.*,
                                 b.display_value AS occupation_name
                               FROM
                                 coop.member_info AS mi
                               LEFT JOIN master.code_master AS b
                               ON
                                 mi.occupation_id = b.id
                               WHERE
                                 mi.samity_id = $1
                                 AND mi.is_active = TRUE
                               ORDER BY
                                 member_code`;
        memberInfo = toCamelKeys((await transaction.query(sqlMemberInfo, [samityId])).rows);
      }

      if (samityLevel === "C") {
        const sql = `select
                     a.*,
                     b.samity_code,
                     b.samity_details_address,
                     b.phone,
                     b.samity_formation_date,
                     b.samity_registration_date,
                     c.member_name_bangla as samity_signatory_person,
                     d.project_name_bangla
                   from
                     coop.member_info a
                   inner join coop.samity_info b on
                     a.ref_samity_id = b.id
                   inner join coop.member_info c on
                     b.id = c.samity_id
                   left join master.project_info d on d.id=b.project_id
                   where
                     a.samity_id = $1 and a.is_active=true
                     and c.committee_signatory_person = 'Y'`;
        memberInfo = (await transaction.query(sql, [samityId])).rows;
      }

      if (samityLevel === "N") {
        const sql = `select
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
        memberInfo = (await transaction.query(sql, [samityId])).rows;
      }

      const applicationDataSql = `SELECT
                                data->'members_info' AS members_info
                              FROM
                                coop.application
                              WHERE
                                service_id = $1
                                AND samity_id = $2
                                AND status NOT IN ($3, $4)`;
      const applicationData = (await transaction.query(applicationDataSql, [serviceId, samityId, "A", "R"])).rows[0];

      const memberInformation = [];

      if (memberInfo && memberInfo.length > 0) {
        memberInfo = await minioPresignedGet(toCamelKeys(memberInfo), ["memberPhoto", "memberSign"]);
        for await (const [index, element] of memberInfo.entries()) {
          memberInfo[index].documents = await minioPresignedGet(element.documents, ["fileName"]);

          const memberId = element.id;
          const sqlPresentAddress = ` SELECT * FROM coop.member_address_info  
                                         WHERE samity_id= $1 AND member_id=$2 AND address_type=$3`;
          const memberPresentAddress = (await transaction.query(sqlPresentAddress, [samityId, memberId, "PRE"]))
            .rows[0];

          const sqlPermanentAddress = ` SELECT * FROM coop.member_address_info  
                                         WHERE samity_id= $1 AND member_id=$2 AND address_type=$3`;
          const memberPermanentAddress = (await transaction.query(sqlPermanentAddress, [samityId, memberId, "PER"]))
            .rows[0];

          let isEditAble = true;
          if (applicationData?.members_info.length > 0) {
            isEditAble = !applicationData.members_info.some((applicationElement: any) => {
              if (applicationElement.id) {
                return applicationElement.id == element.id;
              }
            });
          }

          const memberObj = {
            memberBasicInfo: element,
            memberPresentAddress: memberPresentAddress ? toCamelKeys(memberPresentAddress) : null,
            memberPermanentAddress: memberPermanentAddress ? toCamelKeys(memberPermanentAddress) : null,
            isEditAble,
          };

          memberInformation.push(memberObj);
        }
      }

      transaction.query("COMMIT");

      return memberInformation;
    } catch (ex) {
      transaction.query("ROLLBACK");
      throw new BadRequestError(`Error is ${ex}`);
    } finally {
      transaction.release();
    }
  }

  async idCheck (id: number): Promise<boolean> {
    if (!id) {
      return true;
    } else {
      const {
        rows: [member],
      } = await (
        await pgConnect.getConnection("slave")
      ).query(
        `
        SELECT COUNT(id) 
        FROM coop.member_info
        WHERE id = $1
        `,
        [id]
      );
      return parseInt(member.count) >= 1 ? true : false;
    }
  }

  async memberDeactivation (memberId: number) {
    const sql = `update coop.member_info set is_active=false where id=$1 returning *`;
    const result = (await (await pgConnect.getConnection("master")).query(sql, [memberId])).rows;

    return result ? toCamelKeys(result) : result;
  }

  async isMemberEligibleForDeactivation (id: number) {
    const sql = `SELECT
                  no_of_share ,
                  share_amount,
                  loan_outstanding
                FROM
                  coop.member_financial_info
                WHERE
                  member_id = $1`;
    const {
      no_of_share: noOfShare,
      share_amount: shareAmount,
      loan_outstanding: loanOutstanding,
    } = (await (await pgConnect.getConnection("slave")).query(sql, [id])).rows[0];

    return parseInt(noOfShare) > 0 || parseInt(shareAmount) > 0 || parseInt(loanOutstanding) > 0 ? false : true;
  }

  async getRequiredDocument (samityId: number) {
    try {
      const sql = `SELECT
                     d.id AS doc_id,
                     d.doc_type,
                     d.doc_type_desc,
                     c.is_mandatory
                   FROM
                     coop.samity_info a
                   INNER JOIN coop.samity_type b ON
                     a.samity_type_id = b.id
                   INNER JOIN coop.samity_doc_mapping c ON
                     b.id = c.samity_type_id
                     AND a.samity_level=c.samity_level 
                   INNER JOIN master.document_type d ON
                     d.id = c.doc_type_id
                   WHERE
                     a.id = $1
                     AND c.type = 'M'
                     AND d.is_active = TRUE`;

      let result = (await (await pgConnect.getConnection("slave")).query(sql, [samityId])).rows;
      return result ? toCamelKeys(result) : result;
    } catch (ex: any) {
      throw new BadRequestError(ex);
    }
  }

  async addAbleMemberListForCentralOrNational (samityId: number) {
    const samityLevelSql = `SELECT 
                            samity_level,
                            district_id,
                            upazila_id
                           FROM coop.samity_info 
                           WHERE 
                            id=$1`;
    const {
      samity_level: samityLevel,
      district_id: districtId,
      upazila_id: upazilaId,
    } = (await (await pgConnect.getConnection("slave")).query(samityLevelSql, [samityId])).rows[0];

    let result = [];

    if (samityLevel === "C") {
      const sql = `select
                   a.*,
                   b.id as member_id,
                   b.member_name_bangla
                 from
                   coop.samity_info a
                 inner join coop.member_info b on
                   a.id = b.samity_id
                 where
                   a.district_id = $1
                   and a.upazila_id = $2
                   and a.samity_level = 'P'
                   and b.committee_signatory_person = 'Y'`;
      result = (await (await pgConnect.getConnection("slave")).query(sql, [districtId, upazilaId])).rows;

      const cureentMemberSql = `
                          SELECT 
                           id,
                           ref_samity_id
                          FROM
                           coop.member_info 
                          WHERE 
                           samity_id=$1
                          `;
      const cureentMember = (await (await pgConnect.getConnection("slave")).query(cureentMemberSql, [samityId])).rows;
      const refSamityIds = cureentMember.map(element => element.ref_samity_id);

      result = result.filter(element => !refSamityIds.includes(element.id));
    }
    if (samityLevel === "N") {
      const sql = `select
                      a.*,
                      d.id as member_id,
                      d.member_name_bangla
                    from
                      coop.samity_info a
                    inner join coop.member_info b on
                      a.id = b.samity_id
                    inner join coop.samity_info c on
                      b.ref_samity_id = c.id
                    inner join coop.member_info d on
                      d.samity_id = c.id
                    where
                      a.samity_level = 'C'
                      and b.committee_signatory_person = 'Y'
                      and d.committee_signatory_person = 'Y'`;
      result = (await (await pgConnect.getConnection("slave")).query(sql)).rows;

      const cureentMemberSql = `
                          SELECT 
                           id,
                           ref_samity_id
                          FROM
                           coop.member_info 
                          WHERE 
                           samity_id=$1
                          `;
      const cureentMember = (await (await pgConnect.getConnection("slave")).query(cureentMemberSql, [samityId])).rows;
      const refSamityIds = cureentMember.map(element => element.ref_samity_id);

      result = result.filter(element => !refSamityIds.includes(element.id));
    }

    return result ? toCamelKeys(result) : result;
  }
}
