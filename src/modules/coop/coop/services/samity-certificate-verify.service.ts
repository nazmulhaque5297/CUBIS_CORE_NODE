/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-05-23 10:31:59
 * @modify date 2022-05-23 10:31:59
 * @desc [description]
 */

import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";

@Service()
export class SamityCertificateVerifyService {
  constructor() {}

  async get(samityId: number) {
    const query = `select 
                    a.document_name 
                   from coop.samity_document a 
                   inner join master.document_type b on b.id = a.document_id 
                   where a.samity_id = $1 and b.doc_type = 'SMC'`;

    const params = [samityId];

    const {
      rows: [document],
    } = await (await pgConnect.getConnection()).query(query, params);

    return document?.document_name || null;
  }
}
