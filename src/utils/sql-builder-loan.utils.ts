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
  sql += ` ORDER BY id ASC LIMIT $${lo.size(filter) + 1} OFFSET $${
    lo.size(filter) + 2
  };`;
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
export function buildInsertSql(
  tableName: string,
  data: Object
): ISqlBuilderResult {
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

export function buildUpsertSql(
  tableName: string,
  primaryKey: string,
  data: Object,
  updateFields?: {},
  removeFromUpdateFields?: Array<string>
) {
  let attrs = "";
  let paramsStr = "";

  let insertQuery = `INSERT INTO ${tableName} `;

  const snakeObject = toSnakeKeys(data);
  const params: any[] = [];

  let counter = 0;

  for (const [k, v] of Object.entries(snakeObject)) {
    attrs = attrs + `${k},`;
    paramsStr = paramsStr + `$${++counter},`;
    params.push(v);
  }

  insertQuery +=
    `(${attrs.slice(0, -1)})` + " VALUES " + `(${paramsStr.slice(0, -1)})`;

  const conflictQuery = ` ON CONFLICT (${primaryKey}) DO `;

  let updateQuery = `UPDATE SET `;
  let updateAttrs = "";

  let updateObject = data;
  delete updateObject[primaryKey as keyof Object];

  removeFromUpdateFields?.map((field) => {
    delete updateObject[field as keyof Object];
  });

  updateObject = { ...updateObject, ...updateFields };
  let updateCounter = 1;

  for (const [k, v] of Object.entries(toSnakeKeys(updateObject))) {
    updateAttrs += `${k} = $${++updateCounter},`;
  }

  updateQuery += updateAttrs.slice(0, -1);

  return {
    sql: insertQuery + conflictQuery + updateQuery,
    params,
  };
}

/**
 * build update statement dynamically
 * for updating a single row by id
 */
export function buildUpdateSql(
  tableName: string,
  id: number,
  data: Object
): ISqlBuilderResult {
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
export function buildUpdateWithWhereSql(
  tableName: string,
  whereData: Object,
  updateData: Object
): ISqlBuilderResult {
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
