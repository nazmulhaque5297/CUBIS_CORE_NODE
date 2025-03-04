import { toCamelKeys } from "keys-transform";
import { buildInsertSql } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../../db/connection.db";
import lodash from "lodash";
import { buildUpdateWithWhereSql } from "../../../../utils/sql-builder.util";
import BadRequestError from "../../../../errors/bad-request.error";

@Service()
export class FixedAssetService {
  constructor() { }

  async getFixedAssetData() {
    const pool = db.getConnection("slave");
    const fixedassetdatasql = `SELECT id, item_name, item_code, description, is_active, category_id
    FROM COOP.fa_item_info `;
    let asssetData = (await pool.query(fixedassetdatasql)).rows;
    return asssetData ? toCamelKeys(asssetData) : [];
  }

  async postFixedAssetData(data: any) {
    const pool = db.getConnection("master");
    let result, message;

    if (data.id) {
      let checkDuplicateItemsql = `SELECT item_name, item_code
    FROM COOP.fa_item_info where item_name = $1 and id != $2`;
      let duplicatename = (await pool.query(checkDuplicateItemsql, [data.itemName, data.id])).rows[0];
      if (duplicatename) {
        throw new BadRequestError("এই আইটেম নাম বিদ্দ্যমান আছে, অন্য নাম প্রদান করুন");
      }
      let { sql, params } = buildUpdateWithWhereSql(
        "coop.fa_item_info",
        { id: Number(data.id) },
        {
          ...lodash.omit(data, ["userId", "userType"]),
          updatedBy: data.userId,
          updatedAt: new Date(),
          createUserType: data.userType,
        }
      );
      result = (await pool.query(sql, params)).rows[0];
      message = "সফলভাবে হালনাগদ করা হয়েছে";
    } else {
      let checkDuplicateItemsql = `SELECT item_name, item_code
    FROM COOP.fa_item_info where item_name = $1`;
      let duplicatename = (await pool.query(checkDuplicateItemsql, [data.itemName])).rows[0];
      if (duplicatename) {
        throw new BadRequestError("এই আইটেম নাম বিদ্দ্যমান আছে, অন্য নাম প্রদান করুন");
      }

      let { sql, params } = buildInsertSql("coop.fa_item_info", {
        ...lodash.omit(data, ["userId", "userType"]),
        createdBy: data.userId,
        createdAT: new Date(),
        createUserType: data.userType,
      });
      result = (await pool.query(sql, params)).rows[0];
      message = "সফলভাবে তৈরি করা হয়েছে";
    }
    return result && message ? (toCamelKeys({ result, message }) as any) : {};
  }

  async getPurchaseFixedAssetData(samityId: Number) {
    const pool = db.getConnection("slave");
    const purchasefixedassetdatasql = `SELECT *
    FROM COOP.fa_purchase_info where samity_Id = $1`;
    let purchaseAsssetData = (await pool.query(purchasefixedassetdatasql, [samityId])).rows;
    return purchaseAsssetData ? toCamelKeys(purchaseAsssetData) : {};
  }

  async purchaseFixedAssetData(data: any) {
    const pool = db.getConnection("master");
    let result, message;

    let { sql, params } = buildInsertSql("coop.fa_purchase_info", {
      ...data.purchaseDetails,
      createdBy: data.userId,
      createdAT: new Date(),
      createUserType: data.userType,
    });
    result = (await pool.query(sql, params)).rows[0];

    for (let x of data.assetDetails) {
      let { sql, params } = buildInsertSql("coop.fa_asset_info", {
        ...lodash.omit(x, ["id"]),
        purchaseInfoId: result.id,
        createdBy: data.userId,
        createdAT: new Date(),
        createUserType: data.userType,
      });
      let Update = (await pool.query(sql, params)).rows[0];
    }
    message = "সফলভাবে তৈরি করা হয়েছে";

    return result && message ? (toCamelKeys({ result, message }) as any) : {};
  }

  async updatepurchaseFixedAssetData(data: any) {
    const pool = db.getConnection("master");
    let purchaseupdateresult, message, deleteResult, assetUpdateResult;

    let { sql, params } = buildUpdateWithWhereSql(
      "coop.fa_purchase_info",
      { id: Number(data.purchaseDetails.id), samity_id: data.purchaseDetails.samityId },
      {
        ...lodash.omit({ ...data.purchaseDetails }, ["id"]),
        updatedBy: data.userId,
        updatedAT: new Date(),
        createUserType: data.userType,
      }
    );
    purchaseupdateresult = (await pool.query(sql, params)).rows[0];

    //delete the asset info

    const deleteAsset = `DELETE FROM coop.fa_asset_info WHERE purchase_info_id = $1 and samity_id=$2 and item_id=$3`;
    deleteResult = (
      await pool.query(deleteAsset, [
        data.purchaseDetails.id,
        data.purchaseDetails.samityId,
        data.purchaseDetails.itemId,
      ])
    ).rows;
    //insert the asset info
    for (let x of data.assetDetails) {
      let { sql, params } = buildInsertSql("coop.fa_asset_info", {
        ...lodash.omit(x, ["id"]),
        purchaseInfoId: data.purchaseDetails.id,
        createdBy: data.userId,
        createdAT: new Date(),
        createUserType: data.userType,
      });
      assetUpdateResult = (await pool.query(sql, params)).rows[0];
    }
    message = "সফলভাবে হালনাগাদ করা হয়েছে";

    return purchaseupdateresult && message && assetUpdateResult
      ? (toCamelKeys({ purchaseupdateresult, assetUpdateResult, deleteResult, message }) as any)
      : {};
  }

  async getAssetData(purchaseId: Number, samityId: Number) {
    const pool = db.getConnection("slave");
    const assetdatasql = `SELECT id, samity_id, item_id, asset_code, purchase_info_id, status
    FROM COOP.fa_asset_info where purchase_info_id = $1 and samity_id = $2`;
    let AsssetData = (await pool.query(assetdatasql, [purchaseId, samityId])).rows;
    return AsssetData ? toCamelKeys(AsssetData) : [];
  }

  async getListofAsset(itemId: Number, samityId: Number) {
    const pool = db.getConnection("slave");
    const assetdatasql = `select b.id, a.item_id, b.asset_code,a.purchased_by, a.purchase_date, a.item_unit_price, b.status from
    coop.fa_purchase_info a inner join
    coop.fa_asset_info b on a.samity_id = b.samity_id and a.id = b.purchase_info_id
    where a.item_id = $1 and a.samity_id = $2`;
    let AsssetData = (await pool.query(assetdatasql, [itemId, samityId])).rows;
    return AsssetData ? toCamelKeys(AsssetData) : [];
  }

  async updateAssetinfo(Id: Number, samityId: Number, data: any) {
    const pool = db.getConnection("master");
    let { sql, params } = buildUpdateWithWhereSql(
      "coop.fa_asset_info",
      { id: Number(Id), samity_id: samityId },
      { status: data.status, updatedBy: data.userId, updatedAT: new Date(), createUserType: data.userType }
    );
    let result = (await pool.query(sql, params)).rows[0];
    let message = "সফলভাবে হালনাগাদ করা হয়েছে";

    return result ? (toCamelKeys({ result, message }) as any) : {};
  }
}
