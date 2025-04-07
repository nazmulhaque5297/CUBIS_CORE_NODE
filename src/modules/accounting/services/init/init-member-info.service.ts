/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-10-31 10:36:43
 * @modify date 2021-10-31 10:36:43
 * @desc [description]
 */

import { toCamelKeys, toSnakeCase } from "keys-transform";

import lo from "lodash";
import { PoolClient } from "pg";
import { BadRequestError, buildSql } from "rdcd-common";
import Container, { Service } from "typedi";
import { pgConnect } from "../../../../../db-coop/factory/connection.db";
import { getFileName } from "../../../../../utils/file.util";
import { minioObjectDelete, minioPresignedGet, uploadObject } from "../../../../../utils/minio.util";
import { isExistsByColumn } from "../../../../../utils/service.utils";
import { buildInsertSql, buildUpdateSql } from "../../../../../utils/sql-builder.util";
import {
  InitialMemberInfoInputAttrs,
  MemberAddressInfos,
  MemberInfoOutput,
  MemberInfos,
  UpdateMemberDesignationAttrs,
} from "../../interfaces/init/init-member-info-interface";
import { RegistrationStepServices } from "../reg-steps.service";
import { SamityRegistrationServices } from "./init-samity-info.service";
const SamityRegistrationService = Container.get(SamityRegistrationServices);

@Service()
export class InitialMemberInfoServices {
  constructor() {}
  /**
   * @param  {boolean} isPagination
   * @param  {number} limit
   * @param  {number} offset
   * @param  {object} allQuery
   */

  async get(isPagination: boolean, limit: number, offset: number, allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT * FROM temps.member_info";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      const createSql = buildSql(sql, allQuery, "AND", this.filter, "id", limit, offset);
      queryText = isPagination ? createSql[0] : createSql[1];

      var members = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = isPagination
        ? "SELECT * FROM temps.member_info where is_active=true ORDER BY id LIMIT $1 OFFSET $2"
        : "SELECT * FROM temps.member_info where is_active=true ORDER BY id ";
      members = await (await pgConnect.getConnection("slave")).query(queryText, isPagination ? [limit, offset] : []);
    }

    const memberInformation: any = await minioPresignedGet(toCamelKeys(members.rows), ["memberPhoto", "memberSign"]);

    for (const [index, element] of memberInformation.entries()) {
      memberInformation[index].documents = await minioPresignedGet(element.documents, ["fileName"]);
    }

    return memberInformation;
  }

  async getByType(type: string, queryBody: any) {
    let result;
    if (type == "central") {
      const { samityId } = queryBody;

      const samityIdSql = ` select * from temps.samity_info where id=$1`;
      const centralSamityInfo = (await (await pgConnect.getConnection("slave")).query(samityIdSql, [samityId])).rows[0];
      const { district_id, upazila_id } = centralSamityInfo;
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
      result = (await (await pgConnect.getConnection("slave")).query(sql, [district_id, upazila_id])).rows;
    }

    return result ? toCamelKeys(result) : result;
  }

  async getBySamityId(samityId: number, query: any) {
    const samityLevelSql = `select samity_level from temps.samity_info where id=$1`;
    const { samity_level: samityLevel } = (
      await (await pgConnect.getConnection("slave")).query(samityLevelSql, [samityId])
    ).rows[0];

    if (samityLevel == "C") {
      let result = [];
      if (query.getType == "post") {
        const samityIdSql = ` select district_id,upazila_id from temps.samity_info where id=$1`;
        const { district_id: districtId, upazila_id: upazilaId } = (
          await (await pgConnect.getConnection("slave")).query(samityIdSql, [samityId])
        ).rows[0];

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
      } else if (query.getType == "update") {
        const sql = `select
                       a.id,
                       a.member_code,
                       a.samity_id,
                       a.member_name,
                       a.committee_organizer,
                       a.committee_contact_person,
                       a.committee_signatory_person,
                       a.ref_samity_id,
                       a.member_admission_date,
                       a.doptor_id,
                       a.is_active,
                       a.documents,
                       a.member_photo,
                       a.member_sign,
                       b.samity_code,
                       b.samity_details_address,
                       b.phone,
                       b.mobile,
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
                       a.samity_id = $1 and a.is_active=true
                       and c.committee_signatory_person = 'Y'`;
        result = (await (await pgConnect.getConnection("slave")).query(sql, [samityId])).rows;

        if (result.length > 0) {
          result = await minioPresignedGet(toCamelKeys(result), ["memberPhoto", "memberSign"]);

          for await (const [index, element] of result.entries()) {
            const memberId = element.id;

            result[index].documents = await minioPresignedGet(element.documents, ["fileName"]);
          }
        }
      }
      return result ? toCamelKeys(result) : result;
    }

    if (samityLevel == "N") {
      let result;
      if (query.getType == "post") {
        const samityIdSql = ` select district_id,upazila_id from temps.samity_info where id=$1`;
        const { district_id: districtId, upazila_id: upazilaId } = (
          await (await pgConnect.getConnection("slave")).query(samityIdSql, [samityId])
        ).rows[0];

        const sql = `select
                      A.central_samity_id,
                      A.central_samity_name,
                      A.member_samity_name,
                      A.samity_details_address,
                      A.ref_samity_id,
                      A.samity_code,
                      A.committee_signatory_person,
                      A.samity_registration_date,
                      A.phone,
                      A.mobile,
                      B.member_name_bangla as samity_signatory_person
                    from
                      (
                      select
                        a.id as central_samity_id,
                        a.samity_code as samity_code,
                        a.samity_name as central_samity_name,
                        a.samity_details_address as samity_details_address,
                        a.samity_registration_date as samity_registration_date,
                        a.phone,
                        a.mobile,
                        b.member_name as member_samity_name,
                        b.ref_samity_id as ref_samity_id,
                        b.committee_signatory_person
                      from
                        coop.samity_info a
                      inner join coop.member_info b on
                        a.id = b.samity_id
                      where
                        a.samity_level = 'C'
                        and b.committee_signatory_person = 'Y'
                        and a.district_id = $1
                        and a.upazila_id = $2
                                          ) A,
                      (
                      select
                        a.id as samity_id,
                        b.id as member_info_id,
                        b.member_name as member_name,
                        b.member_name_bangla as member_name_bangla,
                        b.committee_signatory_person as committee_signatory_person
                      from
                        coop.samity_info a
                      inner join coop.member_info b on
                        a.id = b.samity_id
                      where
                        samity_level = 'P'
                        and committee_signatory_person = 'Y' ) B
                    where
                      B.samity_id = A.ref_samity_id
                    order by
                      A.central_samity_id`;
        result = (await (await pgConnect.getConnection("slave")).query(sql, [districtId, upazilaId])).rows;
      } else if (query.getType == "update") {
        const sql = `               select
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
        result = (await (await pgConnect.getConnection("slave")).query(sql, [samityId])).rows;

        if (result.length > 0) {
          result = await minioPresignedGet(toCamelKeys(result), ["memberPhoto", "memberSign"]);

          for await (const [index, element] of result.entries()) {
            const memberId = element.id;

            result[index].documents = await minioPresignedGet(element.documents, ["fileName"]);
          }
        }

        //console.log("result", result);
      }

      return result ? toCamelKeys(result) : result;
    } else if (samityLevel == "P") {
      if (Object.keys(query).length === 0 && query.constructor === Object) {
        const transaction = await (await pgConnect.getConnection("slave")).connect();

        try {
          transaction.query("BEGIN");
          const sqlMemberInfo = `SELECT
                                   mi.*,
                                   b.display_value AS occupation_name
                                 FROM
                                   temps.member_info AS mi
                                 LEFT JOIN master.code_master AS b
                                                                ON
                                   mi.occupation_id = b.id
                                 WHERE
                                   mi.samity_id = $1`;

          const memberInfoResult: any = toCamelKeys((await transaction.query(sqlMemberInfo, [samityId])).rows);

          let memberInfo = memberInfoResult;
          const memberInformation = [];

          if (memberInfoResult.length > 0) {
            memberInfo = await minioPresignedGet(toCamelKeys(memberInfoResult), ["memberPhoto", "memberSign"]);

            for await (const [index, element] of memberInfo.entries()) {
              const memberId = element.id;

              memberInfo[index].documents = await minioPresignedGet(element.documents, ["fileName"]);

              const sqlPresentAddress = ` SELECT * FROM temps.member_address_info  
                                         WHERE samity_id= $1 AND member_id=$2 AND address_type=$3`;
              const memberPresentAddress = (await transaction.query(sqlPresentAddress, [samityId, memberId, "PRE"]))
                .rows[0];

              const sqlPermanentAddress = ` SELECT * FROM temps.member_address_info  
                                         WHERE samity_id= $1 AND member_id=$2 AND address_type=$3`;
              const memberPermanentAddress = (await transaction.query(sqlPermanentAddress, [samityId, memberId, "PER"]))
                .rows[0];

              const memberObj = {
                memberBasicInfo: element,
                memberPresentAddress,
                memberPermanentAddress,
              };

              memberInformation.push(memberObj);
            }
          }

          transaction.query("COMMIT");

          return memberInformation ? toCamelKeys(memberInformation) : memberInformation;
        } catch (ex) {
          transaction.query("ROLLBACK");
          throw new BadRequestError(`Error is ${ex}`);
        } finally {
          transaction.release();
        }
      }
    }
  }

  /**
   * @param  {MemberInfoAttrs} m
   */
  async create(m: InitialMemberInfoInputAttrs, createdBy: string): Promise<MemberInfoOutput> {
    const createdAt = new Date();
    const jsonPresentAddress: any = m.presentAddress;
    const jsonPermanentAddress: any = m.permanentAddress;
    jsonPresentAddress.samityId = m.samityId;
    jsonPermanentAddress.samityId = m.samityId;
    const memberCode = await this.generateMemberCode(m.samityId);

    const transaction = await (await pgConnect.getConnection("master")).connect();

    try {
      await transaction.query("BEGIN");

      for (let [index, element] of m.documents.entries()) {
        if (element.base64Image) {
          let bufferObj = Buffer.from(element.base64Image, "base64");

          const fileName = getFileName(element.name);

          await uploadObject({ fileName, buffer: bufferObj });
          if (element.docType == "IMG") {
            m.memberPhoto = fileName;
          }
          if (element.docType == "SIN") {
            m.memberSign = fileName;
          }

          delete m.documents[index].mimeType;
          delete m.documents[index].base64Image;
          m.documents[index].fileName = fileName;
        }
      }

      const createBody: any = {
        ...lo.omit(m, ["permanentAddress", "presentAddress", "documents"]),
        documents: JSON.stringify(m.documents),
      };

      const { sql, params } = buildInsertSql("temps.member_info", {
        ...createBody,
        memberCode,
        createdBy,
        createdAt,
      });

      const memberValue: MemberInfos = toCamelKeys((await transaction.query(sql, params)).rows[0]) as MemberInfos;

      let PresentAddress: MemberAddressInfos = {} as MemberAddressInfos;
      let PermanentAddress: MemberAddressInfos = {} as MemberAddressInfos;

      if (m.permanentAddress && m.presentAddress) {
        const isMemberIdValidPresentAddress = await this.memberIdExistsOnAdressType(memberValue.id, "PRE");
        if (!isMemberIdValidPresentAddress) {
          jsonPresentAddress.memberId = memberValue.id;
          jsonPresentAddress.createdBy = createdBy;
          jsonPresentAddress.createdAt = new Date();
          PresentAddress = await this.addPresentAddress(jsonPresentAddress, transaction);
        } else {
          throw new BadRequestError("Member Id already used against Present address type");
        }

        const isMemberIdValidPermanentAddress = await this.memberIdExistsOnAdressType(memberValue.id, "PER");
        if (!isMemberIdValidPermanentAddress) {
          jsonPermanentAddress.memberId = memberValue.id;
          jsonPermanentAddress.createdBy = createdBy;
          jsonPermanentAddress.createdAt = new Date();
          PermanentAddress = await this.addPresentAddress(jsonPermanentAddress, transaction);
        } else {
          throw new BadRequestError("Member Id already used against Permanent address type");
        }
      }

      const { sql: memberFinancialSql, params: memberFinancialParams } = buildInsertSql("temps.member_financial_info", {
        memberId: memberValue.id,
        samityId: m.samityId,
        noOfShare: 0,
        shareAmount: 0,
        savingsAmount: 0,
        loanOutstanding: 0,
        createdBy,
        createdAt,
      });

      const memberFinancialData = (await transaction.query(memberFinancialSql, memberFinancialParams)).rows[0];

      const isMemberPassed = await this.isRequiredMemberPass(m.samityId, transaction);

      if (isMemberPassed?.isPass) {
        const RegistrationStepService = Container.get(RegistrationStepServices);
        const regStepResult = await RegistrationStepService.updateSteps(m.samityId, transaction, 3, createdBy);
      }

      await transaction.query("COMMIT");

      return {
        memberValue,
        PresentAddress,
        PermanentAddress,
        memberFinancialData,
      };
    } catch (error) {
      await transaction.query("ROLLBACK");

      throw error;
    } finally {
      transaction.release();
    }
  }
  async createMemberOFCentralNationalSamity(m: any, createdBy: string) {
    for (let [index, element] of m.documents.entries()) {
      if (element.base64Image) {
        let bufferObj = Buffer.from(element.base64Image, "base64");

        const fileName = getFileName(element.name);

        await uploadObject({ fileName, buffer: bufferObj });

        if (element.docType == "IMG") {
          m.memberPhoto = fileName;
        }
        if (element.docType == "SIN") {
          m.memberSign = fileName;
        }

        delete m.documents[index].mimeType;
        delete m.documents[index].base64Image;
        m.documents[index].fileName = fileName;
      }
    }

    const createBody: any = {
      ...lo.omit(m, ["documents"]),
      documents: JSON.stringify(m.documents),
    };

    const createdAt = new Date();

    const samityCode = await SamityRegistrationService.getSamityCode(m.samityId);

    const memberCode = await this.generateMemberCode(m.samityId);
    const transaction = await (await pgConnect.getConnection("master")).connect();

    try {
      transaction.query("BEGIN");
      const { sql, params } = buildInsertSql("temps.member_info", {
        ...createBody,
        memberCode,
        createdBy,
        createdAt,
      });

      const result = (await (await pgConnect.getConnection("master")).query(sql, params)).rows;

      const isMemberPassed = await this.isRequiredMemberPass(m.samityId, transaction);

      if (isMemberPassed?.isPass) {
        const RegistrationStepService = Container.get(RegistrationStepServices);
        const regStepResult = await RegistrationStepService.updateSteps(m.samityId, transaction, 3, createdBy);
      }

      transaction.query("COMMIT");
      return result;
    } catch (ex: any) {
      transaction.query("ROLLBACK");
    } finally {
      transaction.release();
    }
  }

  async update(m: any, updatedBy: string, id: number): Promise<any> {
    const jsonPresentAddress: any = m.presentAddress;
    const jsonPermanentAddress: any = m.permanentAddress;

    const updatePresentAddress = lo.omit(jsonPresentAddress, ["samityId", "memberId"]);
    const updatePermanentAddress = lo.omit(jsonPermanentAddress, ["samityId", "memberId"]);

    const presentAddressId = jsonPresentAddress.id;
    const permanentAddressId = jsonPermanentAddress.id;

    const transaction = await (await pgConnect.getConnection("master")).connect();

    try {
      await transaction.query("BEGIN");

      for (let [index, element] of m.documents.entries()) {
        if (element.base64Image) {
          let bufferObj = Buffer.from(element.base64Image, "base64");

          const fileName = getFileName(element.name);

          await uploadObject({ fileName, buffer: bufferObj });
          if (element.docType == "IMG") {
            m.memberPhoto = fileName;
          }
          if (element.docType == "SIN") {
            m.memberSign = fileName;
          }

          delete m.documents[index].mimeType;
          delete m.documents[index].base64Image;
          m.documents[index].fileName = fileName;
        }
      }

      const updateBody: any = {
        ...lo.omit(m, ["permanentAddress", "presentAddress", "documents", "nid", "brn"]),
        documents: JSON.stringify(m.documents),
        nid: m.nid ? m.nid : null,
        brn: m.brn ? m.brn : null,
      };

      const { sql, params } = buildUpdateSql("temps.member_info", id, {
        ...updateBody,
        updatedBy,
        updatedAt: new Date(),
      });

      const updateMemberValue: MemberInfos = toCamelKeys((await transaction.query(sql, params)).rows[0]) as MemberInfos;

      let PresentAddress: MemberAddressInfos = await this.updatedMemberAddress(
        updatePresentAddress,
        updatedBy,
        presentAddressId,
        transaction
      );
      let PermanentAddress: MemberAddressInfos = await this.updatedMemberAddress(
        updatePermanentAddress,
        updatedBy,
        permanentAddressId,
        transaction
      );

      await transaction.query("COMMIT");

      return {
        updateMemberValue,
        PresentAddress,
        PermanentAddress,
      };
    } catch (error) {
      await transaction.query("ROLLBACK");
      throw new BadRequestError(`error is ${error}`);
    } finally {
      transaction.release();
    }
  }

  async updateMemberOFCentralNationalSamity(m: any, updatedBy: string, id: number): Promise<any> {
    for (let [index, element] of m.documents.entries()) {
      if (element.base64Image) {
        let bufferObj = Buffer.from(element.base64Image, "base64");

        const fileName = getFileName(element.name);

        await uploadObject({ fileName, buffer: bufferObj });
        if (element.docType == "IMG") {
          m.memberPhoto = fileName;
        }
        if (element.docType == "SIN") {
          m.memberSign = fileName;
        }

        delete m.documents[index].mimeType;
        delete m.documents[index].base64Image;
        m.documents[index].fileName = fileName;
      }
    }

    const updateBody: any = {
      ...lo.omit(m, ["documents"]),
      documents: JSON.stringify(m.documents),
    };

    const { sql, params } = buildUpdateSql("temps.member_info", id, {
      ...updateBody,
      updatedBy,
      updatedAt: new Date(),
    });

    const updateMemberValue: any = (await (await pgConnect.getConnection("master")).query(sql, params)).rows[0];

    return updateMemberValue ? toCamelKeys(updateMemberValue) : updateMemberValue;
  }

  async addPresentAddress(data: object, transaction: PoolClient): Promise<MemberAddressInfos> {
    const { sql, params } = buildInsertSql("temps.member_address_info", {
      ...data,
    });

    return toCamelKeys((await transaction.query(sql, params)).rows[0]) as MemberAddressInfos;
  }

  async updatedMemberAddress(
    data: object,
    updatedBy: string,
    id: number,
    transaction: PoolClient
  ): Promise<MemberAddressInfos> {
    const { sql, params } = buildUpdateSql("temps.member_address_info", id, {
      ...data,
      updatedBy,
      updatedAt: new Date(),
    });

    return toCamelKeys((await transaction.query(sql, params)).rows[0]) as MemberAddressInfos;
  }

  async generateMemberCode(samityId: number) {
    const queryText = `select member_code,samity_id from temps.member_info where samity_id=$1 order by member_code desc`;
    const result = await (await (await pgConnect.getConnection("slave")).query(queryText, [samityId])).rows[0];

    return result ? parseInt(result.member_code) + 1 : 1;
  }

  async updateCommitteeDesignations(designations: UpdateMemberDesignationAttrs) {
    const { committeeOrganizer, committeeContactPerson, committeeSignatoryPerson } = designations;

    //transaction

    const update1 = `UPDATE temps.member_info SET committee_organizer = $1 WHERE member_id = $2;`;
    const update2 = `UPDATE temps.member_info SET committee_contact_person = $1 WHERE member_id = $2;`;
    const update3 = `UPDATE temps.member_info SET committee_signatory_person = $1 WHERE member_id = $2;`;
    const transaction = await pgConnect.getConnection("master");

    try {
      await transaction.query("BEGIN");
      await transaction.query(update1, ["Y", committeeOrganizer]);
      await transaction.query(update2, ["Y", committeeContactPerson]);
      await transaction.query(update3, ["Y", committeeSignatoryPerson]);
      await transaction.query("COMMIT");
    } catch (error) {
      await transaction.query("ROLLBACK");
      return false;
    }
    return true;
  }

  async delete(id: number) {
    const queryText = `
     DELETE FROM temps.member_info 
     WHERE member_id = $1 
     RETURNING *`;
    const {
      rows: [member],
    } = await (await pgConnect.getConnection("master")).query(queryText, [id]);

    if (member) {
      await minioObjectDelete(member, ["member_photo", "member_sign", "member_testimonial"]);
    }

    return member.member_id;
  }

  async count(allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM temps.member_info";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = buildSql(sql, allQuery, "AND", this.filter, "id")[1];
      var result = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM temps.member_info where is_active=true";
      result = await (await pgConnect.getConnection("slave")).query(queryText);
    }
    return result.rows[0].count;
  }

  async idCheck(id: number): Promise<boolean> {
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
             FROM temps.member_info
             WHERE id = $1
           `,
        [id]
      );
      return parseInt(member.count) >= 1 ? true : false;
    }
  }

  async memberIdExist(id: number) {
    return await isExistsByColumn("id", "temps.member_info", await pgConnect.getConnection("slave"), { id });
  }

  filter(key: string) {
    return toSnakeCase(key);
  }

  async clean(obj: any) {
    for (var propName in obj) {
      if (obj[propName] === null || obj[propName] === undefined || obj[propName] === "" || obj[propName] === "") {
        delete obj[propName];
      }
    }
    return obj;
  }

  async nidExist(nid: number, samityId: number): Promise<Boolean> {
    // const pool = (await pgConnect.getConnection("master")).connect();
    return await isExistsByColumn("id", "temps.member_info", await pgConnect.getConnection("slave"), {
      nid,
      samityId,
    });
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

  async memberIdExistsOnAdressType(id: number, addressType: string): Promise<boolean> {
    const {
      rows: [nidCount],
    } = await (
      await pgConnect.getConnection("slave")
    ).query(
      `
        SELECT COUNT(member_id) 
        FROM 
        temps.member_address_info
        WHERE 
          member_id=$1 AND address_type = $2;
      `,
      [id, addressType]
    );

    return parseInt(nidCount.count) >= 1 ? true : false;
  }

  // check address id of present and permanent address of member

  async checkAddressId(address: MemberAddressInfos, nameOfTheField: string) {
    const id = address.id;
    const samityId = address.samityId;
    const memberId = address.memberId;
    if (nameOfTheField === "permanent") {
      const addressType = "PER";
      const sql = ` SELECT COUNT(id) 
                   FROM temps.member_address_info 
                   WHERE id=$1 AND samity_id=$2 AND member_id=$3 AND address_type=$4 `;
      const resultValue = parseInt(
        (await (await pgConnect.getConnection("slave")).query(sql, [id, samityId, memberId, addressType])).rows[0].count
      );
      return resultValue >= 1 ? true : false;
    } else if (nameOfTheField === "present") {
      const addressType = "PRE";
      const sql = ` SELECT COUNT(id) 
                   FROM temps.member_address_info 
                   WHERE id=$1 AND samity_id=$2 AND member_id=$3 AND address_type=$4 `;
      const resultValue = parseInt(
        (await (await pgConnect.getConnection("slave")).query(sql, [id, samityId, memberId, addressType])).rows[0].count
      );
      return resultValue >= 1 ? true : false;
    }
  }

  async addressIdExist(id: number, samityId: number, addressType: string) {
    return await isExistsByColumn("id", "temps.member_address_info ", await pgConnect.getConnection("slave"), {
      id,
      samityId,
      addressType,
    });
  }

  async getuserId(id: string) {
    const sql = `SELECT id from citizen.user WHERE my_gov_id=$1`;
    const result = (await (await pgConnect.getConnection("slave")).query(sql, [id])).rows[0].id;

    return result;
  }

  async isRequiredMemberPass(samityId: number, transaction?: PoolClient) {
    if (transaction) {
      const queryTextForMember = `select service_rules from coop.service_info where id=$1`;
      const { service_rules: serviceRules } = (await transaction.query(queryTextForMember, [2])).rows[0];

      const queryTextSamityLevel = `select samity_level from temps.samity_info where id=$1`;
      const { samity_level: samityLevel } = (await transaction.query(queryTextSamityLevel, [samityId])).rows[0];

      const queryTextCountMember = `select count(id) from temps.member_info where samity_id=$1`;
      const { count: memberCount } = (await transaction.query(queryTextCountMember, [samityId])).rows[0];
      if (serviceRules.samity_member[0][samityLevel] <= memberCount) {
        return {
          expectedMember: serviceRules.samity_member[0][samityLevel],
          memberCount,
          isPass: true,
        };
      } else {
        return {
          expectedMember: serviceRules.samity_member[0][samityLevel],
          memberCount,
          isPass: false,
        };
      }
    } else {
      const transaction = await (await pgConnect.getConnection("slave")).connect();
      try {
        transaction.query("BEGIN");
        const queryTextForMember = `select service_rules from coop.service_info where id=$1`;
        const { service_rules: serviceRules } = (await transaction.query(queryTextForMember, [2])).rows[0];

        const queryTextSamityLevel = `select samity_level from temps.samity_info where id=$1`;
        const { samity_level: samityLevel } = (await transaction.query(queryTextSamityLevel, [samityId])).rows[0];

        const queryTextCountMember = `select count(id) from temps.member_info where samity_id=$1`;
        const { count: memberCount } = (await transaction.query(queryTextCountMember, [samityId])).rows[0];

        transaction.query("COMMIT");
        if (serviceRules.samity_member[0][samityLevel] <= memberCount) {
          return {
            expectedMember: serviceRules.samity_member[0][samityLevel],
            memberCount,
            isPass: true,
          };
        } else {
          return {
            expectedMember: serviceRules.samity_member[0][samityLevel],
            memberCount,
            isPass: false,
          };
        }
      } catch (ex) {
        //console.log("error is:", ex);
        transaction.query("ROLLBACK");
      } finally {
        transaction.release();
      }
    }
  }

  async getRequiredDocument(samityId: number) {
    const sql = `SELECT
                 d.id AS doc_id,
                 d.doc_type,
                 d.doc_type_desc,
                 c.is_mandatory
               FROM
                 temps.samity_info a
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

    // const sqlForSIG = `select id from master.document_type where doc_type='SIG' `;
    // const { id: idSIG } = (
    //   await (await pgConnect.getConnection("slave")).query(sqlForSIG)
    // ).rows[0];
    // const sqlForIMG = `select id from master.document_type where doc_type='IMG' `;
    // const { id: idIMG } = (
    //   await (await pgConnect.getConnection("slave")).query(sqlForIMG)
    // ).rows[0];
    return result ? toCamelKeys(result) : result;
  }

  async isDocumentValid(samityId: number, list: any) {
    const sql = `SELECT
                 d.id,c.is_mandatory,d.doc_type_desc
               FROM
                 temps.samity_info a
               INNER JOIN coop.samity_type b ON
                 a.samity_type_id = b.id
               INNER JOIN coop.samity_doc_mapping c ON
                 b.id = c.samity_type_id
                 AND a.samity_level = c.samity_level
               INNER JOIN master.document_type d ON
                 d.id = c.doc_type_id
               WHERE
                 a.id = $1
                 AND c.type = 'M'
                 AND d.is_active = TRUE`;

    let result = (await (await pgConnect.getConnection("slave")).query(sql, [samityId])).rows;

    const mandatoryDocumentsIds = result.filter((e) => e.is_mandatory == "Y");

    const ids = result.map((element: any) => {
      return element.id;
    });

    for (const element of mandatoryDocumentsIds) {
      if (!list.includes(element.id)) {
        return {
          message: `${element.doc_type_desc} আবশ্যিক ডকুমেন্ট টি দেয়া হয়নি `,
          returnValue: false,
        };
        break;
      }
    }

    for (const element of list) {
      if (!ids.includes(element)) {
        return {
          message: `ভুল ডকুমেন্ট প্রদান করা হয়েছে`,
          returnValue: false,
        };
        break;
      }
    }

    return {
      message: `সঠিক ডকুমেন্ট প্রদান করা হয়েছে`,
      returnValue: true,
    };
  }
}
