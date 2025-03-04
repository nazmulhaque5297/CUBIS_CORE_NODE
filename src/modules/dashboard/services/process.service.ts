/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-04-13 14:53:52
 * @modify date 2022-04-13 14:53:52
 * @desc [description]
 */

import { toCamelKeys } from "keys-transform";
import { Service } from "typedi";
import db from "../../../db/connection.db";
import { ComponentType } from "../../../interfaces/component.interface";
import { Dashboard } from "./dashboard.service";

@Service()
export class ProcessService extends Dashboard {
  constructor(component: ComponentType) {
    super(component);
  }
  async getProcessByType(type: String) {
    const pool = await db.getConnection("slave");
    const sql = `select * from loan.process_info where process_name = $1`;
    const process = (await pool.query(sql, [type])).rows[0];
    return process.id ? toCamelKeys(process) : null;
  }
}
