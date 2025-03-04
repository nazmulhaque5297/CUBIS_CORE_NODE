import { toCamelKeys } from "keys-transform";
import { buildUpdateWithWhereSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";

@Service()
export class officeHeadSelects {
  constructor() {}

  async update(data: any, user: any) {
    let result;

    const transaction = await (await pgConnect.getConnection("master")).connect();

    try {
      transaction.query("BEGIN");
      // first update all office head 0
      const { sql, params } = buildUpdateWithWhereSql(
        "master.office_designation",
        {
          officeId: data.officeInfoId,
        },
        {
          isOfficeHead: 0,
        }
      );
      await transaction.query(sql, params);

      // designation base update office heaed
      const { sql: sqlData, params: paramsData } = buildUpdateWithWhereSql(
        "master.office_designation",
        {
          id: data.designationId,
        },
        {
          isOfficeHead: 1,
        }
      );
      result = await transaction.query(sqlData, paramsData);
      console.log("work", data, user, result);

      await transaction.query("COMMIT");
      return result ? toCamelKeys(result) : result;
    } catch (error) {
      console.log("error", error);
      await transaction.query("ROLLBACK");

      return undefined;
    } finally {
      transaction.release();
    }
  }
}
