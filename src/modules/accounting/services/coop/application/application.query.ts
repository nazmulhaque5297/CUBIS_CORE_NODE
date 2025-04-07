import Container from "typedi";
import { pgConnect } from "../../../../../../db-coop/factory/connection.db";
import { ApplicationServices } from "../../application.service";

const ApplicationService = Container.get(ApplicationServices);

export const getPendingListByCitizen = async (userId: number) => {
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
    WHERE data::jsonb ? 'user_id' and data->'user_id'=$1 and edit_enable= true`;

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
};

export const applicationQuery: any = {
  all: {
    param: false,
    query: "SELECT * FROM coop.application",
    approvalFunction: false,
    reqQuery: true,
    dataQuery: true,
    whereCondition: {
      exist: false,
      parameter: 0,
    },
  },

  "committee-request": {
    param: false,
    query: "SELECT * FROM coop.application",
  },
  "name-clearance": {
    serviceNameEnglish: "name_clearance",
    param: ["service_id", "doptor_id"],
    query: `SELECT 
                 data->'samity_name' as samity_name 
              FROM coop.application 
              WHERE service_id=$1 and doptor_id=$2 `,
    approvalFunction: false,
    reqQuery: false,
    whereCondition: {
      exist: true,
      parameter: 0,
    },
  },
  "name-clearance-citizen": {
    serviceNameEnglish: "name_clearance",
    param: ["serviceId", "citizen", "doptorId"],
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
     f.id=h.upa_city_id,
      master.division_info c,
      coop.samity_type e
  where
      service_id = $1
  and a.doptor_id = $3
  and data->'user_id' = $2
  and data->>'user_type'='citizen'
  and is_used = false
  and b.id =(a.data->'office_id')::int
  and c.id =(a.data->'division_id')::int
  and e.id =(a.data->'samity_type_id')::int`,
    approvalFunction: false,
    reqQuery: true,
    whereCondition: {
      exist: true,
      parameter: 3, //if need new condition with enhance then parameter base increase
    },
  },

  "name-clearance-dashboard": {
    serviceNameEnglish: "name_clearance",
    param: ["citizen", "serviceId", "doptorId"],
    query: `SELECT 
    a.id ,
    a.samity_id,
    a.status,
    a.edit_enable,
   (a.data->'samity_type_id')::int as samity_type_id,
   (a.data->'office_id')::int as office_id,
   (a.data->'district_id') :: int as district_id,
   (a.data->'division_id')::int as division_id,
    (a.data->'samity_name')as samity_name,
    (a.data->'samity_level')as samity_level,
    a.next_app_designation_id,
    a.created_at,
    b.name_bn as office_name,c.division_name_bangla,
    d.district_name_bangla,
    e.type_name as samity_type_name,
    a.service_id,
    f.service_name,
    f.page_link,
    g.name_bn
  FROM coop.application as a
  left JOIN  	master.office_info b  ON b.id=(a.data->'office_id')::int
  left JOIN master.division_info c ON c.id=(a.data->'division_id')::int
  left JOIN master.district_info d ON d.id= (a.data->'district_id')::int
  left JOIN  coop.samity_type e ON e.id=(a.data->'samity_type_id')::int
  left JOIN coop.service_info f ON a.service_id= f.id
  left JOIN  	master.office_designation g  ON a.next_app_designation_id= g.id
  WHERE 
   data->'user_id'=$1 
   and data->>'user_type'='citizen' 
   and a.service_id=$2
   and a.doptor_id=$3
   order by a.id
              `,
    approvalFunction: true,
    reqQuery: false,
    whereCondition: {
      exist: true,
      parameter: 1,
    },
  },
  "samity-registration": {
    param: false,
    query: `select a.data,b.service_name from coop.application a INNER JOIN coop.service_info b ON a.service_id= b.id where a.service_id=2`,
  },
  "pending-approval-list": {
    serviceNameEnglish: false,
    param: ["designationId"],
    query: `SELECT
              a.data,
              a.id,
              a.status,
              a.samity_id,
              a.created_at,
              b.service_name,
              b.id AS service_id,
              c.type_name AS samity_type_name,
              d.samity_name,
              d.is_manual
            FROM
              coop.application a
            INNER JOIN coop.service_info b ON
              a.service_id = b.id
            FULL JOIN coop.samity_info d ON
              a.samity_id = d.id
            LEFT JOIN coop.samity_type c ON
              d.samity_type_id = c.id
              OR (a.data->>'samity_type_id')::int = c.id
              OR (a.data->'samity_info'->>'samity_type_id')::int = c.id
            LEFT JOIN coop.samity_type e ON
              d.samity_type_id = e.id
            WHERE
              a.next_app_designation_id = $1 `,
    approvalFunction: false,
    reqQuery: false,

    whereCondition: {
      exist: true,
      parameter: 1,
    },
  },

  // there is some change if we need to more then please see application/pending-approval-list/serviceId
  "pending-approval-list-user": {
    serviceNameEnglish: false,
    param: ["user"],
    query: `select 
              a.id,
              a.data,
              a.status,
              a.edit_enable,
              (a.data->'office_id')::int as office_id,
              a.next_app_designation_id,
              a.created_at,
              g.name_bn as designation_name,
              f.name_bn as office_name,
              a.samity_id,
              b.service_name,
              b.page_link,
              b.id as service_id,
              c.type_name as samity_type_name,
              d.samity_name,
              d.samity_level
            from 
              coop.application a 
              INNER JOIN coop.service_info b ON a.service_id= b.id 
              LEFT JOIN  master.office_info f  ON f.id=(a.data->'office_id')::int
              LEFT JOIN  master.office_designation g  ON a.next_app_designation_id= g.id
              LEFT JOIN coop.samity_type c ON (a.data->>'samity_type_id')::int= c.id
              Full join coop.samity_info d ON a.samity_id = d.id
              left join coop.samity_type e on d.samity_type_id = e.id  
            where 
            data->'user_id' = $1
            and data->>'user_type'='user'`,
    approvalFunction: true,
    reqQuery: false,

    whereCondition: {
      exist: true,
      parameter: 1,
    },
  },
  "all-data-byCitizen": {
    serviceNameEnglish: false,
    param: ["citizen"],
    query: `select
            	a.*,
            	b.service_name,
            	b.page_link,
            	c.type_name as samity_type_name,
            	d.name_bn as designation_name,
            	e.name_bn as office_name,
              f.samity_level, 
              f.samity_name
            from
            	coop.application a
            inner join coop.service_info b on
            	a.service_id = b.id
            left join coop.samity_type c on
            	(a.data->>'samityTypeId')::int = c.id
            left join master.office_designation d on
            	a.next_app_designation_id = d.id
            left join master.office_info e on
            	e.id =(a.data->'office_id')::int
            left join coop.samity_info f on a.samity_id=f.id
            where
            	data->'user_id' = $1
              and data->>'user_type' = 'citizen'
            order by
            	a.id desc`,
    approvalFunction: true,
    reqQuery: false,

    whereCondition: {
      exist: false,
      parameter: 1,
    },
  },

  "pending-approval-list-citizen": {
    param: "citizen",
    query: `SELECT 
    a.id as application_id,
    a.samity_id,
    a.status,
    a.edit_enable,
   (a.data->'samity_type_id')::int as samity_type_id,
   (a.data->'office_id')::int as office_id,
   (a.data->'district_id') :: int as district_id,
   (a.data->'division_id')::int as division_id,
    (a.data->'samity_name')::text as samity_name,
    (a.data->'samity_level')::text as samity_level,
    a.next_app_designation_id,
    b.name_bn as office_name,c.division_name_bangla,
    d.district_name_bangla,
    e.type_name as samity_type_name,
    a.service_id,
    f.service_name,
    f.page_link,
    g.name_bn
  FROM coop.application as a
  left JOIN  	master.office_info b  ON b.id=(a.data->'office_id')::int
  left JOIN master.division_info c ON c.id=(a.data->'division_id')::int
  left JOIN master.district_info d ON d.id= (a.data->'district_id')::int
  left JOIN  coop.samity_type e ON e.id=(a.data->'samity_type_id')::int
  left JOIN coop.service_info f ON a.service_id= f.id
  left JOIN  	master.office_designation g  ON a.next_app_designation_id= g.id
  WHERE 
   data->'user_id'=$1 
   and data->>'user_type'='citizen' 
   and edit_enable= true
   order by a.id`,
    approvalFunction: true,
    reqQuery: false,
    whereCondition: {
      exist: true,
      parameter: 1,
    },
  },
};

export async function approvalData(applicationData: any) {
  const finalResult = [];

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

  return finalResult ? finalResult : [];
}

//if any query need any extra field to add

export const queryEnhance = (reqQuery: any, query: string, whereCondition: any) => {
  let returnQuery = query;
  const keys = Object.keys(reqQuery);
  const value = Object.values(reqQuery);

  if (whereCondition.exist) {
    const count = whereCondition.parameter;
    for (const element of keys) {
      returnQuery = returnQuery + ` and ${element}=$${count + 1}`;
    }
  } else {
    for (const [index, element] of keys.entries()) {
      index == 0
        ? (returnQuery = returnQuery + ` where ${element}=$${index + 1} `)
        : (returnQuery = returnQuery + ` and ${element}=$${index + 1} `);
    }
  }

  return { sql: returnQuery, params: value };
};
