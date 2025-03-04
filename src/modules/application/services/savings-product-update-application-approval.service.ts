import { toCamelKeys, toSnakeCase } from "keys-transform";
import _ from "lodash";
import { buildInsertSql, buildUpdateWithWhereSql } from "rdcd-common";
import { Service } from "typedi";
import { PoolClient } from "pg";
import moment from "moment";
import lodash from "lodash";

@Service()
export class SavingsProductUpdateApplicationApprovalService {
  constructor() { }

  async savingsProductUpdateApproval(userId: number, data: any, doptorId: number, transaction: PoolClient) {
    const productInfo = toCamelKeys(data) as any;

    const today = new Date();
    let productMstInfo = {} as any;
    //product master data save
    if (productInfo.productMaster) {
      const productMstData = {
        ...lodash.omit(productInfo.productMaster, ["productId", "openDate"]),
        openDate: moment(new Date(productInfo.productMaster.openDate)).format("DD/MM/YYYY"),
      };

      //remove all null value with key
      const productMstFilterData = lodash.pickBy(productMstData);
      const { sql: productMstSql, params: productMstParams } = buildUpdateWithWhereSql(
        "loan.product_mst",
        {
          id: productInfo.productId,
        },
        productMstFilterData
      );
      productMstInfo = (await transaction.query(productMstSql, productMstParams)).rows[0];
      if (!productMstInfo) {
        const getProductSql = `SELECT * FROM loan.product_mst WHERE id = $1`;
        productMstInfo = (await transaction.query(getProductSql, [productInfo.productId])).rows[0];
      }
    }

    //product service charge save
    if (productInfo?.productInterest) {
      /****************************************** */
      /*need to work for delete product interest*/
      /****************************************** */

      for (let value of productInfo?.productInterest) {
        console.log({preMatureInfo: value.productPreMature});
        
        let productInterestResp;
        if (value.id) {
          //remove all null value with key

          let { sql: productInterestSql, params: productInterestParams } = buildUpdateWithWhereSql(
            "loan.product_interest",
            { id: value.id },
            {
              intRate: value?.intRate,
              insAmt: value?.insAmt,
              maturityAmount: value?.maturityAmount || 0,
              timePeriod: value?.timePeriod || 0,
              isActive:value?.isActive,
            }
          );
          // console.log("AAAA", productInterestSql, productInterestParams);

          await transaction.query(productInterestSql, productInterestParams);

        } else {
          let { sql: productInterestSql, params: productInterestParams } = buildInsertSql("loan.product_interest", {
            productId: productInfo.productId,
            intRate: value?.intRate||0,
            insAmt: value?.insAmt || 0,
            maturityAmount: value?.maturityAmount || 0,
            timePeriod: value?.timePeriod || 0,
            isActive:value?.isActive,
            effectDate: moment(new Date(value.effectDate)).format("DD/MM/YYYY"),
            createdBy: userId,
            createdAt: today,
          });
          // console.log("BBBBBBB", productInterestSql, productInterestParams);

          productInterestResp = (await transaction.query(productInterestSql, productInterestParams)).rows[0];
          for (let element of value?.productPreMature) {
            let { sql: productPreMatureSql, params: productPreMatureParams } = buildInsertSql("loan.product_pre_mature_info", {
              productId: productInfo.productId,
              interestId: productInterestResp?.id,
              interestRate: element?.interestRate||0,
              timePeriod: +(element.timePeriod) * 12,
              maturityAmount: element.maturityAmount||0,
              createdBy: userId,
              createdAt: today,
            });
            console.log("BBBBBBB", productPreMatureSql, productPreMatureParams);

            await transaction.query(productPreMatureSql, productPreMatureParams);
          }
        }
      };
    }



    //product charge save
    if (productInfo?.productCharge) {
      /*****************************************************************/
      /*need to work for delete product charge*/
      /****************************************************************/
      productInfo.productCharge?.map(async (value: any) => {
        if (value.id) {
          const productChargeData = {
            ...lodash.omit(value, ["chargeTypeDesc", "effectDate","chargeName","glacName"]),
            effectDate: moment(new Date(value.effectDate)).format("DD/MM/YYYY"),
            isActive:value?.isActive,
            updatedBy: userId,
            updatedAt: today,
          };

          //remove all null value with key
          const productChargeFilterData = lodash.pickBy(productChargeData);
          let { sql: productChargeSql, params: productChargeParams } = buildUpdateWithWhereSql(
            "loan.product_charge_mst",
            {
              id: value.id,
            },
            productChargeFilterData
          );
          await transaction.query(productChargeSql, productChargeParams);
        } else {
          let { sql: productChargeSql, params: productChargeParams } = buildInsertSql("loan.product_charge_mst", {
            productId: productInfo.productId,
            ...lodash.omit(value, ["chargeTypeDesc", "effectDate","chargeName","glacName"]),
            effectDate: moment(new Date(value.effectDate)).format("DD/MM/YYYY"),
            createdBy: userId,
            createdAt: today,
          });
          await transaction.query(productChargeSql, productChargeParams);
        }
      });
    }

    //product document mapping save
    if (productInfo?.productDocuments) {
      productInfo.productDocuments?.map(async (value: any) => {
        if (value.id) {
          /*****************************************************************/
          /*need to work for delete product neccessary documents*/
          /****************************************************************/

          const productDocumentsData = {
            projectId: productMstInfo.project_id ? productMstInfo.project_id : productInfo.projectId,
            ...lodash.omit(value, ["docTypeDesc"]),
            isActive:value.isActive,
            updatedBy: userId,
            updatedAt: today,
          };

          //remove all null value with key
          const productDocumentsFilterData = lodash.pickBy(productDocumentsData);
          let { sql: productDocMapSql, params: productDocMapParams } = buildUpdateWithWhereSql(
            "loan.product_document_mapping",
            { id: value.id },
            productDocumentsFilterData
          );
          await transaction.query(productDocMapSql, productDocMapParams);
        } else {
          let { sql: productDocMapSql, params: productDocMapParams } = buildInsertSql("loan.product_document_mapping", {
            doptorId: doptorId,
            projectId: productMstInfo.project_id,
            productId: productMstInfo.id,
            ...lodash.omit(value, ["docTypeDesc"]),
            createdBy: userId,
            createdAt: today,
          });
          await transaction.query(productDocMapSql, productDocMapParams);
        }
      });
    }

    if (productInfo?.productChargeDel) {
      productInfo.productChargeDel?.map(async (id: number) => {
        let { sql: productChargeDelSql, params: productChargeDelParams } = buildUpdateWithWhereSql(
          "loan.product_charge_mst",
          { id },
          { isActive: false }
        );
        await transaction.query(productChargeDelSql, productChargeDelParams);
      });
    }

    if (productInfo?.productDocumentsDel) {
      productInfo.productDocumentsDel?.map(async (id: number) => {
        let { sql: productDocumentsDelSql, params: productDocumentsDelParams } = buildUpdateWithWhereSql(
          "loan.product_document_mapping",
          { id },
          { isActive: false }
        );
        await transaction.query(productDocumentsDelSql, productDocumentsDelParams);
      });
    }

    return productMstInfo;
  }
  injectionFilter(key: string): string {
    return toSnakeCase(key);
  }
}
