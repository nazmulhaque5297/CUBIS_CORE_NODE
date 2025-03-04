import { toCamelKeys, toSnakeCase } from "keys-transform";
import lo from "lodash";
import { buildGetSql } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../db/connection.db";
import { IPaginationResponse } from "../../../types/interfaces/pagination.interface";
import { buildInsertSql, buildUpdateWithWhereSql, buildWhereAggrSql } from "../../../utils/sql-builder.util";
import { IRoleAttrs } from "../interfaces/role.interface";

@Service()
export default class RoleService {
  constructor() {}

  // create role with relations
  async create(data: IRoleAttrs, componentId: number): Promise<IRoleAttrs> {
    const client = await db.getConnection().connect();
    try {
      await client.query("BEGIN");
      const rolePayload: IRoleAttrs = lo.omit(data, ["features"]);
      const { sql: roleSql, params: roleParams } = buildInsertSql("users.role", {
        ...rolePayload,
        componentId: componentId,
      });
      const roleRes = await client.query(roleSql, roleParams);
      if (data.features) {
        const parentIdSql = `SELECT parent_id FROM users.feature WHERE id = $1`;
        for (let featureId of data.features) {
          let parentId = (await client.query(parentIdSql, [featureId])).rows[0].parent_id;

          if (parentId) {
            data.features.push(parentId);
          }
        }
        const finalFeatures = data.features.filter((v, i, a) => a.indexOf(v) === i);
        for (let fId of finalFeatures) {
          const { sql: roleFeatureSql, params: roleFeatureParams } = buildInsertSql("users.role_feature", {
            roleId: roleRes.rows[0].id,
            featureId: fId,
          });
          await client.query(roleFeatureSql, roleFeatureParams);
        }
      }
      await client.query("COMMIT");
      return toCamelKeys(roleRes.rows[0]);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  // get role with pagination and filter
  async get(
    page: number,
    limit: number,
    filter: IRoleAttrs,
    doptorId: number,
    username: string,
    user: number,
    componentId: number
  ): Promise<IPaginationResponse> {
    const pool = db.getConnection("slave");
    const filterKeys = Object.keys(filter);
    let result: object[] = [];
    if (filterKeys.length > 0) {
      if (user == 1) {
        const { sql, params } = buildWhereAggrSql(
          `SELECT 
            a.id, 
            a.role_name, 
            a.description, 
            a.approve_status, 
            c.id as user_id, 
            c.username, 
            d.name_bn designation_bn 
          FROM 
            users.role a 
            INNER JOIN users.user_role b ON b.role_id = a.id 
            INNER JOIN users.user c ON c.id = b.user_id 
            INNER JOIN master.office_designation d ON d.id = c.designation_id`,
          { ...filter, doptorId, componentId },
          this.injectionFilter
        );
        result = (await pool.query(sql, params)).rows;
      } else if (user == 0) {
        const { sql, params } = buildWhereAggrSql(
          "SELECT * FROM users.role",
          { ...filter, doptorId, componentId },
          this.injectionFilter
        );
        result = lo.uniqBy((await pool.query(sql, params)).rows, "id");
      }

      return result[0] ? (toCamelKeys(result) as any) : [];
    } else {
      if (user == 1) {
        const sql = `SELECT 
                      a.id, 
                      a.role_name, 
                      a.description, 
                      a.approve_status, 
                      c.id as user_id, 
                      c.username, 
                      d.name_bn designation_bn 
                    FROM 
                      users.role a 
                      INNER JOIN users.user_role b ON b.role_id = a.id 
                      INNER JOIN users.user c ON c.id = b.user_id 
                      INNER JOIN master.office_designation d ON d.id = c.designation_id 
                    WHERE 
                      a.doptor_id = $1 
                      and a.component_id = $2 
                    ORDER BY 
                      a.id ASC`;
        result = (await pool.query(sql, [doptorId, componentId])).rows;
      } else if (user == 0) {
        const sql = `SELECT * FROM users.role WHERE doptor_id = $1 AND component_id = $2 ORDER BY id ASC`;
        result = lo.uniqBy((await pool.query(sql, [doptorId, componentId])).rows, "id");
      }

      return result[0] ? (toCamelKeys(result) as any) : [];
    }
  }

  //get all
  async getAll(componentId: number, doptorId?: number) {
    const connection = db.getConnection("slave");
    const { queryText, values } = buildGetSql(["id", "role_name", "doptor_id", "component_id"], "users.role", {
      is_active: true,
      componentId,
      ...(doptorId && { doptorId: doptorId }),
    });

    const { rows: roles } = await connection.query(queryText, values);

    //accounts roles to be synced from loan module.
    //accounts module id = 7
    // const accountsRoleQuery = buildGetSql(["id", "role_name", "doptor_id", "component_id"], "users.role", {
    //   is_active: true,
    //   componentId: 7,
    // });

    // const { rows: accountsRole } = await connection.query(accountsRoleQuery.queryText, accountsRoleQuery.values);
    //end - accounts role

    return toCamelKeys([...roles]) as IRoleAttrs[];
  }

  // get role with relation by id
  async getById(id: number, doptorId: number, componentId: number): Promise<IRoleAttrs | null> {
    const pool = db.getConnection("slave");
    let sql = `SELECT * FROM users.role WHERE id = $1 AND doptor_id = $2 and component_id = $3`;
    let role: IRoleAttrs = (await (await pool.query(sql, [id, doptorId, componentId])).rows[0]) as any;
    if (!role) return null;
    sql = `SELECT 
            f.id value, 
            f.feature_name_ban label, 
            f.is_root, 
            f.parent_id 
          FROM 
            users.role AS r 
            INNER JOIN users.role_feature AS rf ON r.id = rf.role_id 
            INNER JOIN users.feature AS f ON rf.feature_id = f.id 
          WHERE 
            r.id = $1 
            AND r.doptor_id = $2 
            AND r.component_id = $3 
          ORDER BY 
            f.id, 
            f.parent_id, 
            f.serial_no ASC`;
    const features = (await pool.query(sql, [id, doptorId, componentId])).rows as any;
    const assignedFeaturesIds = features.map((value: any) => value.value);
    var assignedFeatures: any[] = [];
    var roots: any[] = features.filter((feature: any) => feature.is_root == true);
    var children: any[] = [];
    var childOfChild: any[] = [];

    for (const [i, v] of roots.entries()) {
      assignedFeatures.push(v);
      children = features.filter((feature: any) => feature.parent_id == v.value);
      assignedFeatures[i].children = children;
      for (const [ci, cv] of assignedFeatures[i].children.entries()) {
        childOfChild = features.filter((feature: any) => feature.parent_id == cv.value);
        if (childOfChild.length > 0) assignedFeatures[i].children[ci].children = childOfChild;
      }
    }
    role = { ...role, featureList: assignedFeatures, assignedFeaturesIds };

    return role ? toCamelKeys(role) : {};
  }

  // update role by id
  async update(
    conditions: IRoleAttrs,
    updates: IRoleAttrs
    // roleId: number
  ): Promise<IRoleAttrs> {
    const client = await db.getConnection().connect();
    try {
      // if (updates.approveStatus === "R" && conditions.id == roleId)
      //   throw new BadRequestError(`নিজের রোল বাতিল করা যাবে না`);
      await client.query("BEGIN");
      const { sql, params } = buildUpdateWithWhereSql("users.role", conditions, lo.omit(updates, ["features"]));
      const result = await client.query(sql, params);
      if (updates.features) {
        const deleteSql = `DELETE FROM users.role_feature 
                                   WHERE role_id = $1`;
        await client.query(deleteSql, [result.rows[0].id]);
        const parentIdSql = `SELECT parent_id FROM users.feature WHERE id = $1`;
        for (let featureId of updates.features) {
          let parentId = (await client.query(parentIdSql, [featureId])).rows[0].parent_id;

          if (parentId) {
            updates.features.push(parentId);
          }
        }
        const finalFeatures = updates.features.filter((v, i, a) => a.indexOf(v) === i);
        for (let fId of finalFeatures) {
          const { sql: roleFeatureSql, params: roleFeatureParams } = buildInsertSql("users.role_feature", {
            roleId: result.rows[0].id,
            featureId: fId,
          });
          await client.query(roleFeatureSql, roleFeatureParams);
        }
      }
      await client.query("COMMIT");
      return toCamelKeys(result.rows[0]);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  //get feature list for role assign
  async getAllFeaturesForAssign(componentId: number) {
    const query = `SELECT
                    id value,
                    feature_name_ban label,
                    is_root,
                    parent_id
                    FROM users.feature
                    WHERE component_id = $1
                    ORDER BY id, parent_id, serial_no ASC`;

    const connection = await db.getConnection("slave");

    const { rows: features } = await connection.query(query, [componentId]);
    //menu
    var menus: any[] = [];
    var roots: any[] = features.filter((feature) => feature.is_root == true);
    var children: any[] = [];
    var childOfChild: any[] = [];

    for (const [i, v] of roots.entries()) {
      menus.push(v);
      children = features.filter((feature) => feature.parent_id == v.value);
      menus[i].children = children;
      for (const [ci, cv] of menus[i].children.entries()) {
        childOfChild = features.filter((feature) => feature.parent_id == cv.value);
        if (childOfChild.length > 0) menus[i].children[ci].children = childOfChild;
      }
    }
    return menus.length > 0 ? toCamelKeys(menus) : [];
  }

  // keys injection filter
  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }
}
