import { toCamelKeys } from "keys-transform";
import { Pool, PoolClient } from "pg";
import { BadRequestError, buildInsertSql, buildUpdateSql } from "rdcd-common";
import Container, { Service } from "typedi";
import db from "../../../db/connection.db";
import { numberToWord } from "../../../utils/eng-to-bangla-digit";

@Service()
export class TransactionApplicationService {
  constructor() {}
  async createTransactionApplication(data: any) {
    const pool = await db.getConnection("master");
    try {
      const { sql, params } = buildInsertSql("temps.transaction_application", data);

      const response = await (await pool.query(sql, params)).rows[0];
      return toCamelKeys(response) ?? null;
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }
  async rejectTransactionApplication(data: any, id: number) {
    const pool = await db.getConnection("master");
    try {
      const { sql, params } = buildUpdateSql(
        "temps.transaction_application",
        id,
        { ...data, authorizeStatus: "R" },
        "id"
      );

      const response = await (await pool.query(sql, params)).rows[0];
      return toCamelKeys(response) ?? null;
    } catch (error: any) {
      throw new BadRequestError(error);
    }
  }

  async getPendingAppliactionById(id: number) {
    const pool = db.getConnection("slave");
    const getPendingApplicationByIdSql = `select * from temps.transaction_application where id =$1`;
    const response = await (await pool.query(getPendingApplicationByIdSql, [id])).rows[0];
    return response;
  }

  async getPendingApplications(doptorId: Number, userId: Number, officeId: Number) {
    const pool = db.getConnection("slave");

    const sql = `select a.*, b.name_bn, c.project_name_bangla 
    from temps.transaction_application a
    inner join master.office_info b on a.office_id=b.id
    left join master.project_info c on a.project_id = c.id 
    where a.doptor_id =$1 and a.authorize_status = $2 and a.office_id = $3 `;

    const pendingApplications = await (await pool.query(sql, [doptorId, "P", officeId])).rows;

    const sql2 = `select glac_name from loan.glac_mst where id = $1`;

    try {
      for (let i = 0; i < pendingApplications.length; i++) {
        const transactionSets = pendingApplications[i].data.transactionSets;
        for (let j = 0; j < transactionSets.length; j++) {
          const glacName = await (await pool.query(sql2, [transactionSets[j].glacId])).rows[0]?.glac_name;
          transactionSets[j].glacName = glacName;
        }
      }
    } catch (error) {
      console.log("error", error);
    }
    return pendingApplications.filter((application) => parseInt(application.created_by) !== userId);
  }

  async checkIsGlBalanceNegative(
    glId: Number,
    drcrCode: string | null,
    tranAmmount: Number,
    officeId: Number,
    transaction: PoolClient | Pool,
    projectId: Number | undefined
  ) {
    const transactionService: TransactionApplicationService = Container.get(TransactionApplicationService);
    try {
      const glInfoSql = `SELECT id, gl_nature, glac_name         
                     FROM loan.glac_mst
                     WHERE id = $1 AND parent_child = $2`;

      const { id, gl_nature, glac_name } = await (await transaction.query(glInfoSql, [glId, "C"])).rows[0];

      if (gl_nature !== drcrCode) {
        if (gl_nature === "C") {
          const sumSql = `select COALESCE(sum(a.balance),0) as glBalance from (SELECT SUM (a.credit_amt)  -  SUM (a.debit_amt) as balance                  
          FROM loan.gl_summary a
          WHERE a.office_id = $1
          AND a.glac_id= $2 ${projectId ? "AND a.project_id = $3" : ""}
          UNION	
          SELECT SUM (
                        case
                        when b.drcr_code = 'D'
                        then b.tran_amt
                        else 0
                  end
                  )                 
                 -SUM (
                       case 
                       when b.drcr_code ='C'
                       then b.tran_amt
                       else 0
                 end
                ) as balance     
                       FROM loan.transaction_daily b
                       WHERE b.office_id = $1
                       AND b.glac_id = $2 ${projectId ? "AND b.project_id = $3" : ""}) a`;
          const { sum } = await (
            await transaction.query(sumSql, projectId ? [officeId, glId, projectId] : [officeId, glId])
          ).rows[0];
          if (Number(sum.glbalance) < Number(tranAmmount)) {
            const glName = await transactionService.getGlNameById(Number(glId));
            return {
              status: false,
              message: `অপর্যাপ্ত লেজার (${glName}) ব্যালেন্স (${numberToWord(sum.glbalance)})`,
            };
          } else {
            return {
              status: true,
              message: ``,
            };
          }
        } else if (gl_nature === "D") {
          const sumSql = `select COALESCE(sum(a.balance),0) as glBalance from (SELECT SUM (a.debit_amt)  -  SUM (a.credit_amt) as balance                  
          FROM loan.gl_summary a
          WHERE a.office_id = $1
          AND a.glac_id= $2 ${projectId ? "AND a.project_id = $3" : ""}
          UNION	
          SELECT SUM (
                        case
                        when b.drcr_code = 'D'
                        then b.tran_amt
                        else 0
                  end
                  )                 
                 -SUM (
                       case 
                       when b.drcr_code ='C'
                       then b.tran_amt
                       else 0
                 end
                ) as balance     
                       FROM loan.transaction_daily b
                       WHERE b.office_id = $1
                       AND b.glac_id = $2 ${projectId ? "AND b.project_id = $3" : ""}) a`;
          const sum = await (
            await transaction.query(sumSql, projectId ? [officeId, glId, projectId] : [officeId, glId])
          ).rows[0];
          if (Number(sum.glbalance) < Number(tranAmmount)) {
            const glName = await transactionService.getGlNameById(Number(glId));
            return {
              status: false,
              message: `অপর্যাপ্ত লেজার (${glName}) ব্যালেন্স (${numberToWord(sum.glbalance)})`,
            };
          } else {
            return {
              status: true,
              message: ``,
            };
          }
        }
      } else {
        return {
          status: true,
          message: ``,
        };
      }
    } catch (error) {
      console.log("error", error);
    }
  }

  async getGlNameById(glId: Number) {
    const pool = db.getConnection("slave");
    const sql = `select glac_name from loan.glac_mst where id = $1`;
    const glName = await (await pool.query(sql, [glId])).rows[0].glac_name;
    return glName;
  }
}
