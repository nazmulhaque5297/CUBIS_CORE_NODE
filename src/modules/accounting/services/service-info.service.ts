import { toCamelKeys, toSnakeCase } from "keys-transform";
import { buildGetSql, buildSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { isExistsByColumn } from "../../../../utils/service.utils";

@Service()
export default class ServiceInfoServices {
  async get(isPagination: boolean, limit: number, offset: number, allQuery: any, key: any) {
    var queryText: string = "";
    let sql: string;
    if (key) {
      sql = `SELECT `;
      for (const [index, element] of key.entries()) {
        if (index === 0) {
          sql = sql + `${toSnakeCase(element)}`;
        } else {
          sql = sql + `,${toSnakeCase(element)}`;
        }
      }

      sql = sql + ` FROM coop.service_info`;
    } else {
      sql = "SELECT * FROM coop.service_info";
    }

    const detailsData = `SELECT A.ID,
    A.DOC_TYPE,
    A.DOC_TYPE_DESC,
    A.DOCUMENT_PROPERTIES
  FROM MASTER.DOCUMENT_TYPE A
  INNER JOIN
    (SELECT *,(JSONB_ARRAY_ELEMENTS(SERVICE_RULES -> 'documents')::JSONB) -> 'docId' DOCID
      FROM COOP.SERVICE_INFO) B ON A.ID = B.DOCID::INT
  WHERE B.ID = $1
    AND A.IS_ACTIVE = TRUE`;

    const allQueryValues: any[] = Object.values(allQuery);

    if (Object.keys(allQuery).length > 0) {
      const createSql = buildSql(sql, allQuery, "AND", this.filter, "id", limit, offset);
      const queryText = isPagination ? createSql[0] : createSql[1];

      var features = (await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues)).rows;
      if (allQuery.id) {
        var featuresDetails = await (await pgConnect.getConnection("slave")).query(detailsData, [allQuery.id]);
        features[0].featuresDetails = featuresDetails.rows;
      }
    } else {
      queryText = isPagination ? sql + ` WHERE LIMIT $1 OFFSET $2` : sql;
      features = await (
        await (await pgConnect.getConnection("slave")).query(queryText, isPagination ? [limit, offset] : [])
      ).rows;
    }

    return features;
  }

  async count(allQuery: any) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM coop.service_info ";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = buildSql(sql, allQuery, "AND", this.filter, "id")[1];
      var result = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM coop.service_info";
      result = await (await pgConnect.getConnection("slave")).query(queryText);
    }
    return result.rows[0].count;
  }

  async getServiceActionById(serviceId: number, serviceActionId: number) {
    const connection = await pgConnect.getConnection("slave");

    const query = `select * from coop.service_info where id = $1`;
    const {
      rows: [serviceData],
    } = await connection.query(query, [serviceId]);

    const serviceAction = serviceData.service_action.find((e: { id: number }) => e.id == serviceActionId);

    return serviceAction ? toCamelKeys(serviceAction) : serviceAction;
  }

  async getServiceById(serviceId: number) {
    const connection = await pgConnect.getConnection("slave");

    const { queryText, values } = buildGetSql(["*"], "coop.service_info", {
      id: serviceId,
    });

    const {
      rows: [data],
    } = await connection.query(queryText, values);

    return toCamelKeys(data) as any;
  }

  async idCheck(id: any) {
    return await isExistsByColumn("id", "coop.service_info", await pgConnect.getConnection("slave"), { id });
  }

  async getServiceByNameAndDoptor(serviceName: string, doptorId: number): Promise<number> {
    //   const serviceIdSql = `select
    //   id
    //  from coop.service_info
    //  where service_name_english=$1 and doptor_id=$2`;
    const serviceIdSql = `select id from coop.service_info where service_name_english=$1`;

    const { id: serviceId } = (await (await pgConnect.getConnection("slave")).query(serviceIdSql, [serviceName]))
      .rows[0];

    return serviceId;
  }

  filter(key: string) {
    return toSnakeCase(key);
  }
}
