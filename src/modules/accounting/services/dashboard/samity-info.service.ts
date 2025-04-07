import { toCamelKeys } from "keys-transform";
import { Service } from "typedi";
import { pgConnect } from "../../../../../db-coop/factory/connection.db";

@Service()
export class SamityInfoServices {
  constructor() {}

  async getAllTypeOfSamityInformation(user: any, doptorId: number) {
    const userId = user.type === "user" ? user.userId : user.userId;
    let userType = user.type === "user" ? "user" : "citizen";

    let approveSamityInfo = [];
    let tempSamityInfo = [];
    let authorizedSamityInfo = [];

    let result = [];
    let params: any = [];
    let sql = ``;
    if (userType == "citizen") {
      sql = `SELECT
              a.id ,
              a.samity_name,
              a.samity_level,
              a.sold_share,
              a.no_of_share,
              a.share_price,
              false as is_manual,
              'temp' AS flag,
              'organizer' AS ROLE
            FROM
              temps.samity_info a
            INNER JOIN coop.application b ON
                    a.id =(b.data->>'samity_id')::int
            WHERE
              a.organizer_id = $1
              AND b.service_id IN (2, 19)
              AND b.samity_id IS NULL
              AND a.doptor_id=$2
            UNION 
              SELECT
              id ,
              samity_name,
              samity_level,
              sold_share,
              no_of_share,
              share_price,
              is_manual,
              'approved' AS flag,
              'organizer' AS ROLE
            FROM
              coop.samity_info
            WHERE
              organizer_id = $1
              AND doptor_id=$2
            UNION 
                        SELECT
              b.id ,
              b.samity_name ,
              b.samity_level,
              b.sold_share,
              b.no_of_share,
              b.share_price,
              b.is_manual,
              'approved' AS flag,
              'authorizer' AS ROLE
            FROM
              coop.samity_authorized_person a
            INNER JOIN coop.samity_info b ON
              a.samity_id = b.id
            WHERE
              a.user_id = $1 AND a.status=true AND b.doptor_id=$2`;
      params = [userId, doptorId];
    } else if (userType == "user") {
      sql = `SELECT
               a.id ,
               a.samity_name,
               a.samity_level,
               a.sold_share,
               a.no_of_share,
               a.share_price,
               false as is_manual,
               'temp' AS flag
             FROM
               temps.samity_info a
               INNER JOIN coop.application b ON
               a.id =(b.data->>'samity_id')::int

             WHERE
               a.office_id = $1
               AND b.service_id IN (2, 19)
               AND b.samity_id IS NULL
             UNION 
             SELECT
               id ,
               samity_name,
               samity_level,
               sold_share,
               no_of_share,
               share_price,
               is_manual,
               'approved' AS flag
             FROM
               coop.samity_info
             WHERE
                office_id = $2
            `;
      params = [user.officeId, user.officeId];
    }

    result = (await (await pgConnect.getConnection("slave")).query(sql, params)).rows;

    return result ? toCamelKeys(result) : result;
  }
}
