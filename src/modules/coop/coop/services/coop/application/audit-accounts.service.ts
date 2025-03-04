/**
 * @author Md Hasibuzzaman
 * @email hasib.9437.hu@gmail.com
 * @create date 2023/05/31 10:13:48
 * @modify date 2023/05/31 10:13:48
 * @desc [description]
 */
import { toCamelKeys } from "keys-transform";
import { BadRequestError, buildUpdateWithWhereSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../../../db-coop/factory/connection.db";

@Service()
export class AuditAccoutsServices {
  constructor() {}

  async getApplicationById(samityId: any, doptorId: number, serviceId: number) {
    try {
      const sql = `SELECT id,samity_id,next_app_designation_id,status,data,edit_enable FROM COOP.APPLICATION WHERE SAMITY_ID = $1
      AND DOPTOR_ID = $2
      AND SERVICE_ID = $3
      AND STATUS IN ($4, $5)`;

      let result = (
        await (await pgConnect.getConnection("slave")).query(sql, [samityId, doptorId, serviceId, "P", "C"])
      ).rows[0];
      result = result ? toCamelKeys(result) : {};
      return result;
    } catch (ex: any) {
      throw new BadRequestError(ex);
    }
  }
  async create(data: any, user: any) {
    data.createdAt = new Date();
    return data;
  }
  async update(id: number, reqBody: any, user: any, updatedBy: any): Promise<any[]> {
    let result = [];
    const updatedAt = new Date();
    const data = reqBody.data;
    data.userType = user.type;
    data.userId = user.type == "user" ? user.userId : user.userId;

    const { sql, params } = buildUpdateWithWhereSql(
      "coop.application",
      {
        id,
      },
      { data: reqBody.data, status: "P", updatedBy, updatedAt }
    );
    result.push(await (await (await pgConnect.getConnection("master")).query(sql, params)).rows);
    return result;
  }
}
