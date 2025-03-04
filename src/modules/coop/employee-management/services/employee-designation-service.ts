import { toCamelKeys } from "keys-transform";
import { buildInsertSql, buildUpdateSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";

@Service()
export class EmployeeDesignationService {
  constructor() {}
  async create(data: any) {
    const insertDataObject = {
      ...data,
    };
    const { sql, params } = buildInsertSql("coop.employee_designation", insertDataObject);
    const result = (await (await pgConnect.getConnection("master")).query(sql, params)).rows[0];
    return result ? toCamelKeys(result) : result;
  }

  async update(data: any, id: number) {
    const { sql, params } = buildUpdateSql("coop.employee_designation", id, data, "id");
    const result = (await (await pgConnect.getConnection("master")).query(sql, params)).rows[0];
    return result ? toCamelKeys(result) : result;
  }

  async get() {
    const sql = ` select id,designation_name,status,rank from coop.employee_designation `;
    const result = (await (await pgConnect.getConnection("slave")).query(sql, [])).rows;
    return result ? toCamelKeys(result) : result;
  }
}

// @Service()
// export class UserRoleServices {
//   constructor() {}

//   async create(data: userRoleInput, createdBy: string, createdAt: Date) {
//     const userId: number = data.
//     const userSql = `SELECT doptor_id,office_id FROM users.user WHERE id=$1`;
//     const userData = (
//       await (await pgConnect.getConnection("slave")).query(userSql, [userId])
//     ).rows[0];
//     const insertDataObject = {
//       ...data,
//       doptorId: userData.doptor_id,
//       officeId: userData.office_id,
//       createdBy,
//       createdAt,
//     };

//     const { sql, params } = buildInsertSql("users.user_role", insertDataObject);
//     const result = (
//       await (await pgConnect.getConnection("master")).query(sql, params)
//     ).rows[0];
//     return result ? toCamelKeys(result) : result;
//   }

//   async get() {
//     const query = `SELECT a.*,b.username,b.id as user_id,b.designation_bn,d.role_name
//                      FROM users.user_role a
//                    INNER JOIN users.user b ON a.user_id=b.id
//                    INNER JOIN users.role d ON a.role_id=d.id ORDER BY id `;
//     const data = (await (await pgConnect.getConnection("slave")).query(query))
//       .rows;

//     return data ? toCamelKeys(data) : {};
//   }

//   async put(id: number, data: object) {
//     const { sql, params } = buildUpdateSql("users.user_role", id, data, "id");
//     const updateResult = await (
//       await (await pgConnect.getConnection("master")).query(sql, params)
//     ).rows[0];

//     return updateResult ? toCamelKeys(updateResult) : {};
//   }
// }
