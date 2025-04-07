/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-04 12:42:46
 * @modify date 2021-11-04 12:42:46
 * @desc [description]
 */

import { toSnakeCase } from "keys-transform";
import { BadRequestError, buildSql } from "rdcd-common";
import Container, { Service } from "typedi";
import { pgConnect } from "../../../../../db-coop/factory/connection.db";
import { buildInsertSql, buildUpdateSql } from "../../../../../utils/sql-builder.util";
import { SamityDocumentAttrs, SamityDocumentUpdateInputAttrs } from "../../interfaces/samity-document.interface";
import { RegistrationStepServices } from "../reg-steps.service";

@Service()
export class SamityDocumentServices {
  constructor() {}

  /**
   * @param  {boolean} isPagination
   * @param  {number} limit
   * @param  {number} offset
   * @param  {object} allQuery
   */
  async get(samityId: number): Promise<SamityDocumentAttrs[]> {
    const query = `
    select 
      a.*,
      b.doc_type_desc as document_type_desc
    from temps.samity_document a
      full join master.document_type b on b.id = a.document_id
    where a.samity_id=$1
    `;
    const { rows: data } = await (await pgConnect.getConnection("slave")).query(query, [samityId]);

    return data;
  }
  /**
   * @param  {SamityDocumentAttrs} c
   */
  async create(s: SamityDocumentAttrs): Promise<any> {
    const transaction = await (await pgConnect.getConnection("master")).connect();
    try {
      transaction.query("BEGIN");

      const { sql, params } = buildInsertSql("temps.samity_document", s);

      const {
        rows: [data],
      } = await transaction.query(sql, params);

      if (data) {
        const RegistrationStepService = Container.get(RegistrationStepServices);
        const regStepResult = await RegistrationStepService.updateSteps(s.samityId, transaction, 8, s.createdBy);
      }

      transaction.query("COMMIT");
      return data;
    } catch (ex: any) {
      transaction.query("ROLLBACK");
      throw new BadRequestError(ex);
    } finally {
      transaction.release();
    }
  }

  /**
   * @param  {SamityDocumentAttrs} c
   * @param  {number} id
   */
  async update(c: SamityDocumentUpdateInputAttrs, id: number) {
    var updatedAt = new Date();

    //filter out undefined values
    Object.keys(c).map((key) => {
      //@ts-ignore
      if (c[key] == undefined || c[key] == null || c[key] == "") {
        //@ts-ignore
        delete c[key];
      }
    });

    const { sql, params } = buildUpdateSql("temps.samity_document", id, { ...c, updatedAt });

    const {
      rows: [updatedData],
    } = await (await pgConnect.getConnection("master")).query(sql, params);
    return updatedData;
  }

  /**
   * @param  {number} id
   */
  async delete(id: number): Promise<number> {
    const query = `
      Delete FROM temps.samity_document
      WHERE id = $1
      RETURNING id;
      `;

    await (await pgConnect.getConnection("master")).query(query, [id]);

    return id;
  }

  async docMappingCount(id: number) {
    const docMappingIdSql = `select
             a.samity_type_id,
             b.doc_type_id
           from
             temps.samity_info a
           inner join coop.samity_doc_mapping b on
             a.samity_type_id = b.samity_type_id
           where
             a.id = $1`;
    const docMappingIds = await (await (await pgConnect.getConnection("slave")).query(docMappingIdSql, [id])).rows;

    const docTypeIdsOfSamityDocumentSql = `select id from temps.samity_document where samity_id=$1 and document_id=$2`;
    const documentIds = [];
    let isAllDocAvailable = true;
    for (const element of docMappingIds) {
      const samityDocumentId: any = await (
        await (await pgConnect.getConnection("slave")).query(docTypeIdsOfSamityDocumentSql, [id, element.doc_type_id])
      ).rows;
      if (samityDocumentId[0]?.id) {
        documentIds.push({
          docTypeId: element.doc_type_id,
          samityDocumentId,
        });
      } else {
        documentIds.push({
          docTypeId: element.doc_type_id,
          samityDocumentId,
        });
        isAllDocAvailable = false;
      }
    }

    return { documentIds, isAllDocAvailable };
  }

  /**
   * @param  {object} allQuery
   */
  async count(allQuery: object): Promise<number> {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM temps.samity_document";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = buildSql(sql, allQuery, "AND", this.filter, "id")[1];
      var result = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM temps.samity_document";
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
          SELECT COUNT(committee_role_id) 
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
          SELECT COUNT(committee_role_id) 
          FROM 
            master.committee_role
          WHERE 
            role_name = $1
          AND
            committee_role_id !=$2;
        `,
      [name, id]
    );

    return parseInt(role.count) >= 1 ? true : false;
  }

  /**
   * @param  {number} id
   * @returns {boolean}
   */
  async idCheck(id: number): Promise<boolean> {
    const query = `
      SELECT COUNT(id)
      FROM temps.samity_document
      WHERE id = $1;
      `;
    if (!id) {
      return true;
    } else {
      const {
        rows: [role],
      } = await (await pgConnect.getConnection("slave")).query(query, [id]);
      return parseInt(role.count) >= 1 ? true : false;
    }
  }

  /**
   * @param  {string} key
   */
  filter(key: string): string {
    return toSnakeCase(key);
  }

  async isDocumentValidForUpdate(samityId: number, params: any, documentId: number) {
    const sql = `SELECT COUNT(id) 
                  FROM temps.samity_document 
                 WHERE samity_id=$1 AND id != $2 and document_id=$3 `;
    const count = (await (await pgConnect.getConnection("slave")).query(sql, [samityId, params.id, documentId])).rows[0]
      .count;

    return count == 0 ? true : false;
  }
}
