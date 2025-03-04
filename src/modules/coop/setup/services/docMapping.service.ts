import { toCamelKeys, toSnakeCase } from "keys-transform";
import { default as _ } from "lodash";
import { buildInsertSql, buildUpdateSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";

@Service()
export default class DocMappingServices {
  count: any;
  static create(arg0: any) {
    throw new Error("Method not implemented.");
  }
  constructor() {}

  // create doc mapping and samity Type
  async create(data: any, user: any): Promise<any> {
    const createdBy = user.userId;
    const createdAt = new Date();
    const client = await (await pgConnect.getConnection("master")).connect();
    try {
      await client.query("BEGIN");

      const { sql: samityTypeSql, params: samityTypeParams } = buildInsertSql("coop.samity_type", {
        ...data.samityTypeData,
        doptorId: user.doptorId,
        createdBy,
        createdAt,
      });
      const samityTypeResult = (await client.query(samityTypeSql, samityTypeParams)).rows[0];

      let docMappingInsetResult = [];
      for (const element of data.docMappingData) {
        const { sql: docMappingSql, params: docMappingParams } = buildInsertSql("coop.samity_doc_mapping", {
          ...element,
          samityTypeId: samityTypeResult.id,
          createdBy,
          createdAt,
        });
        docMappingInsetResult.push((await client.query(docMappingSql, docMappingParams)).rows[0]);
      }

      await client.query("COMMIT");
      return samityTypeResult && docMappingInsetResult
        ? toCamelKeys({ samityTypeResult, docMappingInsetResult })
        : { samityTypeResult, docMappingInsetResult };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  // get doc mapping and samity Type
  async get(): Promise<any | null> {
    const result = [];
    const samityTypeSql = `select * from coop.samity_type`;
    const samityTypeResult = (await (await pgConnect.getConnection("slave")).query(samityTypeSql)).rows;
    for (const element of samityTypeResult) {
      const docMappingSql = `SELECT
                                id,
                                doc_type_id,
                                is_mandatory,
                                TYPE,
                                samity_level
                              FROM
                                coop.samity_doc_mapping
                              WHERE
                                samity_type_id = $1`;
      const docMappingResult = (await (await pgConnect.getConnection("slave")).query(docMappingSql, [element.id])).rows;
      result.push({
        samityTypeInfo: element,
        docMappingInfo: docMappingResult,
      });
    }
    return result ? toCamelKeys(result) : result;
  }

  async update(data: any, updatedBy: string, updatedAt: Date) {
    const client = await (await pgConnect.getConnection("master")).connect();
    try {
      await client.query("BEGIN");
      const { sql: samityTypeSql, params: samityTypeParams } = buildUpdateSql(
        "coop.samity_type",
        data.samityTypeData.id,
        { ...data.samityTypeData, updatedBy, updatedAt },
        "id"
      );

      // buildInsertSql("coop.samity_type", {
      //   ...data.samityTypeData,
      //   updatedBy,
      //   updatedAt,
      // });
      const samityTypeResult = (await client.query(samityTypeSql, samityTypeParams)).rows[0];

      let docMappingInsetResult = [];
      for (const element of data.docMappingData) {
        if (element.id == 0) {
          const { sql: docMappingSql, params: docMappingParams } = buildInsertSql("coop.samity_doc_mapping", {
            ..._.omit(element, "id"),
            samityTypeId: samityTypeResult.id,
            createdBy: updatedBy,
            createdAt: updatedAt,
          });
          docMappingInsetResult.push((await client.query(docMappingSql, docMappingParams)).rows[0]);
        } else {
          const { sql: docMappingSql, params: docMappingParams } = buildUpdateSql(
            "coop.samity_doc_mapping",
            element.id,
            { ...element, updatedBy, updatedAt },
            "id"
          );
          docMappingInsetResult.push((await client.query(docMappingSql, docMappingParams)).rows[0]);
        }

        // buildInsertSql("coop.samity_doc_mapping", {
        //   ...element,
        //   samityTypeId: samityTypeResult.id,
        //   updatedBy,
        //   updatedAt,
        // });
      }

      await client.query("COMMIT");
      return samityTypeResult && docMappingInsetResult
        ? toCamelKeys({ samityTypeResult, docMappingInsetResult })
        : { samityTypeResult, docMappingInsetResult };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async delete(docMappingId: number) {
    const sqlDocResult = `select * from coop.samity_doc_mapping where id=$1`;
    const docResult = (await (await pgConnect.getConnection("slave")).query(sqlDocResult, [docMappingId])).rows[0];

    const { sql, params } = buildInsertSql("coop.samity_doc_mapping", {
      ..._.omit(docResult, "id"),
    });

    const archiveResult = (await (await pgConnect.getConnection("archive")).query(sql, params)).rows;

    let deleteResult = [];
    if (archiveResult && archiveResult.length > 0) {
      const deleteSql = `delete from coop.samity_doc_mapping  where id=$1 returning *`;
      deleteResult = (await (await pgConnect.getConnection("master")).query(deleteSql, [docMappingId])).rows[0];
    }
    return deleteResult;
  }

  // keys injection filter
  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }
}
