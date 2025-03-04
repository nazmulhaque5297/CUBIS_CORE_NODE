/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-24 17:13:23
 * @modify date 2021-11-24 17:13:23
 * @desc [description]
 */

import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { CitizenAttrs, CitizenUpdateAttrs } from "../interfaces/citizen.interface";

import { toCamelKeys, toSnakeCase } from "keys-transform";
import {
  buildInsertSql,
  buildUpdateSql,
  buildWhereAggrSql,
  buildWhereSql,
  emptyPaginationResponse,
  getPaginationDetails,
} from "rdcd-common";
import { getSSOCreatedBy } from "../../../../configs/app.config";

@Service()
export default class CitizenServices {
  constructor() {}

  async get(page: number, limit: number, filter: CitizenAttrs) {
    const filterKeys = Object.keys(filter);

    if (filterKeys.length > 0) {
      const { sql, params } = buildWhereAggrSql(
        "SELECT COUNT(*) AS total FROM users.user",
        filter,
        this.injectionFilter
      );

      const {
        rows: [total],
      } = await (await pgConnect.getConnection("slave")).query(sql, params);

      const pagination = getPaginationDetails(page, total, limit);

      if (pagination === undefined) return emptyPaginationResponse(page, limit);

      const { sql: citizenSql, params: citizenParams } = buildWhereSql(
        "SELECT * FROM users.user",
        filter,
        pagination.skip,
        pagination.limit,
        this.injectionFilter
      );

      const { rows: citizens } = await (await pgConnect.getConnection("slave")).query(citizenSql, citizenParams);
      return {
        limit,
        currentPage: page,
        totalPages: pagination.total ?? 0,
        count: total,
        data: toCamelKeys(citizens),
      };
    } else {
      const countQuery = `
        SELECT COUNT(*) AS total FROM users.user
        `;
      const {
        rows: [total],
      } = await (await pgConnect.getConnection("slave")).query(countQuery);

      const pagination = getPaginationDetails(page, total, limit);
      if (pagination === undefined) return emptyPaginationResponse(page, limit);

      const citizenQuery = `
        SELECT * FROM users.user
        LIMIT $1
        OFFSET $2
        `;
      const { rows: citizens } = await (
        await pgConnect.getConnection("slave")
      ).query(citizenQuery, [pagination.limit, pagination.skip]);

      return {
        limit,
        currentPage: page,
        totalPages: pagination.total ?? 0,
        count: total,
        data: toCamelKeys(citizens),
      };
    }
  }

  async getDoptor() {
    const doptorQuery = `SELECT id, name_bn FROM master.doptor_info`;
    const result = (await (await pgConnect.getConnection("slave")).query(doptorQuery)).rows;
    return toCamelKeys(result);
  }

  async getById(id: number): Promise<CitizenAttrs | undefined> {
    const citizenQuery = `
      SELECT * FROM users.user
      WHERE id = $1
      `;
    const {
      rows: [citizen],
    } = await (await pgConnect.getConnection("slave")).query(citizenQuery, [id]);
    return citizen ? (toCamelKeys(citizen) as CitizenAttrs) : undefined;
  }

  async getByEmail(email: string) {
    const citizenQuery = `
      SELECT * FROM users.user
      WHERE email = $1
      `;
    const {
      rows: [citizen],
    } = await (await pgConnect.getConnection("slave")).query(citizenQuery, [email]);
    return citizen ? (toCamelKeys(citizen) as CitizenAttrs) : undefined;
  }

  async getByUserName(username: string) {
    const citizenQuery = `
      SELECT * FROM users.user
      WHERE username = $1
      `;
    const {
      rows: [citizen],
    } = await (await pgConnect.getConnection("slave")).query(citizenQuery, [username]);
    return citizen ? (toCamelKeys(citizen) as CitizenAttrs) : undefined;
  }

  async getByMobileNumber(mobileNumber: string) {
    const citizenQuery = `
      SELECT * FROM users.user
      WHERE mobile = $1
      `;
    const {
      rows: [citizen],
    } = await (await pgConnect.getConnection("slave")).query(citizenQuery, [mobileNumber]);
    return citizen ? (toCamelKeys(citizen) as CitizenAttrs) : undefined;
  }

  async userIdExists(id: number): Promise<boolean> {
    const citizenQuery = `
      SELECT COUNT(*) AS total FROM users.user
      WHERE id = $1
      `;
    const {
      rows: [{ total }],
    } = await (await pgConnect.getConnection("slave")).query(citizenQuery, [id]);
    return total > 0;
  }

  async create(citizenInfo: any) {
    const createdAt = new Date();
    const createdBy = getSSOCreatedBy();

    const prepareCitizenInfo = {
      name: citizenInfo.nameBangla || null,
      email: citizenInfo.emailId || null,
      mobile: "0" + citizenInfo.mobileNo.toString() || null,
      username: "0" + citizenInfo.mobileNo.toString() || null,
      doptorId: null,
      officeId: null,
      layerId: null,
      originId: null,
      employeeId: null,
      designationId: null,
      isActive: true,
      createdBy: "SSO",
      createdAt: new Date(),
      type: "citizen",
      nid: citizenInfo.nid,
      brn: citizenInfo.brn,
      memberId: null,
      myGovId: citizenInfo.myGovId || null,
      userData: citizenInfo,
    };
    const { sql, params } = buildInsertSql("users.user", {
      ...prepareCitizenInfo,
      createdAt,
      createdBy,
    });
    const {
      rows: [citizen],
    } = await (await pgConnect.getConnection()).query(sql, params);
    return citizen;
  }

  async getCitizenByMyGovId(myGovId: string): Promise<CitizenAttrs | undefined> {
    const citizenQuery = `
      SELECT * 
      FROM users.user
      WHERE my_gov_id=$1
      `;

    const {
      rows: [citizen],
    } = await (await pgConnect.getConnection("slave")).query(citizenQuery, [myGovId]);

    return citizen && (toCamelKeys(citizen) as CitizenAttrs);
  }

  async update(data: CitizenUpdateAttrs): Promise<CitizenAttrs> {
    const { sql, params } = buildUpdateSql(
      "users.user",
      data.id,
      {
        userData: data,
      },
      "id"
    );
    const {
      rows: [citizen],
    } = await (await pgConnect.getConnection()).query(sql, params);
    return toCamelKeys(citizen) as CitizenAttrs;
  }

  async isAuthorizedPerson(id: number, nid: any, brn: any, memberId: any) {
    const citizenQuery = `SELECT 
                           id,user_id 
                         FROM coop.samity_authorized_person
                         WHERE 
                          user_id = $1 or nid= $2 or brn= $3 or member_id= $4`;
    let result: any = await (
      await (await pgConnect.getConnection("slave")).query(citizenQuery, [id, nid, brn, memberId])
    ).rows;
    result = result ? toCamelKeys(result) : result;
    if (result.length > 0) {
      for (const element of result) {
        if (!element.userId) {
          const updateCitizenSql = `UPDATE coop.samity_authorized_person
                              SET user_id=$1
                             WHERE id=$2`;
          const updateCitizen = (
            await (await pgConnect.getConnection("master")).query(updateCitizenSql, [id, element.id])
          ).rows;
        }
      }
      return true;
    } else {
      return false;
    }
  }

  injectionFilter = (key: string) => {
    return toSnakeCase(key);
  };
}
