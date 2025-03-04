import { toCamelKeys } from "keys-transform";
import { buildInsertSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";

@Service()
export class EmployeeSalaryService {
  constructor() { }

  async create(data: any) {
    const transaction = await (await pgConnect.getConnection("master")).connect();
    try {
      transaction.query("BEGIN");
      const result = [];
      for (let salry of data.salaries) {
        // const singleSalary = Object.assign({...salry})

        const { sql, params } = buildInsertSql("coop.employee_salary", {
          ...salry,
          salaryMonthYear: data.salary_month_year,
          createdAt: data.createdAt,
          createdBy: data.createdBy,
        });


        const d = (await transaction.query(sql, params)).rows[0];
        result.push(d);
      }

      transaction.query("COMMIT");

      return result ? toCamelKeys(result) : result;
    } catch (error) {
      transaction.query("ROLLBACK");
    } finally {
      transaction.release();
    }
  }

  async getSalaryByYearmont(yearMonth: number) {
    const sql = `select count (id) from coop.employee_salary where salary_month_year = $1`;
    const result = await (await (await pgConnect.getConnection("slave")).query(sql, [yearMonth])).rows[0].count;
    return result > 0 ? true : false;
  }
}
