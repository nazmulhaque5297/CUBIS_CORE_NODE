import { toCamelKeys, toSnakeCase } from "keys-transform";
import { camelCase } from "lodash";
import { buildGetSql, buildSql, isExistsByColumn } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../db/connection.db";

@Service()
export default class ServiceInfoServices {
  async get(
    deskId: number | null,
    createdBy: number | null,
    isPagination: boolean,
    limit: number,
    offset: number,
    allQuery: object
  ) {
    var queryText: string = "";
    const pool = db.getConnection("slave");
    let query = ``;
    let result = [];
    let services = [] as any;
    if (deskId) {
      query = `SELECT distinct service_id FROM temps.application WHERE next_app_designation_id = $1`;
      result = (await pool.query(query, [deskId])).rows;
    } else if (createdBy) {
      query = ``;
      result = [];
    }

    const serviceId = result.length > 0 ? result.map((v: any) => v.service_id) : [];
    const sql: string = "SELECT * FROM master.service_info";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      const createSql = buildSql(sql, allQuery, "AND", this.filter, "id", limit, offset);
      const queryText = isPagination ? createSql[0] : createSql[1];

      services = (await pool.query(queryText, allQueryValues)).rows;
    } else if (serviceId[0]) {
      console.log("iamhererere39");
      queryText = isPagination
        ? "SELECT * FROM master.service_info WHERE id = ANY($3::int[]) ORDER BY id LIMIT $1 OFFSET $2"
        : "SELECT * FROM master.service_info WHERE id = ANY($1::int[]) ORDER BY id";
      services = (await pool.query(queryText, isPagination ? [limit, offset, serviceId] : [serviceId])).rows;
    } else if (!serviceId[0] && createdBy) {
      queryText = "SELECT id, service_name FROM master.service_info ORDER BY id";
      services = (await pool.query(queryText)).rows;
    } else {
      queryText = "SELECT * FROM master.service_info WHERE id IS null ORDER BY id";
      services = (await pool.query(queryText)).rows;
    }

    return services.length > 0 ? toCamelKeys(services) : [];
  }

  async count(allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM master.service_info";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = buildSql(sql, allQuery, "AND", this.filter, "id")[1];
      var result = await (await db.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM master.service_info";
      result = await (await db.getConnection("slave")).query(queryText);
    }
    return result.rows[0].count;
  }

  async getServiceActionById(serviceId: number, serviceActionId: number) {
    const connection = await db.getConnection("slave");

    const query = `select * from master.service_info where id = $1`;
    const {
      rows: [serviceData],
    } = await connection.query(query, [serviceId]);

    const serviceAction = serviceData.service_action.find((e: { id: number }) => e.id == serviceActionId);

    return serviceAction ? toCamelKeys(serviceAction) : serviceAction;
  }

  async idCheck(id: any) {
    return await isExistsByColumn("id", "master.service_info", await db.getConnection("slave"), { id });
  }

  async getServiceId(serviceName: any) {
    const pool = await db.getConnection("slave");
    const query = `SELECT id FROM master.service_info WHERE service_name = $1`;
    const result = await (await pool.query(query, [serviceName])).rows;
    return result[0] ? camelCase(result[0].id) : [];
  }
  async getServiceById(serviceId: number) {
    const connection = await db.getConnection("slave");

    const { queryText, values } = buildGetSql(["*"], "master.service_info", {
      id: serviceId,
    });

    const {
      rows: [data],
    } = await connection.query(queryText, values);

    return toCamelKeys(data) as any;
  }

  filter(key: string) {
    return toSnakeCase(key);
  }
}
