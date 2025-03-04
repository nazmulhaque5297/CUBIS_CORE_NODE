/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-03-31 18:14:51
 * @modify date 2022-03-31 18:14:51
 * @desc [description]
 */

import axios from "axios";
import { toCamelKeys } from "keys-transform";
import { isArray } from "lodash";
import { PoolClient } from "pg";
import { buildInsertSql, buildUpdateSql, isExistsByColumn } from "rdcd-common";
import { Service } from "typedi";
import { dashboardUrl } from "../../../configs/app.config";
import db from "../../../db/connection.db";

@Service()
export class UserSSOServices {
  constructor() {}

  async getUser(token: string) {
    const res = await axios.get(`${dashboardUrl}/api/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return res.data;
  }

  async insertUser(data: any, componentId: number) {
    const connection = await (await db.getConnection("master")).connect();
    try {
      await connection.query("BEGIN");

      const { sql, params } = buildInsertSql("users.user", {
        id: data.id,
        name: data.name || null,
        email: data.email || null,
        mobile: data.mobile || null,
        username: data.username || null,
        doptorId: data.office?.doptor_id || null,
        officeId: data.office?.id || null,
        layerId: data.office?.layer?.id || null,
        originId: data.office?.origin?.id || null,
        employeeId: data.employee?.id || null,
        designationId: data.employee?.designation?.id || null,
        isActive: true,
        createdBy: "SSO",
        createdAt: new Date(),
        type: data.is_beneficiary ? "citizen" : "user",
        ...(data.is_beneficiary && {
          memberId: data.beneficiary.local_id || null,
          myGovId: data.cdap_id || null,
        }),
      });

      const {
        rows: [user],
      } = await connection.query(sql, params);

      //insert roles associated with the user
      const userRoles = await this.insertUserRole(data, componentId, connection);

      await connection.query("COMMIT");

      return toCamelKeys({ ...user, roles: userRoles });
    } catch (e) {
      await connection.query("ROLLBACK");
      throw e;
    } finally {
      connection.release();
    }
  }

  async updateUser(data: any, componentId: number) {
    const connection = await (await db.getConnection("master")).connect();

    try {
      await connection.query("BEGIN");

      const { sql, params } = buildUpdateSql(
        "users.user",
        data.username,
        {
          id: data.id,
          name: data.name || null,
          email: data.email || null,
          mobile: data.mobile || null,
          username: data.username || null,
          doptorId: data.office?.doptor_id || null,
          officeId: data.office?.id || null,
          layerId: data.office?.layer?.id || null,
          originId: data.office?.origin?.id || null,
          employeeId: data.employee?.id || null,
          designationId: data.employee?.designation?.id || null,
          isActive: true,
          updatedBy: "SSO",
          updatedAt: new Date(),
          type: data.is_beneficiary ? "citizen" : "user",
          ...(data.is_beneficiary && {
            memberId: data.beneficiary.local_id || null,
            myGovId: data.cdap_id || null,
          }),
        },
        "username"
      );

      const {
        rows: [updatedUser],
      } = await connection.query(sql, params);

      //insert roles associated with the user
      const userRoles = await this.insertUserRole(data, componentId, connection);

      await connection.query("COMMIT");

      return toCamelKeys({ ...updatedUser, roles: userRoles });
    } catch (e) {
      await connection.query("ROLLBACK");
      throw e;
    } finally {
      connection.release();
    }
  }

  async checkUserExistsById(username: string) {
    const connection = await db.getConnection("slave");

    return await isExistsByColumn("username", "users.user", connection, {
      username,
    });
  }

  async checkRoleExists(roles: any[], componentId: number) {
    if (!roles.length || !isArray(roles)) return [];

    const connection = await db.getConnection("slave");

    let filteredRoles: any[] = [];

    for await (const role of roles) {
      const existingRole = await isExistsByColumn("id", "users.role", connection, {
        id: role.component_role_id,
        component_id: componentId,
      });

      existingRole ? filteredRoles.push(role) : [];
    }

    return filteredRoles;
  }

  async insertUserRole(data: any, componentId: number, connection: PoolClient) {
    if (!data.roles.length || !isArray(data.roles)) return;

    const userRoles = [];
    try {
      const deleteUserRoleQuery = `DELETE FROM users.user_role a
                                  WHERE  role_id IN (SELECT id
                                                    FROM   users.role b
                                                    WHERE  b.id = a.role_id
                                                            AND b.component_id = $1)
                                        AND a.user_id = $2 `;

      await connection.query(deleteUserRoleQuery, [componentId, data.id]);

      for await (const role of data.roles) {
        const { sql, params } = buildInsertSql("users.user_role", {
          userId: data.id,
          roleId: role.component_role_id,
        });

        const {
          rows: [userRole],
        } = await connection.query(sql, params);

        userRoles.push(userRole);
      }

      return userRoles;
    } catch (error) {
      throw error;
    }
  }
}
