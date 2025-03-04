import { toCamelKeys, toSnakeCase } from "keys-transform";
import _ from "lodash";
import path from "path";
import { BadRequestError, buildSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { minioObjectDelete, uploadObject } from "../../../../utils/minio.util";
import { buildInsertSql, buildUpdateSql } from "../../../../utils/sql-builder.util";
import { pageDataAttrs, pageDataUpdate } from "../interfaces/page-data.interface";

@Service()
export class PageDataServices {
  constructor() {}

  async get(samityId: number) {
    const sql = `SELECT a.*,b.page_name_bn,c.content_name_bn FROM 
                 portal.page_details_data a
                 inner join portal.page_info b on a.page_id=b.id
                 left join portal.content_info c on a.content_id=c.id where a.samity_id=$1`;
    let features = (await (await pgConnect.getConnection("slave")).query(sql, [samityId])).rows;

    return features;
  }

  async getDataSearch(searchType: string, query: any) {
    let queryText = `select a.*,b.type_name as samity_type_name
                      from portal.page_data a 
                      left join coop.samity_type b on (a.data->'${searchType}'->>'samity_typeid')::int=b.id where a.data->'${searchType}'->>`;
    let values = Object.values(query);
    const keys = Object.keys(query);
    let count = 0;

    for (const [index, element] of keys.entries()) {
      count = count + 1;
      const dataKey = toSnakeCase(element);
      if (index == 0) {
        queryText = queryText + `'${dataKey}'` + `=$${count}`;
      } else {
        queryText = queryText + ` and a.data->'${searchType}'->> ` + `'${dataKey}'` + `=$${count}`;
      }
    }
    console.log({ queryText, values });
    const result = (await (await pgConnect.getConnection("slave")).query(queryText, values)).rows;
    return result ? toCamelKeys(result) : result;
  }

  async create(
    samityId: number,
    doptorId: number,
    userId: number,
    pageId: number,
    contentId: number,
    content: string,
    documents: any
  ) {
    try {
      const attachment = [];

      const serialNoSql = `select serial_no from portal.page_details_data where page_id = $1 order by id desc limit 1`;

      const lastSerialNo = (await (await pgConnect.getConnection("slave")).query(serialNoSql, [pageId])).rows[0]
        ?.serial_no;

      const createdAt = new Date();

      if (documents) {
        for (const element of documents) {
          if (element.base64Image) {
            let bufferObj = Buffer.from(element.base64Image, "base64");

            const fileName = `pageInfo-${element.name}-${Date.now()} ${path.extname(element.name)}`;

            await uploadObject({ fileName, buffer: bufferObj });
            attachment.push({ fileName });
          }
        }
      }

      const { sql, params } = buildInsertSql("portal.page_details_data", {
        doptor_id: doptorId,
        samity_id: samityId,
        page_id: pageId,
        content_id: contentId ? contentId : 0,
        content: content,
        attachment: JSON.stringify(attachment),
        status: true,
        serialNo: lastSerialNo ? lastSerialNo + 1 : 1,
        created_by: userId,
        created_at: createdAt,
      });

      const result = await (await pgConnect.getConnection("master")).query(sql, params);
      return toCamelKeys(result.rows[0]);
    } catch (ex: any) {
      throw new BadRequestError(ex);
    }
  }

  async update(data: pageDataUpdate, id: number): Promise<pageDataAttrs> {
    const updateData = _.omit(data, "documents", "content");
    const pageDetailSql = `select attachment from portal.page_details_data where id=$1 `;
    let { attachment } = (await (await pgConnect.getConnection("slave")).query(pageDetailSql, [id]))?.rows[0];

    if (data.documents) {
      const fileNames = data.documents?.map((element) => {
        return element.oldFileName ? element.oldFileName : element.name;
      });
      if (attachment) {
        attachment = attachment.filter((element: any) => {
          if (fileNames.includes(element.fileName)) {
            return element;
          }
        });
      }

      for (const element of data.documents) {
        if (element.oldFileName) {
          const index = attachment.findIndex((obj: { fileName: string }) => {
            return obj.fileName == element.oldFileName;
          });
          attachment.splice(index, 1);
        }

        if (element.base64Image) {
          let bufferObj = Buffer.from(element.base64Image, "base64");

          const fileName = `pageInfo-${element.name}-${Date.now()} ${path.extname(element.name)}`;

          await uploadObject({ fileName, buffer: bufferObj });
          attachment.push({ fileName });
        }
      }
    }
    const { sql, params } = buildUpdateSql("portal.page_details_data", id, {
      ...updateData,

      content: data.content,
      attachment: JSON.stringify(attachment),
      updatedAt: new Date(),
    });

    const {
      rows: [updateResult],
    } = await (await pgConnect.getConnection("master")).query(sql, params);
    return toCamelKeys(updateResult);
  }

  async patchCommonData(samityId: number, user: any, data: any) {
    const sql = `UPDATE portal.page_data SET common_data=$1, updated_by=$2, updated_at=$3 where samity_id=$4 returning common_data`;
    const result = (
      await (await pgConnect.getConnection("master")).query(sql, [data.commonData, user.userId, new Date(), samityId])
    ).rows;

    return result ? toCamelKeys(result) : result;
  }

  async delete(id: number): Promise<pageDataAttrs | null> {
    const sql = `DELETE FROM portal.page_details_data WHERE id = $1 RETURNING *`;

    const result = await (await (await pgConnect.getConnection("master")).query(sql, [id])).rows[0];

    const d = await minioObjectDelete(toCamelKeys(result.attachment), ["fileName"]);
    const valueWithOutAttachment = toCamelKeys(_.omit(result, "attachment"));
    let returnValue = [{ ...valueWithOutAttachment, attachment: d }];

    return result ? toCamelKeys(returnValue) : null;
  }

  async deleteArr(deleteArr: any[]) {
    const sql = `DELETE FROM portal.page_details_data WHERE id = $1 RETURNING id`;
    const returnData = [];
    for (const element of deleteArr) {
      const result = (await (await pgConnect.getConnection("master")).query(sql, [element.id])).rows;
      returnData.push(result);
    }
    return returnData ? toCamelKeys(returnData) : returnData;
  }

  async count(allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM portal.page_details_data";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = await buildSql(sql, allQuery, "AND", this.filter, "id")[1];
      var result = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM portal.page_details_data";
      result = await (await pgConnect.getConnection("slave")).query(queryText);
    }
    return result.rows[0].count;
  }

  filter(key: string) {
    switch (key) {
      case "id":
        return "id";
      case "doptorId":
        return "doptor_id,";
      case "samityId":
        return "samity_id";
      case " pageId":
        return "page_id";
      case "contentType":
        return "content_type";
      case "data":
        return "data";
      case "status":
        return "status";
      case "serialNo":
        return "serial_no";
      case "attachment":
        return "attachment";
      default:
        throw new BadRequestError("Inavlid Request");
    }
  }

  async checkExistingId(id: any) {
    if (!id) {
      return true;
    } else {
      const { rows: feature } = await (
        await pgConnect.getConnection("slave")
      ).query(
        `
                SELECT COUNT(id) 
                FROM portal.page_details_data
                WHERE id = $1
              `,
        [id]
      );
      return parseInt(feature[0].count) >= 1 ? true : false;
    }
  }

  async clean(obj: any) {
    for (var propName in obj) {
      if (obj[propName] === null || obj[propName] === undefined || obj[propName] === "" || obj[propName] === "") {
        delete obj[propName];
      }
    }
    return obj;
  }

  async isPostable(contentId: number, samityId: number) {
    const sql = `select multi_row_allow from portal.content_info where id=$1`;
    const { multi_row_allow: multiRowAllow } = (await (await pgConnect.getConnection("slave")).query(sql, [contentId]))
      .rows[0];
    const queryForCheckIsPostable = `select count(id) from portal.page_details_data where content_id=$1 and samity_id=$2`;
    const { count } = (
      await (await pgConnect.getConnection("slave")).query(queryForCheckIsPostable, [contentId, samityId])
    ).rows[0];

    if (!multiRowAllow && count > 0) {
      return false;
    }
    if (!multiRowAllow && count == 0) {
      return true;
    }
    if (multiRowAllow) {
      return true;
    }
  }
}
