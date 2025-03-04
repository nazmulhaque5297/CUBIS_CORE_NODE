import { toCamelKeys, toSnakeCase } from "keys-transform";
import lo from "lodash";
import { buildGetSql, buildSql } from "rdcd-common";
import Container, { Service } from "typedi";
import db from "../../../db/connection.db";
import { IPaginationResponse } from "../../../types/interfaces/pagination.interface";
import { buildInsertSql, buildUpdateSql, buildUpdateWithWhereSql } from "../../../utils/sql-builder.util";
import { ICreatePersonAttrs, ICreateUserAttrs, IUpdateUserAttrs, IUserAttrs } from "../interfaces/user.interface";
import { CitizenRoleServices } from "./../../coop/citizen/services/citizen-role.service";

@Service()
export default class UserService {
  constructor() {}

  // create new user
  async create(userInfo: ICreateUserAttrs, personInfo: ICreatePersonAttrs): Promise<IUserAttrs> {
    const client = await (await db.getConnection()).connect();
    try {
      await client.query("BEGIN");
      const { sql: personSql, params: personParams } = buildInsertSql("users.person_info", { ...personInfo });
      const personId: number = await (await client.query(personSql, [...personParams])).rows[0].id;

      const { sql: userSql, params: userParams } = buildInsertSql("users.user", { ...userInfo, personId: personId });

      const userRes = await (await client.query(userSql, [...userParams])).rows[0];

      await client.query("COMMIT");

      return toCamelKeys(userRes) as any;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async get(
    isPagination: boolean,
    limit: number,
    offset: number,
    allQuery: object,
    officeId: number
  ): Promise<IPaginationResponse | any> {
    const pool = db.getConnection("slave");
    var queryText: string = "";
    let data = [];
    const sql: string = `SELECT
                          users.user.id, 
                          users.user.name, 
                          users.user.email, 
                          users.user.username, 
                          users.user.mobile, 
                          master.office_info.name_bn office_name_bn, 
                          master.office_designation.name_bn designation_name_bn, 
                          users.role.role_name 
                        FROM 
                          users.user 
                          LEFT JOIN users.user_role ON users.user.id = users.user_role.user_id 
                          LEFT JOIN users.role ON users.user_role.role_id = users.role.id 
                          LEFT JOIN master.office_info ON users.user.office_id = master.office_info.id 
                          LEFT JOIN master.office_designation ON users.user.designation_id = master.office_designation.id`;
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      const createSql = buildSql(sql, allQuery, "AND", this.injectionFilter, "id", limit, offset);
      queryText = isPagination ? createSql[0] : createSql[1];

      data = (await pool.query(queryText, allQueryValues)).rows;
    } else {
      if (isPagination) {
        queryText = `SELECT
                      users.user.id,  
                      users.user.name, 
                      users.user.email, 
                      users.user.username, 
                      users.user.mobile, 
                      master.office_info.name_bn office_name_bn, 
                      master.office_designation.name_bn designation_name_bn, 
                      users.role.role_name 
                    FROM 
                      users.user 
                      LEFT JOIN users.user_role ON users.user.id = users.user_role.user_id 
                      LEFT JOIN users.role ON users.user_role.role_id = users.role.id 
                      LEFT JOIN master.office_info ON users.user.office_id = master.office_info.id 
                      LEFT JOIN master.office_designation ON users.user.designation_id = master.office_designation.id 
                    WHERE 
                      users.user.office_id = $1
                    ORDER BY 
                      users.user.id 
                    LIMIT $2 
                    OFFSET $3`;
      } else {
        queryText = `SELECT 
                      users.user.id, 
                      users.user.name, 
                      users.user.email, 
                      users.user.username, 
                      users.user.mobile, 
                      master.office_info.name_bn office_name_bn, 
                      master.office_designation.name_bn designation_name_bn, 
                      users.role.role_name 
                    FROM 
                      users.user 
                      LEFT JOIN users.user_role ON users.user.id = users.user_role.user_id 
                      LEFT JOIN users.role ON users.user_role.role_id = users.role.id 
                      LEFT JOIN master.office_info ON users.user.office_id = master.office_info.id 
                      LEFT JOIN master.office_designation ON users.user.designation_id = master.office_designation.id 
                    WHERE 
                      users.user.office_id = $1
                    ORDER BY 
                      users.user.id`;
      }

      data = (await pool.query(queryText, isPagination ? [officeId, limit, offset] : [officeId])).rows;
    }

    data = data ? lo.unionBy(data, "id") : data;

    return data[0] ? toCamelKeys(data) : [];
  }

  // ************************ autorization* added by Hasib, Hrithik, Adnan ************************
  async isAuthorized(
    url: string,
    userId: number,
    componentId: number,
    type: string,
    isAuthorizedPerson?: boolean,
    doptorId?: number
  ) {
    const citizenRoleService = Container.get(CitizenRoleServices);

    const pool = db.getConnection();
    let query: string = ``;
    let authorizedRoleFeature = [];
    if (type == "citizen") {
      const role = isAuthorizedPerson
        ? await citizenRoleService.getCitizenRoleByRoleName("AUTHORIZED_PERSON", doptorId)
        : await citizenRoleService.getCitizenRoleByRoleName("ORGANIZER", doptorId);

      query = `SELECT *
      FROM USERS.ROLE_FEATURE A
      INNER JOIN USERS.FEATURE B ON B.ID = A.FEATURE_ID
      WHERE A.ROLE_ID = $1
        AND B.COMPONENT_ID = $2
        AND (B.URL = $3
        OR $3 = ANY(B.SUB_FEATURE_URL :: varchar[]))`;
      authorizedRoleFeature = (await (await pool).query(query, [role?.id, componentId, url])).rows;
    } else if (type == "user") {
      query = `Select 
    b.*, 
    c.* 
  from 
    users.user_role a 
    inner join users.role_feature b on a.role_id = b.role_id 
    inner join users.feature c on c.id = b.feature_id 
  where 
    a.user_id = $1
    and c.component_id = $2
    and (
      c.url = $3 
      OR $3 = ANY(c.sub_feature_url :: varchar[])
    )`;
      authorizedRoleFeature = (await (await pool).query(query, [userId, componentId, url])).rows;
    }

    if (authorizedRoleFeature.length > 0) {
      return true;
    }
    return false;
  }
  async getUserByRole(componentId: number) {
    const query = `SELECT a.* , c.role_id 
                 FROM users.user a
                 LEFT JOIN users.user_role c ON a.id = c.user_id
                 ORDER BY id `;
    const allUser = (await (await db.getConnection("slave")).query(query)).rows;
    const data = [];
    for (const element of allUser) {
      if (element.role_id) {
        const roleNameSql = `SELECT role_name from users.role where id=$1 and component_id = $2`;
        const roleName = (await (await db.getConnection("slave")).query(roleNameSql, [element.role_id, componentId]))
          .rows[0].role_name;
        const newData = { ...element, roleName };
        data.push(newData);
      } else {
        data.push(element);
      }
    }

    return data ? toCamelKeys(data) : {};
  }

  // get user by username and office Id
  async getByUsernameAndOfficeId(username: string, officeId: number): Promise<IUserAttrs | undefined> {
    const pool = await db.getConnection();
    let sql = `SELECT * FROM users.user 
                   WHERE username = $1 AND office_id = $2;`;
    const user = await (await pool.query(sql, [username, officeId])).rows;
    return user.length > 0 ? (toCamelKeys(user[0]) as any) : undefined;
  }

  // get user by username
  async getByEmail(email: string): Promise<IUserAttrs | undefined> {
    const pool = await db.getConnection();
    let sql = `SELECT * FROM users.user WHERE email = $1`;
    const user = await (await pool.query(sql, [email])).rows[0];

    return user ? (toCamelKeys(user) as any) : undefined;
  }

  async getByUsername(username: string): Promise<IUserAttrs | undefined> {
    const pool = await db.getConnection();
    let sql = `SELECT * FROM users.user WHERE username = $1 and type = 'user'`;
    // let sql = `SELECT * FROM users.user WHERE username = $1`;
    const user = await (await pool.query(sql, [username])).rows[0];

    return user ? (toCamelKeys(user) as any) : undefined;
  }

  //get user's doptor config info
  async getDoptorConfigInfo(doptorId: number) {
    const pool = db.getConnection();
    const doptorConfigSql = `SELECT is_project_allow FROM master.doptor_info WHERE id = $1`;
    const doptorConfigInfo = (await pool.query(doptorConfigSql, [doptorId])).rows[0];

    return doptorConfigInfo ? (toCamelKeys(doptorConfigInfo) as any) : undefined;
  }
  // update user
  async update(data: IUpdateUserAttrs): Promise<IUserAttrs> {
    const { sql, params } = buildUpdateSql("users.user", data.id, {
      ...lo.omit(data, ["id"]),
    });
    const pool = await db.getConnection();
    const result = await pool.query(sql, params);
    return toCamelKeys(result.rows[0]) as any;
  }

  // get user by id with personal info
  async getById(id: number, officeId: number): Promise<IUserAttrs | undefined> {
    const pool = await db.getConnection();
    const sql = `SELECT * FROM users.user
                        LEFT JOIN users.person_info
                        ON users.user.person_id = users.person_info.id 
                    WHERE users.user.id = $1 AND users.user.office_id = $2;`;
    const userInfo: any = (await pool.query(sql, [id, officeId])).rows as any;
    return userInfo.length > 0 ? (toCamelKeys(userInfo[0]) as any) : undefined;
  }

  //get features by user id
  async getFeatureByUser(userId: number, componentId: number, doptorId: number): Promise<any> {
    const query = `
      select distinct 
        e.id,
        e.feature_name_ban,
        e.url,
        e.is_root,
        e.type,
        e.position,
        e.icon_id,
        e.parent_id,
        e.serial_no
      from
        users."user" a
      inner join users.user_role b on
        a.id = b.user_id
      inner join users."role" c on
        c.id = b.role_id
      inner join users.role_feature d on
        d.role_id = c.id
      inner join users.feature e on
        e.id = d.feature_id
      where
        a.id = $1 and c.doptor_id = $2 and c.component_id = $3 and e.is_active = true
        order by e.id, e.parent_id, e.serial_no asc`;

    const connection = db.getConnection("slave");

    const { rows: features } = await connection.query(query, [userId, doptorId, componentId]);

    //menu
    var menus: any[] = [];
    var roots: any[] = features.filter((feature) => feature.is_root == true);
    var children: any[] = [];
    var childOfChild: any[] = [];

    for (const [i, v] of roots.entries()) {
      menus.push(v);
      children = features.filter((feature) => feature.parent_id == v.id);
      menus[i].child = children;
      for (const [ci, cv] of menus[i].child.entries()) {
        childOfChild = features.filter((feature) => feature.parent_id == cv.id);
        if (childOfChild.length > 0) menus[i].child[ci].childOfChild = childOfChild;
      }
    }

    return toCamelKeys({
      features,
      menus,
    });
  }

  // update user approval by id
  async updateUserApproval(id: number, data: IUserAttrs): Promise<IUserAttrs | undefined> {
    const { sql, params } = buildUpdateWithWhereSql("users.user", { id }, { ...lo.omit(data, ["officeId"]) });
    const pool = await db.getConnection();
    const result = await pool.query(sql, params);

    return result.rows.length > 0 ? (toCamelKeys(result.rows[0]) as any) : undefined;
  }

  async count(allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM users.user";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = await buildSql(sql, allQuery, "AND", this.injectionFilter, "id")[1];
      var result = await (await db.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM users.user";
      result = await (await db.getConnection("slave")).query(queryText);
    }
    return result.rows[0].count;
  }

  async isUserRoleActive(userId: number, doptorId: number) {
    const { values, queryText } = buildGetSql(["id"], "users.user_role", {
      userId,
      doptorId,
      status: "A",
    });
    const { rows: data } = await (await db.getConnection("slave")).query(queryText, values);

    return data.length != 0;
  }

  //get feature list for role assign
  async getAllFeaturesForAssign() {
    const query = `SELECT
                    id,
                    feature_name_ban,
                    ORDER BY id, parent_id, serial_no ASC`;

    const connection = await db.getConnection("slave");

    const { rows: features } = await connection.query(query);
    //menu
    var menus: any[] = [];
    var roots: any[] = features.filter((feature) => feature.is_root == true);
    var children: any[] = [];
    var childOfChild: any[] = [];

    for (const [i, v] of roots.entries()) {
      menus.push(v);
      children = features.filter((feature) => feature.parent_id == v.id);
      menus[i].child = children;
      for (const [ci, cv] of menus[i].child.entries()) {
        childOfChild = features.filter((feature) => feature.parent_id == cv.id);
        if (childOfChild.length > 0) menus[i].child[ci].children = childOfChild;
      }
    }
    return menus.length > 0 ? toCamelKeys(menus) : [];
  }

  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }
}
