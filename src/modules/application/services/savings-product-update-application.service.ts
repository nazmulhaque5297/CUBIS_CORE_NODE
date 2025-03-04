import { toCamelKeys } from "keys-transform";
import lodash from "lodash";
import { Pool } from "pg";
import Container, { Service } from "typedi";
// import { buildInsertSql, buildUpdateWithWhereSql } from "../../../utils/sql-builder.util";
import { ApplicationServices } from "./application.service";
@Service()
export class SavingsProductUpdateApplicationService {
  constructor() { }

  async getSavingsUpdateProductAppDetails(appId: number, type: string, componentId: number, pool: Pool) {
    const appInfo: any = Container.get(ApplicationServices);


    const appDataSql = `SELECT service_id, data FROM temps.application WHERE id = $1 and component_id = $2`;
    const appData = (await pool.query(appDataSql, [appId, componentId])).rows[0];
    const productInfo = appData?.data ? toCamelKeys(appData.data) : (appData?.data as any);

    // console.log("Product Info----",productInfo);

    const getGlNameSql = `SELECT glac_name FROM loan.glac_mst WHERE id = $1`;
    const getDocTypeNameSql = `SELECT doc_type_desc FROM master.document_type WHERE id = $1`;

    const getChargeTypeNameSql = `SELECT charge_type_desc FROM loan.product_charge_type WHERE id = $1`;

    const productMstSql = `SELECT 
                              *
                            FROM 
                              loan.product_mst 
                            WHERE 
                              id = $1`;
    let mainProductMaster = (await pool.query(productMstSql, [productInfo.productId])).rows[0];
    mainProductMaster = mainProductMaster ? toCamelKeys(mainProductMaster) : mainProductMaster;
    let productUpdateInfo = {
      productMaster: {},
      productInterest: [],
      productCharge: [],
      productDocuments: [],
    } as any;

    //  console.log("Main Product Master----",mainProductMaster);
    for (let key in mainProductMaster) {
      if (mainProductMaster[key] && productInfo.productMaster[key]) {
        if (key == "openDate") {
          mainProductMaster[key] = new Date(mainProductMaster[key]).toLocaleString("bn-BD");
          productInfo.productMaster[key] = new Date(productInfo.productMaster[key]).toLocaleString("bn-BD");
        }
        if (mainProductMaster[key] != productInfo.productMaster[key]) {

          productUpdateInfo.productMaster[`new${key.charAt(0).toUpperCase() + key.slice(1)}`] =
            productInfo.productMaster[key];
          productUpdateInfo.productMaster[`old${key.charAt(0).toUpperCase() + key.slice(1)}`] =
            mainProductMaster[key];

        }
      }
    }

    //product interest
    if (productInfo?.productInterest) {
      const productInterestSql = `SELECT 
                                id,
                                TO_CHAR(effect_date, 'dd/mm/yyyy') AS effect_date,
                                ins_amt,
                                int_rate, 
                                is_active,
                                time_period,
                                maturity_amount
                              FROM 
                                loan.product_interest 
                              WHERE 
                                product_id = $1`;
      let mainProductInterest = (await pool.query(productInterestSql, [productInfo.productId])).rows as any;

      // console.log("main product interest----", mainProductInterest);
      mainProductInterest = mainProductInterest[0]
        ? toCamelKeys(mainProductInterest)
        : mainProductInterest;

      for (let singleProductInterest of productInfo?.productInterest) {
        let comapredProductInterest = {} as any;
        let getSavedSpecificProductInterest: any = mainProductInterest.filter(
          (value: any) => value.id == singleProductInterest.id
        );
        // console.log({ singleProductInterest, getSavedSpecificProductInterest });

        let updatePreviousProductInterest = singleProductInterest;
        for (let key in updatePreviousProductInterest) {
          if (key == "effectDate") continue
          // if (key == "isActive") {
          if (singleProductInterest[key] && getSavedSpecificProductInterest[0] && getSavedSpecificProductInterest[0][key]) {
            if (key != "id" && singleProductInterest[key] != getSavedSpecificProductInterest[0][key]) {
              comapredProductInterest[key] = singleProductInterest[key];
              updatePreviousProductInterest = lodash.omit(updatePreviousProductInterest, [key]);
            }
          }
          // }
          // console.log({ comapredProductInterest });

        }

        if (getSavedSpecificProductInterest[0] && Object.keys(comapredProductInterest).length > 0) {
          productUpdateInfo.productInterest.push({
            old: getSavedSpecificProductInterest[0],
            new: comapredProductInterest,
          });
        } else if (!getSavedSpecificProductInterest[0]) {
          productUpdateInfo.productInterest.push({
            new: singleProductInterest,
          });
        }
      }
    }

    //product installment

    //product charge
    if (productInfo?.productCharge) {
      const productChargeSql = `SELECT 
                                a.id,
                                TO_CHAR(a.effect_date, 'dd/mm/yyyy') AS effect_date,
                                a.charge_type_id, 
                                b.charge_type_desc, 
                                a.charge_gl, 
                                a.charge_value, 
                                a.is_active 
                              FROM 
                                loan.product_charge_mst a 
                                INNER JOIN loan.product_charge_type b ON b.id = a.charge_type_id 
                              WHERE 
                                a.product_id = $1`;
      let mainProductCharge = (await pool.query(productChargeSql, [productInfo.productId])).rows as any;

      mainProductCharge = mainProductCharge && mainProductCharge.length>0?toCamelKeys(mainProductCharge):[]
      
      //  console.log("main product charge----",mainProductCharge);
       
      for (let singleProductCharge of productInfo?.productCharge) {
        // console.log({singleProductCharge});
        
        let chargeName = (await pool.query(getChargeTypeNameSql, [singleProductCharge.chargeTypeId])).rows[0]
          ?.charge_type_desc;
        let chargeGlName = (await pool.query(getGlNameSql, [singleProductCharge.chargeGl])).rows[0]?.glac_name;

        singleProductCharge = { ...singleProductCharge, chargeName, chargeGlName };
        
        let comparedProductChargeObject = {} as any;
        let getSavedSpecificProductCharge: any = mainProductCharge.filter(
          (value: any) => value.id == singleProductCharge.id
        );
// console.log({getSavedSpecificProductCharge});

        let updatePreviousProductChargeObject = singleProductCharge;
        for (let key in singleProductCharge) {
          if (key != "id") {
            if (singleProductCharge[key] && getSavedSpecificProductCharge[0] && getSavedSpecificProductCharge[0][key]) {
              if (singleProductCharge[key] != getSavedSpecificProductCharge[0][key]) {
                comparedProductChargeObject[key] = singleProductCharge[key];
                if (key == "chargeTypeId")
                  comparedProductChargeObject["chargeTypeName"] = (
                    await pool.query(getChargeTypeNameSql, [singleProductCharge[key]])
                  ).rows[0]?.charge_type_desc;
                if (key == "chargeGl")
                  comparedProductChargeObject["chargeGlName"] = (
                    await pool.query(getGlNameSql, [singleProductCharge[key]])
                  ).rows[0]?.segregation_sector_name;
                updatePreviousProductChargeObject = lodash.omit(updatePreviousProductChargeObject, [key]);
              }
            }
          }
        }

        if (getSavedSpecificProductCharge[0] && Object.keys(comparedProductChargeObject).length > 0) {
          productUpdateInfo.productCharge.push({
            old: getSavedSpecificProductCharge[0],
            new: comparedProductChargeObject,
          });
        } else if (!getSavedSpecificProductCharge[0]) {
          productUpdateInfo.productCharge.push({
            new: singleProductCharge,
          });
        }
      }
    }

    //product documents
    if (productInfo?.productDocuments) {
      const productDocSql = `SELECT 
                            a.id,
                            a.doc_type_id, 
                            b.doc_type_desc, 
                            a.is_mandatory 
                          FROM 
                            loan.product_document_mapping a 
                            INNER JOIN master.document_type b ON b.id = a.doc_type_id 
                          WHERE 
                            a.product_id = $1
                            AND a.is_active = true
                            AND b.is_active = true`;
      let mainProductDocuments = (await pool.query(productDocSql, [productInfo.productId])).rows as any;

      mainProductDocuments = mainProductDocuments[0] ? toCamelKeys(mainProductDocuments) : mainProductDocuments;

      let getSavedSpecificProductDocuments = [];
      for (let singleProductDocuments of productInfo?.productDocuments) {
        let docTypeName = (await pool.query(getDocTypeNameSql, [singleProductDocuments.docTypeId])).rows[0]
          ?.doc_type_desc;
        singleProductDocuments = { ...singleProductDocuments, docTypeName };
        let comparedProductDocumentsObject = {} as any;
        if (mainProductDocuments && mainProductDocuments[0]) {
          getSavedSpecificProductDocuments = mainProductDocuments.filter(
            (value: any) => value.id == singleProductDocuments.id
          );
        }

        let updatePreviousProductDocumentsObject = singleProductDocuments;
        for (let key in singleProductDocuments) {
          if (key != "id") {
            if (
              singleProductDocuments[key] &&
              getSavedSpecificProductDocuments[0] &&
              getSavedSpecificProductDocuments[0][key]
            ) {
              if (singleProductDocuments[key] != getSavedSpecificProductDocuments[0][key]) {
                comparedProductDocumentsObject[key] = singleProductDocuments[key];
                if (key == "docTypeId")
                  comparedProductDocumentsObject["docTypeName"] = (
                    await pool.query(getDocTypeNameSql, [singleProductDocuments[key]])
                  ).rows[0]?.doc_type_desc;
                updatePreviousProductDocumentsObject = lodash.omit(updatePreviousProductDocumentsObject, [key]);
              }
            }
          }
        }

        if (getSavedSpecificProductDocuments[0] && Object.keys(comparedProductDocumentsObject).length > 0) {
          productUpdateInfo.productDocuments.push({
            old: getSavedSpecificProductDocuments[0],
            new: comparedProductDocumentsObject,
          });
        } else if (!getSavedSpecificProductDocuments[0]) {
          productUpdateInfo.productDocuments.push({
            new: singleProductDocuments,
          });
        }
      }
    }


    const finalInfo = {
      type: type,
      applicationInfo: {
        ...productUpdateInfo,
        applicationId: appId,
        serviceId: appData.service_id,
      },
      history: await appInfo.getAppHistory(appId, pool),
    };
    return finalInfo ? toCamelKeys(finalInfo) : {};
  }
}
