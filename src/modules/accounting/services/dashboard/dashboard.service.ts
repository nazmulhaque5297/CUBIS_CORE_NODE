import { toCamelKeys } from "keys-transform";
import { Service } from "typedi";
import { pgConnect } from "../../../../../db-coop/factory/connection.db";

@Service()
export class dashboardDatas {
  constructor() {}

  async getDashboardData(officeId: number) {
    let result;
    const sql = `SELECT
    COUNT(a.id) AS PRIMARY_SAMITY_APPROVE
    FROM COOP.SAMITY_INFO A
    INNER JOIN MASTER.DIVISION_INFO B ON A.SAMITY_DIVISION_ID = B.ID
    WHERE A.SAMITY_LEVEL IN ('P', 'C', 'N')
    AND A.OFFICE_ID IN (
        SELECT DISTINCT ID
        FROM (
            WITH RECURSIVE RECURSIVE_CTE AS (
                SELECT ID, PARENT_ID
                FROM MASTER.OFFICE_INFO
                WHERE ID = $1
                UNION ALL
                SELECT CHILD.ID, CHILD.PARENT_ID
                FROM MASTER.OFFICE_INFO CHILD
                JOIN RECURSIVE_CTE PARENT ON CHILD.PARENT_ID = PARENT.ID
            )
            SELECT ID
            FROM RECURSIVE_CTE
        ) AS FilteredOfficeIDs
    )`;

    result = (await (await pgConnect.getConnection("slave")).query(sql, [officeId])).rows[0];
    console.log({ result });
    return result ? toCamelKeys(result) : result;
  }
}
