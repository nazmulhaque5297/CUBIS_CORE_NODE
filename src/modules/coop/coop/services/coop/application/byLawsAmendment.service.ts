/**
 * @author Md Hasibuzzaman
 * @email hasib.9437.hu@gmail.com
 * @create date 2023/05/31 10:13:48
 * @modify date 2023/05/31 10:13:48
 * @desc [description]
 */
import { toCamelKeys } from "keys-transform";
import { BadRequestError, buildUpdateWithWhereSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../../../db-coop/factory/connection.db";
import { getFileName } from "../../../../../../utils/file.util";
import { minioPresignedGet, uploadObject } from "../../../../../../utils/minio.util";
@Service()
export class BylawsAmendmentServices {
  constructor() {}

  async getApplicationById(samityId: any, doptorId: number, serviceId: number) {
    try {
      const sql = `SELECT id,samity_id,next_app_designation_id,status,data,edit_enable FROM COOP.APPLICATION WHERE SAMITY_ID = $1
      AND DOPTOR_ID = $2
      AND SERVICE_ID = $3
      AND STATUS IN ($4, $5)`;

      let result = (
        await (await pgConnect.getConnection("slave")).query(sql, [samityId, doptorId, serviceId, "P", "C"])
      ).rows[0];
      result = result ? toCamelKeys(result) : [];
      if (result) {
        for (const [index, element] of result.data.documentList.entries()) {
          if (result.data.documentList && result.data.documentList.length > 0) {
            result.data.documentList[index] = await minioPresignedGet(result.data.documentList[index], [
              "documentPictureFrontName",
            ]);
          }
        }
      }
      return result ? result : [];
    } catch (ex: any) {
      throw new BadRequestError(ex);
    }
  }
  async create(data: any, user: any) {
    data.createdAt = new Date();
    // documents handle
    for (const element of data.documentList) {
      if (element.documentPictureFront && element.documentPictureFrontFile) {
        let bufferObj = Buffer.from(element.documentPictureFront, "base64");
        const fileName = getFileName(element.documentPictureFrontName);
        await uploadObject({ fileName, buffer: bufferObj });
        element.documentPictureFrontName = fileName;
        element.documentPictureFront = "";
        element.documentPictureFrontFile = "";
      } else {
        element.documentPictureFront = "";
        element.documentPictureFrontFile = "";
      }
    }
    return data;
  }
  async update(id: number, reqBody: any, user: any, updatedBy: any): Promise<any[]> {
    let result = [];
    const updatedAt = new Date();
    const data = reqBody.data;
    data.userType = user.type;
    data.userId = user.type == "user" ? user.userId : user.userId;

    for (const element of data.documentList) {
      if (element.documentPictureFront && element.documentPictureFrontFile) {
        let bufferObj = Buffer.from(element.documentPictureFront, "base64");
        const fileName = getFileName(element.documentPictureFrontName);
        await uploadObject({ fileName, buffer: bufferObj });
        element.documentPictureFrontName = fileName;
        element.documentPictureFront = "";
        element.documentPictureFrontFile = "";
      } else {
        element.documentPictureFront = "";
        element.documentPictureFrontFile = "";
      }
    }

    const { sql, params } = buildUpdateWithWhereSql(
      "coop.application",
      {
        id,
      },
      { data: reqBody.data, status: "P", updatedBy, updatedAt }
    );
    result.push(await (await (await pgConnect.getConnection("master")).query(sql, params)).rows);
    return result;
  }
}
