/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-17 10:19:09
 * @modify date 2021-11-17 10:19:09
 * @desc [description]
 */

import { PoolClient } from "pg";
import Container, { Service } from "typedi";
import { pgConnect } from "../../../../../db-coop/factory/connection.db";
import { buildInsertSql } from "../../../../../utils/sql-builder.util";
import {
  InitCommitteeMembersAttrs,
  InitCommitteeMembersInputAttrs,
  InitCommitteeRegistrationInputAttrs,
  InitCommitteeRegistrationUpdateAttrs,
} from "../../interfaces/init/init-committee-registration.interface";
import { RegistrationStepServices } from "../reg-steps.service";

@Service()
export class InitialCommitteeRegistrationServices {
  constructor() {}

  async getBySamityId(samityId: number) {
    const committeeType = "S";

    const initCommitteeQuery = `
      SELECT * FROM temps.committee_info
      WHERE samity_id = $1 AND committee_type = $2
    `;

    const initCommitteeParams = [samityId, committeeType];

    const { rows: committee } = await (
      await pgConnect.getConnection("slave")
    ).query(initCommitteeQuery, initCommitteeParams);

    const committeeId = committee[0].id;

    const committeeMembersQuery = `
      SELECT * FROM temps.committee_member
      WHERE committee_id = $1
    `;

    const committeeMembersParams = [committeeId];

    const { rows: committeeMembers } = await (
      await pgConnect.getConnection("slave")
    ).query(committeeMembersQuery, committeeMembersParams);

    const committeeDesignationQuery = `
    SELECT
      a.id,
      a.member_name,
      a.committee_organizer,
      a.committee_contact_person,
      a.committee_signatory_person
    FROM
      temps.member_info a
    WHERE
      a.samity_id = $1  AND
      a.is_active=$2
      AND (a.committee_organizer = 'Y'
      OR a.committee_contact_person = 'Y'
      OR a.committee_signatory_person = 'Y')`;

    const { rows: committeeDesignation } = await (
      await pgConnect.getConnection("slave")
    ).query(committeeDesignationQuery, [samityId, true]);

    //console.log("committeeDesignation", committeeDesignation);

    const committeeDesignationList = {
      committee_organizer: null,
      committee_contact_person: null,
      committee_signatory_person: null,
    };

    const committee_organizer = committeeDesignation.find((item) => item.committee_organizer === "Y");

    committeeDesignationList.committee_organizer = committee_organizer ? committee_organizer.id : null;

    const committee_contact_person = committeeDesignation.find((item) => item.committee_contact_person === "Y");
    committeeDesignationList.committee_contact_person = committee_contact_person ? committee_contact_person.id : null;

    const committee_signatory_person = committeeDesignation.find((item) => item.committee_signatory_person === "Y");
    committeeDesignationList.committee_signatory_person = committee_signatory_person
      ? committee_signatory_person.id
      : null;

    return {
      ...committee[0],
      ...committeeDesignationList,
      committeeMembers,
    };
  }

  async create(c: InitCommitteeRegistrationInputAttrs, createdBy: string) {
    const duration = 2;
    const committeeType = "S";
    const createdAt = new Date();

    const transaction = await (await pgConnect.getConnection("master")).connect();

    try {
      //begin transaction
      await transaction.query("BEGIN");

      //create committee
      const { sql: initCommitteeQuery, params: initCommitteeParams } = buildInsertSql("temps.committee_info", {
        duration,
        committeeType,
        samityId: c.samityId,
        doptorId: c.doptorId,
        noOfMember: c.noOfMember,
        createdBy,
        createdAt,
      });

      const { rows: committee } = await transaction.query(initCommitteeQuery, initCommitteeParams);
      //end create committee

      const committeeId = committee[0].id;

      //create committee members
      const committeeMembers: any = await this.addCommitteeMembers(
        c.committeeMembers,
        c.samityId,
        committeeId,
        transaction,
        createdBy
      );
      //end of committee members

      //assign member designation
      const committeeOrganizer = await this.assignCommitteeDesignation(
        "committee_organizer",
        c.committeeOrganizer,
        c.samityId,
        transaction
      );

      const committeeContactPerson = await this.assignCommitteeDesignation(
        "committee_contact_person",
        c.committeeContactPerson,
        c.samityId,
        transaction
      );

      let committeeSignatoryPerson = null;
      if (c.isMemberOfCentalOrNational) {
        committeeSignatoryPerson = await this.assignCommitteeDesignation(
          "committee_signatory_person",
          c.committeeSignatoryPerson,
          c.samityId,
          transaction
        );
      }

      if (committeeId) {
        const RegistrationStepService = Container.get(RegistrationStepServices);
        const regStepResult = await RegistrationStepService.updateSteps(c.samityId, transaction, 4, createdBy);
      }

      await transaction.query("COMMIT");

      return {
        ...committee[0],
        committeeOrganizer,
        committeeContactPerson,
        committeeSignatoryPerson,
        committeeMembers,
      };
    } catch (error) {
      await transaction.query("ROLLBACK");

      throw error;
    } finally {
      transaction.release();
    }
  }

  async update(id: number, c: InitCommitteeRegistrationUpdateAttrs, updatedBy: string) {
    const transaction = await (await pgConnect.getConnection("master")).connect();

    try {
      //begin transaction
      await transaction.query("BEGIN");

      //update committee
      const initCommitteeUpdateQuery = `
      UPDATE temps.committee_info
      SET no_of_member = $1,
      updated_by = $2,
      updated_at = NOW()
      WHERE id = $3
      RETURNING *
      `;
      const initCommitteeUpdateParams = [c.noOfMember, updatedBy, id];

      const { rows: committee } = await transaction.query(initCommitteeUpdateQuery, initCommitteeUpdateParams);
      //end create committee

      const committeeId = committee[0].id;

      //create committee members
      const committeeMembers: any = await this.addCommitteeMembers(
        c.committeeMembers,
        c.samityId,
        committeeId,
        transaction,
        updatedBy
      );
      //end of committee members

      //assign member designation
      const committeeOrganizer = await this.assignCommitteeDesignation(
        "committee_organizer",
        c.committeeOrganizer,
        c.samityId,
        transaction
      );

      const committeeContactPerson = await this.assignCommitteeDesignation(
        "committee_contact_person",
        c.committeeContactPerson,
        c.samityId,
        transaction
      );
      let committeeSignatoryPerson;
      if (c.isMemberOfCentalOrNational) {
        committeeSignatoryPerson = await this.assignCommitteeDesignation(
          "committee_signatory_person",
          c.committeeSignatoryPerson,
          c.samityId,
          transaction
        );
      } else if (!c.isMemberOfCentalOrNational) {
        committeeSignatoryPerson = await this.assignCommitteeDesignation(
          "committee_signatory_person",
          null,
          c.samityId,
          transaction
        );
      }

      await transaction.query("COMMIT");

      return {
        ...committee[0],
        committeeOrganizer,
        committeeContactPerson,
        committeeSignatoryPerson,
        committeeMembers,
      };
    } catch (error) {
      await transaction.query("ROLLBACK");
      throw error;
    } finally {
      transaction.release();
    }
  }

  async committeeTypeCheck(samityId: number) {
    const committeeType = "S";
    const queryText = `
    SELECT count (committee_type) 
    FROM temps.committee_info
    WHERE (samity_id= $1 
      AND committee_type= $2)`;

    const {
      rows: [{ count }],
    } = await (await pgConnect.getConnection("slave")).query(queryText, [samityId, committeeType]);

    return Number(count) ? true : false;
  }

  /**
   * @param  {CommitteeMemberInputAttrs[]} members Array of members
   * @param  {number} samityId Samity id
   * @param  {number} committeeId Committee id
   * @param  {PoolClient} transaction Transaction pool client of postgres
   * @param  {string="admin"} createdBy Created by default is admin
   */
  async addCommitteeMembers(
    members: InitCommitteeMembersInputAttrs[],
    samityId: number,
    committeeId: number,
    transaction: PoolClient,
    createdBy: string = "admin"
  ): Promise<InitCommitteeMembersAttrs> {
    const committeeType = "S";
    const committeeMembers: any = [];
    const createdAt = new Date();

    const committeeMembersDeleteQuery = `
    DELETE FROM temps.committee_member
    WHERE samity_id = $1 AND committee_id = $2
    `;
    const committeeMembersDeleteParams = [samityId, committeeId];
    await transaction.query(committeeMembersDeleteQuery, committeeMembersDeleteParams);

    for await (const member of members) {
      const { sql: initCommitteeMemberQuery, params: initCommitteeMemberParams } = buildInsertSql(
        "temps.committee_member",
        {
          committeeId,
          memberId: member.memberId,
          samityId,
          committeeType,
          committeeRoleId: member.committeeRoleId,
          createdBy,
          createdAt,
        }
      );

      const {
        rows: [committeeMember],
      } = await transaction.query(initCommitteeMemberQuery, initCommitteeMemberParams);

      committeeMembers.push(committeeMember);
    }
    return committeeMembers;
  }

  /**
   * @param  {string} fieldName Field name desired to be updated
   * @param  {number} memberId Member id
   * @param  {number} samityId Samity id
   * @param  {PoolClient} transaction Transaction pool client of postgres
   */
  async assignCommitteeDesignation(
    fieldName: string,
    memberId: number | null,
    samityId: number,
    transaction: PoolClient
  ): Promise<number | null> {
    const committeeDesignationResetQuery = `
    UPDATE temps.member_info
    SET ${fieldName} = 'N'
    WHERE samity_id = $1 AND ${fieldName} = 'Y'
    `;
    const committeeDesignationResetParams = [samityId];
    await transaction.query(committeeDesignationResetQuery, committeeDesignationResetParams);

    if (memberId) {
      const committeeDesignationUpdateQuery = `
    UPDATE temps.member_info
    SET ${fieldName} = 'Y'
    WHERE id = $1
    RETURNING id
    `;
      const committeeDesignationUpdateParams = [memberId];
      const {
        rows: [{ member_id: id }],
      } = await transaction.query(committeeDesignationUpdateQuery, committeeDesignationUpdateParams);

      return id;
    }
    return null;
  }
}
