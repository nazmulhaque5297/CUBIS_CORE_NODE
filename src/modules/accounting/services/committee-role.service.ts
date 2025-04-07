import { toSnakeCase } from "keys-transform";
import { buildSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { isExistsByColumn } from "../../../../utils/service.utils";
import { buildInsertSql, buildUpdateSql } from "../../../../utils/sql-builder.util";
import { CommitteeRoleAttrs } from "../interfaces/committee-role.interface";

@Service()
export class CommitteeRoleServices {
  constructor() {}

  async get(user: any, isPagination: boolean, limit: number, offset: number, allQuery: object) {
    const componentId = user.componentId;
    const doptorId = user.doptorId;
    var queryText: string = "";
    const sql: string = "SELECT * FROM master.committee_role";
    allQuery = { ...allQuery, componentId, doptorId };
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      const createSql = buildSql(sql, allQuery, "AND", this.filter, "id", limit, offset);
      queryText = isPagination ? createSql[0] : createSql[1];

      var role = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = isPagination
        ? "SELECT * FROM master.committee_role ORDER BY id LIMIT $1 OFFSET $2"
        : "SELECT * FROM master.committee_role ORDER BY id ";
      role = await (await pgConnect.getConnection("slave")).query(queryText, isPagination ? [limit, offset] : []);
    }

    return role.rows;
  }

  /**
   * @param  {CommitteeRoleAttrs} c
   */
  async create(c: CommitteeRoleAttrs) {
    const createdAt = new Date();
    const { sql, params } = buildInsertSql("master.committee_role", {
      ...c,
      createdAt,
    });

    const {
      rows: [role],
    } = await (await pgConnect.getConnection("master")).query(sql, params);

    return role;
  }

  /**
   * @param  {CommitteeRoleAttrs} d
   * @param  {number} id
   */
  async update(d: CommitteeRoleAttrs, id: number) {
    var updatedAt = new Date();

    const { sql, params } = buildUpdateSql("master.committee_role", id, { ...d, updatedAt });

    const {
      rows: [updatedRole],
    } = await (await pgConnect.getConnection("master")).query(sql, params);
    return updatedRole;
  }

  /**
   * @param  {number} id
   */
  async delete(id: number) {
    const query = `
      Delete FROM master.committee_role 
      WHERE 
        id= $1 
      RETURNING 
        id;
    `;
    const {
      rows: [{ committee_role_id: roleId }],
    } = await (await pgConnect.getConnection("master")).query(query, [id]);

    return roleId;
  }

  /**
   * @param  {object} allQuery
   */
  async count(allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(committee_role_id) FROM master.committee_role";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = buildSql(sql, allQuery, "AND", this.filter, "id")[1];
      var result = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM master.committee_role";
      result = await (await pgConnect.getConnection("slave")).query(queryText);
    }
    return result.rows[0].count;
  }

  /**
   * @param  {string} name
   * @returns {boolean}
   */
  async uniqueCheck(name: string): Promise<boolean> {
    const {
      rows: [role],
    } = await (
      await pgConnect.getConnection("slave")
    ).query(
      `
        SELECT COUNT(id) 
        FROM master.committee_role
        WHERE role_name=$1;
      `,
      [name]
    );

    return parseInt(role.count) >= 1 ? true : false;
  }

  /**
   * @param  {string} name
   * @param  {number} id
   * @returns {boolean}
   */
  async uniqueCheckUpdate(name: string, id: number): Promise<boolean> {
    const {
      rows: [role],
    } = await (
      await pgConnect.getConnection("slave")
    ).query(
      `
        SELECT COUNT(id) 
        FROM 
          master.committee_role
        WHERE 
          role_name = $1
        AND
          id !=$2;
      `,
      [name, id]
    );

    return parseInt(role.count) >= 1 ? true : false;
  }

  async checkByUniqueRoleRank(id: Array<number>, roleRank: number) {
    const sql = `select count(id) from master.committee_role where role_rank = $1 and id = any ($2);`;
    const params = [roleRank, id];
    const connection = await pgConnect.getConnection("slave");
    const {
      rows: [{ count }],
    } = await connection.query(sql, params);

    return parseInt(count) > 1;
  }

  /**
   * @param  {number} id
   * @returns {Boolean}
   */
  async idCheck(id: number): Promise<Boolean> {
    // const pool = await (await pgConnect.getConnection("master")).connect();
    return await isExistsByColumn("id", "master.committee_role", await pgConnect.getConnection("slave"), { id });
  }

  /**
   * @param  {string} key
   */
  filter(key: string) {
    return toSnakeCase(key);
  }
}
