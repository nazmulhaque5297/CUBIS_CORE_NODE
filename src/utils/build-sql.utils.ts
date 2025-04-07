import { IaddPrefix, ISqlBuilderResult } from "../types/interfaces/sql-builder.interface";

/**
 * @param  {string} sql
 * @param  {object} filter
 * @param  {"AND"|"OR"="AND"} operator
 * @param  {Function} filterFunc
 * @param  {string} primaryId
 * @param  {number} limit?
 * @param  {number} skip?
 */
export function buildSql(
  sql: string,
  filter: any,
  operator: "AND" | "OR" = "AND",
  filterFunc: Function,
  primaryId: string,
  limit?: number,
  skip?: number
): string[] {
  let where: string = " where";
  let plainSql = "";
  const keys: string[] = Object.keys(filter);

  for (let [index, key] of keys.entries()) {
    if (typeof filter[key] == "object") {
      var newKey = filterFunc(key);
      if (index === keys.length - 1)
        where += ` ${newKey} = ANY ($${index + 1})`;
      else where += ` ${newKey} =  ANY ($${index + 1} ) ${operator}`;
    } else {
      var newKey = filterFunc(key);
      if (index === keys.length - 1) where += ` ${newKey} = $${index + 1}`;
      else where += ` ${newKey} = $${index + 1} ${operator}`;
    }
  }
  if (!(Object.keys(filter).length > 0)) {
    return [sql + ` ORDER BY ${primaryId} LIMIT ${limit} OFFSET ${skip}`, sql];
  }
  plainSql = sql + where;
  where =
    !limit && !skip
      ? where
      : where + ` ORDER BY ${primaryId} LIMIT ${limit} OFFSET ${skip}`;
  return [sql + where, plainSql];
}

// export function buildInsertSqlWithPrefix(
//    tableName: string, data: Object,removeObjFromData?:string[],addObj?:[],addPrefix?:IaddPrefix)
//    : { sql: string, params: any } {
//   // let attrs = "";
//   // let paramsStr = "";
//   // let sql = `INSERT INTO ${tableName} `;
//   let snakeObject:any = data;

  
//   // 1. Remove keys
//   if(removeObjFromData && removeObjFromData.length>0){
//     removeObjFromData.forEach(e=>delete snakeObject[e]);
//   }


//   // 2. Add any manual key-value pairs
//   if(addObj && addObj.length>0 ){
//     addObj.forEach((e:{key:string,value:any})=>{
//       snakeObject[e.key]=e.value
//     })
//   }

//     // 3. Apply prefix to specific fields
//   if(addPrefix && addPrefix.fields.length>0){
//     addPrefix.fields.forEach(field => {
//       if (snakeObject[field] !== undefined) { // Ensure the key exists in snakeObject
//         snakeObject[addPrefix.prefix + field] = snakeObject[field]; // Create a new key with the prefix
//           delete snakeObject[field]; // Remove the old key
//       }
//   });
//   }
//     // 4. Build the insert SQL with SQL Server-style parameters
//     const fields = Object.keys(snakeObject);
//     const paramsStr = fields.map(field => `@${field}`).join(', ');
//     const attrs = fields.join(', ');
  
//     const sql = `INSERT INTO ${tableName} (${attrs}) VALUES (${paramsStr})`;
 
//   const params: any[] = [];
//   // let counter = 0;
//   // for (const [k, v] of Object.entries(snakeObject)) {
//   //   attrs = attrs + `${k},`;
//   //   paramsStr = paramsStr + `$${++counter},`;
//   //   params.push(v);
//   // }
//   // sql += `(${attrs.slice(0, -1)})` + " VALUES " + `(${paramsStr.slice(0, -1)})`;
//   // //sql += ` OUTPUT INSERTED.*;`;

//   return { sql, params:snakeObject };
// }

type IAddPrefix = {
  prefix: string;
  fields: string[];
};

export function buildInsertSqlWithPrefix(
  tableName: string,
  data: Record<string, any>,
  removeKeys: string[] = [],
  addExtra?: { key: string; value: any }[],
  prefixFields?: IAddPrefix
): { sql: string; params: Record<string, any> } {
  // Step 1: Clone original data
  const processedData: Record<string, any> = { ...data };

  // Step 2: Remove unwanted keys
  for (const key of removeKeys) {
    delete processedData[key];
  }

  // Step 3: Add extra keys if any
  if (addExtra) {
    for (const { key, value } of addExtra) {
      processedData[key] = value;
    }
  }

  // Step 4: Apply prefix to specific fields
  if (prefixFields?.fields?.length) {
    for (const field of prefixFields.fields) {
      if (field in processedData) {
        processedData[prefixFields.prefix + field] = processedData[field];
        delete processedData[field];
      }
    }
  }

  // Step 5: Build columns and parameterized SQL
  const keys = Object.keys(processedData);
  const columns = keys.join(', ');
  const values = keys.map(k => `@${k}`).join(', ');

  const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${values})`;
  return { sql, params: processedData };
}