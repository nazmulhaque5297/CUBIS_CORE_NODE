/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-02-17 17:11:11
 * @modify date 2022-02-17 17:11:11
 * @desc [description]
 */

import { toCamelKeys } from "keys-transform";
import { Service } from "typedi";
import db from "../../../db/connection.db";

@Service()
export class UserRoleFeatures {
  // get role based features or menu
  async getRoleFeature(role: number, componentId: number): Promise<any | undefined> {
    const sql = `
        SELECT 
            c.id,  
            c.feature_name,
            c.feature_name_ban,
            c.url,
            c.is_root,
            c.type,
            c.position,
            c.icon_id,
            c.parent_id
        FROM 
            users.role a 
            inner join users.role_feature b on b.role_id = a.id
            inner join users.feature c on c.id = b.feature_id
        WHERE
            a.id = $1 and a.component_id = $2;`;
    const pool = await db.getConnection();
    const result = (await pool.query(sql, [role, componentId])).rows;
    var allData: any[] = [];
    var roots: any[] = result.filter((result) => result.is_root == true);
    var children: any[] = [];
    var childOfChild: any[] = [];

    for (const [i, v] of roots.entries()) {
      allData.push(v);
      children = result.filter((result) => result.parent_id == v.id);
      allData[i].child = children;
      for (const [ci, cv] of allData[i].child.entries()) {
        childOfChild = result.filter((result) => result.parent_id == cv.id);
        if (childOfChild.length > 0) allData[i].child[ci].childOfChild = childOfChild;
      }
    }

    return allData ? toCamelKeys(allData) : undefined;
  }

  async getRoleIdByName(name: string, componentId: number): Promise<number> {
    const sql = `
        SELECT 
            id
        FROM 
            users.role
        WHERE
            role_name = $1 and component_id = $2;`;
    const {
      rows: [{ id }],
    } = await (await db.getConnection("slave")).query(sql, [name, componentId]);
    return id;
  }
}
