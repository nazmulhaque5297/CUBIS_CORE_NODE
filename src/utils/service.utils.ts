// 

import { ConnectionPool } from "mssql";
import { toSnakeKeys } from "keys-transform";

export const isExistsByColumn = async (
  columnName: string,
  tableName: string,
  connection: ConnectionPool,
  whereCondition: Object = {}
): Promise<boolean> => {
  let queryText = `SELECT COUNT(${columnName}) AS count FROM ${tableName}`;
  let count = 1;
  const keys = Object.keys(whereCondition);
  const values = Object.values(whereCondition);

  if (whereCondition && keys.length > 0) {
    for (const [index, key] of keys.entries()) {
      if (index === 0) {
        queryText = queryText + ` WHERE ${key} = @${count}`;
      } else {
        queryText = queryText + ` AND ${key} = @${count}`;
      }
      count++;
    }
  }

  // Prepare the query and execute it with the correct parameterization
  const request = connection.request();

  // Add parameters dynamically based on the keys and values
  keys.forEach((key, index) => {
    request.input(`${index + 1}`, values[index]);
  });

  try {
    const result = await request.query(queryText);
    const countResult = result.recordset[0].count;
    return countResult >= 1;
  } catch (error) {
    console.error("Error executing query:", error);
    return false;
  }
};
