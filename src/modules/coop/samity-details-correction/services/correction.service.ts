import { toCamelKeys } from "keys-transform";
import { buildInsertSql } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../../db/connection.db";
import lodash from "lodash";
import { buildUpdateWithWhereSql } from "../../../../utils/sql-builder.util";
import BadRequestError from "../../../../errors/bad-request.error";

@Service()
export class SamityServices {
  constructor() {}

  async getSamityData(samityId: number) {
    const pool = db.getConnection("slave");
    const memberdatasql = `select id, member_name_bangla, COMMITTEE_ORGANIZER,COMMITTEE_CONTACT_PERSON,COMMITTEE_SIGNATORY_PERSON from coop.member_info where samity_id=$1`;
    let memberdata = (await pool.query(memberdatasql, [samityId])).rows;
    const samitydatasql = `select samity_formation_date,phone,mobile,email,website from coop.samity_info where id=$1`;

    let samitydata = (await pool.query(samitydatasql, [samityId])).rows[0];
    let margedata = { samityInfo: samitydata, memberInfo: memberdata };

    return margedata ? toCamelKeys(margedata) : {};
  }

  async postSamityData(data: any) {
    const pool = db.getConnection("master");
    let result, message;

    let { sql, params } = buildInsertSql("coop.application", { ...lodash.omit(data) });
    result = (await pool.query(sql, params)).rows[0];
    message = "সফলভাবে তৈরি করা হয়েছে";

    return result && message ? (toCamelKeys({ result, message }) as any) : {};
  }
}
