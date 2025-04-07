import { toCamelKeys, toSnakeKeys } from "keys-transform";
import { BadRequestError, buildUpdateWithWhereSql } from "rdcd-common";
import { Service } from "typedi";
import { pgConnect } from "../../../../../../db-coop/factory/connection.db";

export const applicationGet: any = {
  "committee-request": {
    param: false,
    query: "SELECT * FROM coop.application",
  },
  "name-clearance": {
    param: "query",
    query: `SELECT 
               data->'samity_name' as samity_name 
            FROM coop.application 
            WHERE service_id=1 and status != 'R' AND data->'office_id'=$1 AND data->'samity_type_id'=$2`,
  },
  "name-clearance-citizen": {
    param: "user",
    query: `
    select
    a.id as application_id,
    a.samity_id,
    a.status,
    (a.data->'samity_type_id')::int as samity_type_id,
    (a.data->'office_id')::int as office_id,
    (a.data->'district_id') :: int as district_id,
    (a.data->'division_id')::int as division_id,
    a.data->'samity_name' as samity_name,
    b.name_bn as office_name,
    c.division_name_bangla,
    d.district_name_bangla,
    e.type_name as samity_type_name,
    f.id as upazila_id,
    f.upazila_name_bangla,
    h.upa_city_type 
  from
    coop.application as a
  left join master.district_info d on
    d.id = (a.data->'district_id')::int,
    master.office_info b
  left join master.upazila_info f on
    f.id = b.upazila_id
inner join master.mv_upazila_city_info h on
   f.id=h.upa_city_id
,
    master.division_info c,
    coop.samity_type e
where
    service_id = 1
and data::jsonb ? 'user_id'
and data->'user_id' = $1
and is_used = false
and b.id =(a.data->'office_id')::int
and c.id =(a.data->'division_id')::int
and e.id =(a.data->'samity_type_id')::int
order by
    application_id
            `,
  },
  "samity-registration": {
    param: false,
    query: `select a.data,b.service_name from coop.application a INNER JOIN coop.service_info b ON a.service_id= b.id where a.service_id=2`,
  },
  "pending-approval-list": {
    param: "employee",
    query: `select a.data,b.service_name from coop.application a INNER JOIN coop.service_info b ON a.service_id= b.id where a.next_app_designation_id=$1`,
  },
  "all-data-byCitizen": {
    param: "user",
    query: `select a.*, b.service_name, b.page_link, c.type_name as samity_type_name, d.name_bn as designation_name, e.name_bn as office_name from coop.application a INNER JOIN coop.service_info b ON a.service_id= b.id LEFT JOIN coop.samity_type c ON (a.data->>'samityTypeId')::int= c.id LEFT JOIN  	master.office_designation d  ON a.next_app_designation_id= d.id LEFT JOIN  	master.office_info e  ON e.id=(a.data->'office_id')::int  where 	data->'user_id' = $1
    and data->>'user_type' = 'citizen' order by a.id desc`,
  },
};

export interface data {
  officeId?: string;
  divisionId?: string;
  districtId?: string;
}

@Service()
export class PendingApprovalServices {
  async getByType(nextApproveId: number) {
    const connection = await pgConnect.getConnection("slave");

    const query = `
      select 
        a.data,
        a.id,
        a.status,
        a.samity_id,
        a.created_at,
        b.service_name,
        b.id as service_id,
        c.type_name as samity_type_name,
        d.samity_name
      from 
        coop.application a 
        INNER JOIN coop.service_info b ON a.service_id= b.id 
        LEFT JOIN coop.samity_type c ON (a.data->>'samity_type_id')::int= c.id
        Full join coop.samity_info d ON a.samity_id = d.id
        left join coop.samity_type e on d.samity_type_id = e.id
      where  a.next_app_designation_id=$1`;
    const { rows: applicationData } = await connection.query(query, [nextApproveId]);

    return applicationData
      ? toCamelKeys(
          applicationData.map((e) => {
            e.data.samity_type_name = e.samity_type_name;
            delete e.samity_type_name;
            return e;
          })
        )
      : applicationData;
  }

  async getByTypeServiceId(userId: number, nextApproveId: number) {
    const connection = await pgConnect.getConnection("slave");
    const finalResult = [];

    const query = `
    select 
    a.data,
    a.id,
    a.status,
    a.edit_enable,
    (a.data->'office_id')::int as office_id,
    a.next_app_designation_id,
    g.name_bn as designation_name,
    f.name_bn as office_name,
    a.samity_id,
    b.service_name,
    b.page_link,
    b.id as service_id,
    c.type_name as samity_type_name,
    d.samity_name
  from 
    coop.application a 
    INNER JOIN coop.service_info b ON a.service_id= b.id 
    LEFT JOIN  	master.office_info f  ON f.id=(a.data->'office_id')::int
    LEFT JOIN  	master.office_designation g  ON a.next_app_designation_id= g.id
    LEFT JOIN coop.samity_type c ON (a.data->>'samity_type_id')::int= c.id
    Full join coop.samity_info d ON a.samity_id = d.id
    left join coop.samity_type e on d.samity_type_id = e.id
      where data::jsonb ? 'user_id' and data->'user_id'=$1 and edit_enable= true and a.next_app_designation_id=$2 and a.service_id = 16`;

    const { rows: applicationData } = await connection.query(query, [userId, nextApproveId]);

    if (applicationData) {
      for (const element of applicationData) {
        const approvalQueryText = `	SELECT a.id,
                                       a.service_action_id ,
                                       a.remarks,
                                       arr.item_object->>'action_text' as action_text
                                    FROM coop.application_approval a,
                                         coop.service_info b,jsonb_array_elements(b.service_action) 
                                         with ordinality arr(item_object, position) 
                                    WHERE application_id=$1 and b.id=$2
                                    and arr.position= a.service_action_id ORDER BY a.id desc limit 1`;
        const aprovalData = await (
          await (
            await pgConnect.getConnection("slave")
          ).query(approvalQueryText, [element.application_id, element.service_id])
        ).rows[0];

        aprovalData
          ? finalResult.push({
              applicationData: element,
              applicationApprovalData: aprovalData,
            })
          : finalResult.push({
              applicationData: element,
              applicationApprovalData: {
                id: null,
                service_action_id: null,
                action_text: "আবেদন করা হয়েছে ",
              },
            });
      }
    }

    return finalResult ? finalResult : [];
  }

  async getByServiceId(officeId: number, serviceId: number) {
    const connection = await pgConnect.getConnection("slave");

    let query = "";

    if (serviceId == 1) {
      query = `SELECT
      a.data->> 'samity_name' AS SAMITY_NAME,
      a.data->> 'samity_level' AS SAMITY_LEVEL,
    TO_CHAR(a.CREATED_AT::date,'dd/mm/yyyy') AS CREATE_DATE,
      B.TYPE_NAME,
      C.NAME
  FROM COOP.APPLICATION A
  LEFT JOIN COOP.SAMITY_TYPE B ON (a.data->> 'samity_type_id')::int = B.ID
  LEFT JOIN USERS.user C ON (a.data->> 'user_id')::int = C.ID
  WHERE (a.data->> 'office_id')::int = $1 AND STATUS = 'P'
      AND SERVICE_ID = $2`;
    } else {
      query = `SELECT B.SAMITY_NAME,
    B.SAMITY_CODE,
    B.SAMITY_LEVEL,
    TO_CHAR(B.CREATED_AT::date,'dd/mm/yyyy') AS CREATE_DATE,
    C.TYPE_NAME,
    D.NAME
  FROM COOP.APPLICATION A
  LEFT JOIN COOP.SAMITY_INFO B ON B.ID = A.SAMITY_ID
  LEFT JOIN COOP.SAMITY_TYPE C ON C.ID = B.SAMITY_TYPE_ID
  INNER JOIN USERS.USER D ON D.ID = A.CREATED_BY::int
  WHERE B.OFFICE_ID = $1
  AND A.STATUS = 'P'
  AND A.SERVICE_ID = $2`;
    }

    const applicationData = await (
      await (await pgConnect.getConnection("slave")).query(query, [officeId, serviceId])
    ).rows;

    return applicationData.length > 0 ? toCamelKeys(applicationData) : [];
  }

  async getByDivisionSamitee(officeId: number) {
    const connection = await pgConnect.getConnection("slave");

    let query = "";

    query = `SELECT
      DIVISION_NAME_BANGLA,
      COUNT(DISTINCT CASE WHEN SAMITY_LEVEL = 'P' THEN A.ID ELSE NULL END) AS PRIMARY_SAMITY_APPROVE,
      COUNT(DISTINCT CASE WHEN SAMITY_LEVEL = 'P' THEN C.ID ELSE NULL END) AS PRIMARY_SAMITY_MEMBER,
      COUNT(DISTINCT CASE WHEN SAMITY_LEVEL = 'C' THEN A.ID ELSE NULL END) AS KENDRIO_SAMITY_APPROVE,
      COUNT(DISTINCT CASE WHEN SAMITY_LEVEL = 'C' THEN C.ID ELSE NULL END) AS KENDRIO_SAMITY_MEMBER,
      COUNT(DISTINCT CASE WHEN SAMITY_LEVEL = 'N' THEN A.ID ELSE NULL END) AS NATIONAL_SAMITY_APPROVE,
      COUNT(DISTINCT CASE WHEN SAMITY_LEVEL = 'N' THEN C.ID ELSE NULL END) AS NATIONAL_SAMITY_MEMBER
  FROM COOP.SAMITY_INFO A
  INNER JOIN MASTER.DIVISION_INFO B ON A.SAMITY_DIVISION_ID = B.ID
  LEFT JOIN COOP.MEMBER_INFO C ON C.SAMITY_ID = A.ID
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
  )
  GROUP BY DIVISION_NAME_BANGLA`;

    const applicationData = await (await (await pgConnect.getConnection("slave")).query(query, [officeId])).rows;

    return applicationData.length > 0 ? toCamelKeys(applicationData) : [];
  }

  async getPendingListByCitizen(userId: number) {
    const finalResult = [];
    const applicationQueryText = `SELECT 
      a.id as application_id,
      a.samity_id,
      a.status,
      a.edit_enable,
     (a.data->'samity_type_id')::int as samity_type_id,
     (a.data->'office_id')::int as office_id,
     (a.data->'district_id') :: int as district_id,
     (a.data->'division_id')::int as division_id,
      a.data->'samity_name'as samity_name,
      a.data->'samity_level'as samity_level,
      a.next_app_designation_id,
      b.name_bn as office_name,c.division_name_bangla,
      d.district_name_bangla,
      e.type_name as samity_type_name,
      a.service_id,
      f.service_name,
      f.page_link,
      g.name_bn
    FROM coop.application as a
    INNER JOIN  	master.office_info b  ON b.id=(a.data->'office_id')::int
    INNER JOIN master.division_info c ON c.id=(a.data->'division_id')::int
    INNER JOIN master.district_info d ON d.id= (a.data->'district_id')::int
    INNER JOIN  coop.samity_type e ON e.id=(a.data->'samity_type_id')::int
    INNER JOIN coop.service_info f ON a.service_id= f.id
    INNER JOIN  	master.office_designation g  ON a.next_app_designation_id= g.id
    WHERE data::jsonb ? 'user_id' and data->'user_id'=$1 and edit_enable= true
    order by a.id`;

    const applicationData = await (
      await (await pgConnect.getConnection("slave")).query(applicationQueryText, [userId.toString()])
    ).rows;

    if (applicationData) {
      for (const element of applicationData) {
        const approvalQueryText = `	SELECT a.id,
                                       a.service_action_id ,
                                       a.remarks,
                                       arr.item_object->>'action_text' as action_text
                                    FROM coop.application_approval a,
                                         coop.service_info b,jsonb_array_elements(b.service_action) 
                                         with ordinality arr(item_object, position) 
                                    WHERE application_id=$1 and b.id=$2
                                    and arr.position= a.service_action_id ORDER BY a.id desc limit 1`;
        const aprovalData = await (
          await (
            await pgConnect.getConnection("slave")
          ).query(approvalQueryText, [element.application_id, element.service_id])
        ).rows[0];

        aprovalData
          ? finalResult.push({
              applicationData: element,
              applicationApprovalData: aprovalData,
            })
          : finalResult.push({
              applicationData: element,
              applicationApprovalData: {
                id: null,
                service_action_id: null,
                action_text: "আবেদন করা হয়েছে ",
              },
            });
      }
    }

    return finalResult ? finalResult : [];
  }

  async delete(id: number) {
    const transaction = await (await pgConnect.getConnection("master")).connect();

    try {
      await transaction.query("BEGIN");
      const { sql, params } = buildUpdateWithWhereSql("coop.application", { id }, { status: "R" });
      const deleteResult = await (await transaction.query(sql, params)).rows[0];
      await transaction.query("COMMIT");
      return deleteResult;
    } catch (ex) {
      await transaction.query("ROLLBACK");
      throw new BadRequestError("আবেদনটি বাতিল হয়নি!");
    } finally {
      transaction.release();
    }
  }

  // create query based on data column in application table

  async queryBasedOnData(columnName: string, whereCondition: data[]) {
    let query = `SELECT ${columnName} from coop.application`;
    let data = [];
    if (whereCondition) {
      for (const [index, value] of whereCondition.entries()) {
        const key = Object.keys(toSnakeKeys(value));
        data.push(Object.values(value)[0]);

        if (index == 0) {
          query += ` WHERE data->'${key}'=$${index + 1}`;
        } else {
          query += ` AND data->'${key}'=$${index + 1}`;
        }
      }
    }

    const result = (await (await pgConnect.getConnection("slave")).query(query, data)).rows;

    return result.length > 0 ? true : false;
  }

  async getByServiceSamityId(samityId: any, doptorId: number, serviceId: number) {
    const sql = `SELECT *FROM COOP.APPLICATION WHERE SAMITY_ID = $1
    AND DOPTOR_ID = $2
    AND SERVICE_ID = $3
    AND STATUS NOT IN ($4, $5)`;

    const result = (
      await (await pgConnect.getConnection("slave")).query(sql, [samityId, doptorId, serviceId, "A", "R"])
    ).rows[0];
    return result ? toCamelKeys(result) : {};
  }
}
