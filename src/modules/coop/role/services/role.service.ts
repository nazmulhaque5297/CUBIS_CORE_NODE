import { toCamelKeys, toSnakeCase } from "keys-transform";
import lo from "lodash";
import { buildGetSql, buildSql } from "rdcd-common";
// import { ComponentId } from "../../../../configs/app.config";
import { Service } from "typedi";
import db from "../../../../db/connection.db";
import { IPaginationResponse } from "../../../../types/interfaces/pagination.interface";
import {
  emptyPaginationResponse,
  getPaginationDetails,
} from "../../../../utils/pagination-loan.utils";
import {
  buildInsertSql,
  buildUpdateWithWhereSql,
  buildWhereAggrSql,
  buildWhereSql,
} from "../../../../utils/sql-builder-loan.utils";
import { IFeatureAttrs } from "../interfaces/feature.interface";
import { IRoleAttrs } from "../interfaces/role.interface";

@Service()
export default class RoleService {
  constructor() {}

  // create role with relations
  async create(data: IRoleAttrs, componentId: number): Promise<IRoleAttrs> {
    const client = await (await db.getConnection()).connect();
    try {
      await client.query("BEGIN");
      const rolePayload: IRoleAttrs = lo.omit(data, ["features"]);
      const { sql: roleSql, params: roleParams } = buildInsertSql(
        "users.role",
        {
          ...rolePayload,
          componentId: componentId,
        }
      );
      const roleRes = await client.query(roleSql, roleParams);
      if (data.features) {
        const parentIdSql = `SELECT parent_id FROM users.feature WHERE id = $1`;
        for (let featureId of data.features) {
          let parentId = (await client.query(parentIdSql, [featureId])).rows[0]
            .parent_id;

          if (parentId) {
            data.features.push(parentId);
          }
        }
        const finalFeatures = data.features.filter(
          (v, i, a) => a.indexOf(v) === i
        );
        for (let fId of finalFeatures) {
          const { sql: roleFeatureSql, params: roleFeatureParams } =
            buildInsertSql("users.role_feature", {
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
    filter: IRoleAttrs
  ): Promise<IPaginationResponse> {
    const pool = await db.getConnection();
    const filterKeys = Object.keys(filter);
    if (filterKeys.length > 0) {
      //build where condition dynamically to get updated count value after filtering
      const { sql: countSql, params: countParams } = buildWhereAggrSql(
        "SELECT COUNT(*) AS total FROM users.role",
        filter,
        this.injectionFilter
      );

      const totalCount = await (
        await pool.query(countSql, countParams)
      ).rows[0].total;
      const pagination = getPaginationDetails(page, totalCount, limit);
      if (pagination === undefined) return emptyPaginationResponse(page, limit);

      //build where condition dynamically to get data after filtering
      const { sql, params } = buildWhereSql(
        "SELECT * FROM users.role",
        filter,
        pagination.skip,
        pagination.limit,
        this.injectionFilter
      );
      const result = await pool.query(sql, params);
      return {
        limit: limit,
        currentPage: page,
        totalPages: pagination.total ?? 0,
        count: totalCount,
        data: toCamelKeys(result.rows) as any,
      };
    } else {
      const countRes = await pool.query(
        "SELECT COUNT(*) AS total FROM users.role"
      );
      const totalCount: number = countRes.rows[0].total;
      const pagination = getPaginationDetails(page, totalCount, limit);

      if (pagination === undefined) return emptyPaginationResponse(page, limit);
      const sql = `
                SELECT * FROM users.role 
                LIMIT $1 
                OFFSET $2
            `;
      const result = await pool.query(sql, [pagination.limit, pagination.skip]);
      return {
        limit: limit,
        currentPage: page,
        totalPages: pagination.total ?? 0,
        count: totalCount,
        data: toCamelKeys(result.rows) as any,
      };
    }
  }

  async getAll(
    isPagination: boolean,
    limit: number,
    offset: number,
    allQuery: object,
    componentId:number,
    doptorId:number
  ): Promise<IPaginationResponse | any> {
    const connection = db.getConnection("slave");
    const { queryText, values } = buildGetSql(["*"], "users.role", {
      is_active: true,
      componentId,
      doptorId
    });

    const { rows: roles } = await connection.query(queryText, values);


    return toCamelKeys([...roles]) as IRoleAttrs[];
  }
  // get role with relation by id
  async getById(id: number, doptorId: number, componentId:number): Promise<any | null> {
    
    const pool = db.getConnection("slave");
    const userRolesql = `SELECT * FROM users.role WHERE id = $1 AND doptor_id = $2 and component_id = $3`;
    let role: IRoleAttrs = (
      await (await pool).query(userRolesql, [id, doptorId, componentId])
    ).rows[0];
    if (!role) return null;
    const featureSql = `SELECT 
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
    const features = (
      await (await pool).query(featureSql, [id, doptorId, componentId])
    ).rows;
    const assignedFeaturesIds = features.map((value: any) => value.value);
    var assignedFeatures: any[] = [];
    var roots: any[] = features.filter(
      (feature: any) => feature.is_root == true
    );
    var children: any[] = [];
    var childOfChild: any[] = [];

    for (const [i, v] of roots.entries()) {
      assignedFeatures.push(v);
      children = features.filter(
        (feature: any) => feature.parent_id == v.value
      );
      assignedFeatures[i].children = children;
      for (const [ci, cv] of assignedFeatures[i].children.entries()) {
        childOfChild = features.filter(
          (feature: any) => feature.parent_id == cv.value
        );
        if (childOfChild.length > 0)
          assignedFeatures[i].children[ci].children = childOfChild;
      }
    }
    role = { ...role, featureList: assignedFeatures, assignedFeaturesIds };

    return role ? toCamelKeys(role) : {};
  }

  // update role by id
  async update(
    conditions: IRoleAttrs,
    updates: IRoleAttrs
  ): Promise<IRoleAttrs> {
    const client = await (await db.getConnection()).connect();
    try {
      // if (updates.approveStatus === "R" && conditions.id == roleId)
      //   throw new BadRequestError(`নিজের রোল বাতিল করা যাবে না`);
      await client.query("BEGIN");
      const { sql, params } = buildUpdateWithWhereSql(
        "users.role",
        conditions,
        lo.omit(updates, ["features"])
      );
      const result = await client.query(sql, params);
      if (updates.features) {
        const deleteSql = `DELETE FROM users.role_feature 
                                   WHERE role_id = $1`;
        await client.query(deleteSql, [result.rows[0].id]);
        const parentIdSql = `SELECT parent_id FROM users.feature WHERE id = $1`;
        for (let featureId of updates.features) {
          let parentId = (await client.query(parentIdSql, [featureId])).rows[0]
            .parent_id;

          if (parentId) {
            updates.features.push(parentId);
          }
        }
        const finalFeatures = updates.features.filter(
          (v, i, a) => a.indexOf(v) === i
        );
        for (let fId of finalFeatures) {
          const { sql: roleFeatureSql, params: roleFeatureParams } =
            buildInsertSql("users.role_feature", {
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

  //get all
  async getAllRoles(doptorId?: number) {
    const connection = db.getConnection("slave");
    const { queryText, values } = buildGetSql(
      ["id", "role_name", "doptor_id"],
      "users.role",
      {
        is_active: true,
      }
    );

    const { rows: roles } = await (await connection).query(queryText, values);

    return toCamelKeys(roles) as IRoleAttrs[];
  }

  async getUsersByRoleId(id: number) {
    const connection = await db.getConnection("slave");

    const query = `select b.*
    from users.role a, users.user b
    where a.id = b.role_id and a.id = $1`;
    const params = [id];

    const { rows: data } = await connection.query(query, params);

    return data ? toCamelKeys(data) : data;
  }

  async count(allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM users.role";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = await buildSql(
        sql,
        allQuery,
        "AND",
        this.injectionFilter,
        "id"
      )[1];
      var result = await (
        await db.getConnection("slave")
      ).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM users.role";
      result = await (await db.getConnection("slave")).query(queryText);
    }
    return result.rows[0].count;
  }

  //get feature list for role assign
  async getAllFeaturesForAssign(componentId:number) {
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
        childOfChild = features.filter(
          (feature) => feature.parent_id == cv.value
        );
        if (childOfChild.length > 0)
          menus[i].children[ci].children = childOfChild;
      }
    }
    return menus.length > 0 ? toCamelKeys(menus) : [];
  }

  // keys injection filter
  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }
}
