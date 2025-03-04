import { toSnakeKeys } from "keys-transform";
import lo from "lodash";
import { ISqlBuilderResult } from "../types/interfaces/sql-builder.interface";

/**
 * build where condition dynamically
 */
export function buildWhereSql(
  sql: string,
  filter: Object,
  skip: number,
  limit: number,
  injectionFilter: Function,
  operator: "AND" | "OR" = "AND"
): ISqlBuilderResult {
  let where: string = " WHERE";
  let params: any[] = [];
  let index = 0;
  for (let [key, value] of Object.entries(filter)) {
    const newKey = injectionFilter(key);
    if (index === lo.size(filter) - 1) where += ` ${newKey} = $${index + 1}`;
    else where += ` ${newKey} = $${index + 1} ${operator}`;
    params.push(value);
    index++;
  }
  sql += where;
  sql += ` ORDER BY id ASC LIMIT $${lo.size(filter) + 1} OFFSET $${lo.size(filter) + 2};`;
  params.push(limit, skip);
  return { sql, params };
}

/**
 * build aggregate where condition dynamically
 */
export function buildWhereAggrSql(
  sql: string,
  filter: Object,
  injectionFilter: Function,
  operator: "AND" | "OR" = "AND"
): ISqlBuilderResult {
  let where: string = " WHERE";
  let params: any[] = [];
  let index = 0;
  for (let [key, value] of Object.entries(filter)) {
    const newKey = injectionFilter(key);
    if (index === lo.size(filter) - 1) where += ` ${newKey} = $${index + 1}`;
    else where += ` ${newKey} = $${index + 1} ${operator}`;
    params.push(value);
    index++;
  }
  sql += where + ";";
  return { sql, params };
}

/**
 * build insert statement dynamically
 */
export function buildInsertSql(tableName: string, data: Object): ISqlBuilderResult {
  let attrs = "";
  let paramsStr = "";
  let sql = `INSERT INTO ${tableName} `;
  const snakeObject = toSnakeKeys(data);
  const params: any[] = [];
  let counter = 0;
  for (const [k, v] of Object.entries(snakeObject)) {
    attrs = attrs + `${k},`;
    paramsStr = paramsStr + `$${++counter},`;
    params.push(v);
  }
  sql += `(${attrs.slice(0, -1)})` + " VALUES " + `(${paramsStr.slice(0, -1)})`;
  sql += ` RETURNING *;`;

  return { sql, params };
}

/**
 * build update statement dynamically
 * for updating a single row by id
 */
export function buildUpdateSql(tableName: string, id: number, data: Object): ISqlBuilderResult {
  let attrs = "";
  let sql = `UPDATE ${tableName} SET `;
  const snakeObject = toSnakeKeys(data);
  const params: any[] = [];
  let counter = 0;
  for (const [k, v] of Object.entries(snakeObject)) {
    attrs += `${k} = $${++counter},`;
    params.push(v);
  }
  sql += attrs.slice(0, -1);
  sql += ` WHERE id = $${++counter}`;
  sql += ` RETURNING *;`;
  params.push(id);

  return { sql, params };
}

/**
 * Build update with where SQL dynamically
 */
export function buildUpdateWithWhereSql(tableName: string, whereData: Object, updateData: Object): ISqlBuilderResult {
  let attrs = "";
  let sql = `UPDATE ${tableName} SET `;
  const snakeUpdateDate = toSnakeKeys(updateData);
  const snakeWhereData = toSnakeKeys(whereData);
  const params: any[] = [];
  let counter = 0;
  for (const [k, v] of Object.entries(snakeUpdateDate)) {
    attrs += `${k} = $${++counter},`;
    params.push(v);
  }
  sql += attrs.slice(0, -1);
  let where = " WHERE ";
  for (const [k, v] of Object.entries(snakeWhereData)) {
    where += `${k} = $${++counter} AND `;
    params.push(v);
  }
  sql += where.slice(0, -4);
  sql += ` RETURNING *;`;
  return { sql, params };
}
export function buildInsertMultipleRow(tableName: string, data: object[], jsonField?: any) {
  let sql = `INSERT INTO ${tableName}`;
  let sqlKeys = Object.keys(toSnakeKeys(data[0]));
  let keysList = ``;
  for (const [i, e] of sqlKeys.entries()) {
    if (i == 0) {
      keysList = keysList + `(${e},`;
    } else if (i == sqlKeys.length - 1) {
      keysList = keysList + `${e})`;
    } else {
      keysList = keysList + `${e},`;
    }
  }

  sql = sql + "" + keysList + "" + "VALUES" + "";

  let start = 1;
  const params = [];
  let parameterList = ``;
  for (const [index, element] of data.entries()) {
    let keys = Object.keys(element);
    let v = ``;
    for (const [i, e] of keys.entries()) {
      if (i == 0) {
        v = v + `($${start},`;
        start++;
      } else if (i == keys.length - 1) {
        v = v + `$${start})`;
        start++;
      } else {
        v = v + `$${start},`;
        start++;
      }
      //@ts-ignore
      jsonField.length > 0 && jsonField.includes(e)
        ? //@ts-ignore
          params.push(JSON.stringify(element[e]))
        : //@ts-ignore
          params.push(element[e]);
    }
    if (index == data.length - 1) {
      parameterList = parameterList + "" + v;
    } else {
      parameterList = parameterList + "" + v + ",";
    }
  }

  sql = sql + parameterList + "" + "returning * ;";

  return { sql, params };
}

/**
 * @param  {string} tempTableName (target table name)
 * @param  {string} mainTableName
 * @param  {number} samityId
 * @param  {any} mainTable
 * @param  {any} tempTable
 * @param  {string} nameOfThePrimaryId
 * @param  {string} returningValue
 * @param  {any} dataChange
 * @param  {any} whereCondition
 */
export function buildTempToMainSql(
  tempTableName: string,
  mainTableName: string,
  samityId: number,
  mainTable: any,
  tempTable: any,
  nameOfThePrimaryId: string,
  returningValue: string,
  dataChange: any,
  whereCondition: any
): {
  sql: string;
  // params: any[];
} {
  let attrs = "";
  let mainTableKeys = [...mainTable];
  let tempTableKeys = [...tempTable];
  let sql = `INSERT INTO ${mainTableName}`;
  let cString = ``;
  for (const [index, value] of mainTableKeys.entries()) {
    if (index === 0) {
      cString += `${value}`;
    } else {
      cString += `,` + `${value}`;
    }
  }
  let selectSql = `SELECT `;
  let counter = 1;
  for (const element of dataChange) {
    if (tempTableKeys.includes(element)) {
      const indexOfStatus = tempTableKeys.indexOf(element);
      tempTableKeys[indexOfStatus] = `$${counter}`;
      counter = counter + 1;
    }
  }

  for (const [index, value] of tempTableKeys.entries()) {
    if (index === 0) {
      selectSql += `${value}`;
    } else {
      selectSql += `,` + `${value}`;
    }
  }
  // for (const [index, value] of tempTableKeys.entries()) {
  //   if (index === 0) {
  //     selectSql += `${toSnakeCase(value)}`;
  //   } else {
  //     selectSql += `,` + `${toSnakeCase(value)}`;
  //   }
  // }

  sql += `(${cString}) `;
  sql += `${selectSql} `;
  sql += `FROM ${tempTableName} `;
  // sql += `WHERE ${nameOfThePrimaryId}=$${counter}`;
  for (const [index, value] of whereCondition.entries()) {
    if (index == 0) {
      sql += `WHERE ${value}=$${counter} `;
      counter = counter + 1;
    } else {
      sql += `AND  ${value}=$${counter}`;
      counter = counter + 1;
    }
  }
  sql += ` RETURNING ${returningValue} ;`;
  return { sql };
}
