import { toCamelKeys } from "keys-transform";
import _ from "lodash";
import { buildInsertSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../../db-coop/factory/connection.db";

@Service()
export class CommitteeInfoServices {
  constructor() {}

  async memberListBySamityId(samityId: number) {
    const sql = `SELECT
    a.committee_type,
    a.meeting_date,
    a.effect_date,
    a.expire_date,
    a.duration,
    a.no_of_member,
    a.status as committee_status,
    b.id,
    b.committee_id,
    b.committee_role_id,
    b.member_id,
    b.status as member_status,
b.member_name as member_name_ns,
    b.nid,
    c.member_name as member_name_s,
c.member_name_bangla as member_name_bg,
c.nid as member_nid,
c.brn as member_brn,
    d.role_name,
    d.role_rank,                 
    d.id as role_id                  
FROM
    coop.committee_info a
INNER JOIN coop.committee_member b ON
    a.id = b.committee_id
LEFT JOIN coop.member_info c ON
    b.member_id = c.id
INNER JOIN master.committee_role d ON
    d.id = b.committee_role_id
WHERE a.samity_id = $1
    AND a.status= $2
    ORDER BY d.id ASC`;
    let result: any = (await (await pgConnect.getConnection("slave")).query(sql, [samityId, "A"])).rows;

    const committeeInfo = {
      committee_type: result[0].committee_type,
      committee_id: result[0].committee_id,
      meeting_date: result[0].meeting_date,
      effect_date: result[0].effect_date,
      expire_date: result[0].expire_date,
      duration: result[0].duration,
      no_of_member: result[0].no_of_member,
      status: result[0].committee_status,
    };

    result = {
      membersList: result.map((e: any) => {
        return _.omit(
          e,
          "committee_id",
          "meeting_date",
          "effect_date",
          "expire_date",
          "duration",
          "no_of_member",
          "status"
        );
      }),
      committeeInfo,
    };

    return result ? toCamelKeys(result) : result;
  }

  async isSamityValidForCommitteeInformation(samityId: number) {
    const sql = `SELECT
                   COUNT(id)
                 FROM
                   coop.committee_info
                 WHERE
                   samity_id = $1
                   AND committee_type IN ('E', 'S')
                   AND status = $2`;
    const count = (await (await pgConnect.getConnection("slave")).query(sql, [samityId, "A"])).rows[0]?.count;

    return count == 1 ? true : false;
  }

  async committeeMemberDeactivation(committeeMemberId: number) {
    const sql = `update coop.committee_member set status=$1 where id=$2 returning *`;
    const result = (await (await pgConnect.getConnection("slave")).query(sql, ["I", committeeMemberId])).rows;

    return result ? toCamelKeys(result) : result;
  }

  async isMemberAddable(samityId: number, committeeId: number) {
    const noOfMemberSql = `SELECT
                            a.no_of_member,
                            count(b.id) AS total_member_available
                          FROM
                            coop.committee_info a
                          INNER JOIN coop.committee_member b ON
                            a.id = b.committee_id
                          WHERE
                            a.id = $1
                            AND a.samity_id = $2
                            AND b.status = 'A'
                          GROUP BY
                            a.no_of_member,
                            b.committee_id`;
    let result = (await (await pgConnect.getConnection("slave")).query(noOfMemberSql, [committeeId, samityId])).rows[0];
    result = result ? toCamelKeys(result) : result;
    let returnValue = false;

    if (result) {
      returnValue = result.noOfMember == result.totalMemberAvailable ? false : true;
    }

    return returnValue;
  }

  async addMember(data: any, user: any) {
    const committeeTypeSql = `select committee_type from coop.committee_info where id=$1`;
    const { committee_type: committeeType } = (
      await (await pgConnect.getConnection("slave")).query(committeeTypeSql, [data.committeeId])
    ).rows[0];

    const { sql, params } = buildInsertSql("coop.committee_member", {
      ...data,
      committeeType,
      status: "A",
      createdBy: 127,
      createdAt: new Date(),
    });
    const result = (await (await pgConnect.getConnection("master")).query(sql, params)).rows[0];
    return result ? toCamelKeys(result) : result;
  }
}
