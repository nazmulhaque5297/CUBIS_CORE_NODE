import { toCamelKeys, toSnakeCase } from "keys-transform";
import { isNumber } from "lodash";
import { Service } from "typedi";
import { pgConnect } from "../../../../db-coop/factory/connection.db";

@Service()
export class DocMappingServices {
  constructor() {}
  async get(d: any) {}

  async getBySamityTypeId(samityTypeId: number) {
    if (!isNumber(samityTypeId) && isNaN(samityTypeId)) return undefined;

    const sql = `
    SELECT 
      a.id,
      a.is_mandatory,
      a.mandatory_instruction,
      a.instruction_value, 
      a.type,
      b.type_name as samity_type_name,
      b.description as samity_type_description,
      c.doc_type,
      c.doc_type_desc,
      c.is_active
    FROM 
      coop.samity_doc_mapping a
    LEFT JOIN 
      coop.samity_type b ON a.samity_type_id = b.id
    LEFT JOIN 
      master.document_type c ON a.doc_type_id = c.id
    WHERE 
      samity_type_id =$1;`;

    const { rows: data } = await (await pgConnect.getConnection("slave")).query(sql, [samityTypeId]);

    return data ? toCamelKeys(data) : data;
  }

  async count(allQuery: object) {}
  filter(key: string) {
    return toSnakeCase(key);
  }
}
