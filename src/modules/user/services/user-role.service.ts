import { toCamelKeys } from "keys-transform";
import { buildInsertSql, buildUpdateSql } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../db/connection.db";
import { userRoleInput } from "../interfaces/user-role.interface";

@Service()
export class UserRoleServices {
  constructor() {}

  async create(data: userRoleInput, createdBy: string, createdAt: Date) {
    const userId: number = data.userId;
    const userSql = `SELECT doptor_id,office_id FROM users.user WHERE id=$1`;
    const userData = (await (await db.getConnection("slave")).query(userSql, [userId])).rows[0];
    const insertDataObject = {
      ...data,
      doptorId: userData.doptor_id,
      officeId: userData.office_id,
      createdBy,
      createdAt,
    };

    const { sql, params } = buildInsertSql("users.user_role", insertDataObject);
    const result = (await (await db.getConnection("master")).query(sql, params)).rows[0];
    return result ? toCamelKeys(result) : result;
  }

  async get(componentId: number) {
    const query = `SELECT a.*,b.username,b.id as user_id,b.designation_bn,d.role_name
                     FROM users.user_role a
                   INNER JOIN users.user b ON a.user_id=b.id
                   INNER JOIN users.role d ON a.role_id=d.id 
                   where d.component_id = $1
                   ORDER BY id `;
    const data = (await (await db.getConnection("slave")).query(query, [componentId])).rows;

    return data ? toCamelKeys(data) : {};
  }

  async put(id: number, data: object) {
    const { sql, params } = buildUpdateSql("users.user_role", id, data, "id");
    const updateResult = await (await (await db.getConnection("master")).query(sql, params)).rows[0];

    return updateResult ? toCamelKeys(updateResult) : {};
  }
}
