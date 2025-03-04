import Container, { Service } from "typedi";

import { toCamelKeys, toSnakeCase } from "keys-transform";
import moment from "moment";
import { buildSql } from "rdcd-common";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import ServiceInfoServices from "../../../../modules/coop/coop/services/service-info.service";
import { unescape } from "underscore";

@Service()
export default class ReportServices {
  constructor() {}

  async get(isPagination: boolean, limit: number, offset: number, allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT * FROM coop.report_info";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      const createSql = buildSql(sql, allQuery, "AND", this.filter, "id ", limit, offset);
      const queryText = isPagination ? createSql[0] : createSql[1];
      var features = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = isPagination
        ? "SELECT * FROM coop.report_info ORDER BY id  LIMIT $1 OFFSET $2"
        : "SELECT * FROM coop.report_info ORDER BY id ";
      features = await (await pgConnect.getConnection("slave")).query(queryText, isPagination ? [limit, offset] : []);
    }

    return features.rows;
  }
  async getByLaws(id: string) {
    const sql = "select by_laws from coop.samity_info where id=$1";
    const result = (await (await pgConnect.getConnection("slave")).query(sql, [id])).rows[0];
    return result;
  }

  async getByLawsInfo(id: string) {
    const sql = `SELECT
    A.SAMITY_CODE,
    (A.AMENDMENT_SAMITY_CODE -> (jsonb_array_length(A.AMENDMENT_SAMITY_CODE) - 1)) ->> 'samityCode' AS LAST_AMENDMENT_SAMITY_CODE,
    (A.AMENDMENT_SAMITY_CODE -> (jsonb_array_length(A.AMENDMENT_SAMITY_CODE) - 1)) ->> 'date' AS LAST_AMENDMENT_SAMITY_date,
    A.SAMITY_NAME,
    TO_CHAR(A.SAMITY_REGISTRATION_DATE, 'DD-MM-YYYY') AS SAMITY_REGISTRATION_DATE,
    A.SAMITY_DETAILS_ADDRESS AS DETAILS_ADDRESS,
    (SELECT DISTINCT UNI_THANA_PAW_NAME_BANGLA FROM MASTER.MV_UNION_THANA_PAURASABHA_INFO WHERE DISTRICT_ID = SAMITY_DISTRICT_ID AND UNI_THANA_PAW_ID = A.SAMITY_UNI_THANA_PAW_ID) AS UNI_THANA_PAW_NAME_BANGLA,
    B.UPA_CITY_NAME_BANGLA,
    B.DISTRICT_NAME_BANGLA
  FROM
    COOP.SAMITY_INFO A
    LEFT JOIN MASTER.MV_UPAZILA_CITY_INFO B ON B.UPA_CITY_ID = A.SAMITY_UPA_CITY_ID
    WHERE A.ID =$1`;
    const result = (await (await pgConnect.getConnection("slave")).query(sql, [id])).rows[0];
    return result;
  }

  async count(allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM coop.report_info";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = await buildSql(sql, allQuery, "AND", this.filter, "id")[1];
      var result = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM coop.report_info";
      result = await (await pgConnect.getConnection("slave")).query(queryText);
    }
    return result.rows[0].count;
  }

  filter(key: string) {
    return toSnakeCase(key);
  }

  async getByType(type: string, query: any, user: any) {
    if (type == "usersInfo" && user.type == "user" && query.officeId) {
      const sql = `select a.id, a.name, a.email, a.mobile, STRING_AGG (
        c.role_name, ','
                    ORDER BY
                      c.id
                  ) roles from users.user a, users.user_role b, users.role c, master.office_info d
        where a.id = b.user_id
        and b.role_id = c.id 
        and a.office_id = d.id
        and a.office_id = $1
        group by a.id, a.name, a.email, a.mobile
        order by a.id ASC`;

      let result = (await (await pgConnect.getConnection("slave")).query(sql, [query.officeId])).rows;

      const reportInfoSql = `select data from coop.report_info where form_name = $1`;
      let reportInfo = (
        await (await pgConnect.getConnection("slave")).query(reportInfoSql, [query.formName])
      ).rows[0]?.data?.filter((e: any) => e.type_name == type);

      reportInfo = reportInfo ? toCamelKeys(reportInfo) : reportInfo;
      const hyperAction = reportInfo[0].hyperLinkAction;

      if (result.length > 0) {
        for (const el of result) {
          for (const element of hyperAction) {
            let m: any = {};
            m.reportFrom = element.action.reportFrom;
            m.params = {};
            if (element.action.reportFrom == "jasper") {
              m.reportName = element.action.reportName;
              for (const [i, e] of element.action.jasperParameter.entries()) {
                if (element.action.parameter[i] == "doptor_id") {
                  m.params[e] = user.doptorId;
                } else if (element.action.parameter[i] == "user_name") {
                  m.params[e] = user.name;
                } else {
                  m.params[e] = el[element.action.parameter[i]];
                }
              }
            } else if (element.action.reportFrom == "database" && element.action.parameter.length > 0) {
              for (const [i, e] of element.action.parameter.entries()) {
                if (e == "doptor_id") {
                  m.params[e] = user.doptorId;
                } else if (e == "user_name") {
                  m.params[e] = user.name;
                } else {
                  m.params[e] = el[e];
                }
              }
            }
            el["actionTakenForHyper"] = m;
          }
        }
      }

      result =
        result.length > 0
          ? result.map((e, i) => {
              return {
                serial: this.engToBang(String(i + 1)),
                name: e.name,
                email: e.email,
                mobile: this.engToBang(e.mobile),
                roles: e.roles,
                actionTakenForHyper: e.actionTakenForHyper,
              };
            })
          : [
              {
                name: "",
                email: "",
                mobile: "",
                roles: "",
                actionTakenForHyper: {},
              },
            ];

      const returnResult = [];
      for (const [index, element] of result.entries()) {
        const keys = Object.keys(element);
        let obj: any = {};
        for (const e of keys) {
          if (e != "actionTakenForHyper") {
            const name = this.englishToBanglaInterCeptor(e);
            obj[name] = element[e];
          } else {
            obj[e] = element[e];
          }
        }

        returnResult.push(obj);
      }
      return { data: returnResult, alignItems: {} };
    } else if (type == "samitySummaryByUserOffice" && user.type == "user") {
      const sql = `SELECT
                     A.primary_samity_approve,
                     B.primary_samity_pending,
                     C.primary_samity_reject,
                     D.center_samity_approve,
                     E.center_samity_pending,
                     F.center_samity_reject,
                     G.national_samity_approve,
                     H.national_samity_pending,
                     I.national_samity_reject
                   FROM
                     (
                       SELECT
                       count(id) AS primary_samity_approve
                     FROM
                       coop.samity_info
                     WHERE
                       samity_level='P' and office_id= $1) A ,
                     (
                     SELECT
                       count(id) AS primary_samity_pending
                     FROM
                       coop.application
                     WHERE
                       service_id = 2
                       AND DATA->'office_id' = $2
                       AND DATA->>'samity_level' = 'P'
                       AND status = 'P' ) B ,
                     (
                     SELECT
                       count(id) AS primary_samity_reject
                     FROM
                       coop.application
                     WHERE
                       service_id = 2
                       AND DATA->'office_id' = $3
                       AND DATA->>'samity_level' = 'P'
                       AND status = 'R' ) C,
                     (
                     SELECT
                       count(id) AS center_samity_approve
                       FROM
                       coop.samity_info
                     WHERE
                       samity_level='C' and office_id= $4 ) D ,
                     (
                     SELECT
                       count(id) AS center_samity_pending
                     FROM
                       coop.application
                     WHERE
                       service_id = 2
                       AND DATA->'office_id' = $5
                       AND DATA->>'samity_level' = 'C'
                       AND status = 'P' ) E ,
                     (
                     SELECT
                       count(id) AS center_samity_reject
                     FROM
                       coop.application
                     WHERE
                       service_id = 2
                       AND DATA->'office_id' = $6
                       AND DATA->>'samity_level' = 'C'
                       AND status = 'R' ) F,
                     (
                     SELECT
                       count(id) AS national_samity_approve
                       FROM
                       coop.samity_info
                     WHERE
                       samity_level='N' and office_id= $7 ) G ,
                     (
                     SELECT
                       count(id) AS national_samity_pending
                     FROM
                       coop.application
                     WHERE
                       service_id = 2
                       AND DATA->'office_id' = $8
                       AND DATA->>'samity_level' = 'N'
                       AND status = 'P' ) H ,
                     (
                     SELECT
                       count(id) AS national_samity_reject
                     FROM
                       coop.application
                     WHERE
                       service_id = 2
                       AND DATA->'office_id' = $9
                       AND DATA->>'samity_level' = 'N'
                       AND status = 'R' ) I`;

      const result: any = toCamelKeys(
        (
          await (
            await pgConnect.getConnection("slave")
          ).query(sql, [
            query.officeId,
            query.officeId,
            query.officeId,
            query.officeId,
            query.officeId,
            query.officeId,
            query.officeId,
            query.officeId,
            query.officeId,
          ])
        ).rows[0]
      );

      const reportInfoSql = `select data from coop.report_info where form_name = $1`;
      let reportInfo = (
        await (await pgConnect.getConnection("slave")).query(reportInfoSql, [query.formName])
      ).rows[0]?.data?.filter((e: any) => e.type_name == type);

      reportInfo = reportInfo ? toCamelKeys(reportInfo) : reportInfo;
      const [hyperAction] = reportInfo[0].hyperLinkAction;

      if (result) {
        return {
          data: [
            {
              "সমিতি ধরণ": "প্রাথমিক সমিতি",
              "নিবন্ধন প্রদান": result.primarySamityApprove,
              "অপেক্ষমান নিবন্ধন": result.primarySamityPending,
              "নিবন্ধন প্রত্যাখান": result.primarySamityReject,
              actionTakenForHyper: {
                reportFrom: hyperAction.action.reportFrom,
                params: {
                  pDoptorId: user.doptorId,
                  pUserName: user.name,
                  pSamityLevel: "P",
                },
                reportName: hyperAction.action.reportName,
              },
            },
            {
              "সমিতি ধরণ": "কেন্দ্রীয় সমিতি",
              "নিবন্ধন প্রদান": result.centerSamityApprove,
              "অপেক্ষমান নিবন্ধন": result.centerSamityPending,
              "নিবন্ধন প্রত্যাখান": result.centerSamityReject,
              actionTakenForHyper: {
                reportFrom: hyperAction.action.reportFrom,
                params: {
                  pDoptorId: user.doptorId,
                  pUserName: user.name,
                  pSamityLevel: "C",
                },
                reportName: hyperAction.action.reportName,
              },
            },
            {
              "সমিতি ধরণ": "জাতীয় সমিতি",
              "নিবন্ধন প্রদান": result.nationalSamityApprove,
              "অপেক্ষমান নিবন্ধন": result.nationalSamityPending,
              "নিবন্ধন প্রত্যাখান": result.nationalSamityReject,
              actionTakenForHyper: {
                reportFrom: hyperAction.action.reportFrom,
                params: {
                  pDoptorId: user.doptorId,
                  pUserName: user.name,
                  pSamityLevel: "N",
                },
                reportName: hyperAction.action.reportName,
              },
            },
          ],
          alignItems: {
            "সমিতি ধরণ": "left",
            "নিবন্ধন প্রদান": "center",
            "অপেক্ষমান নিবন্ধন": "center",
            "নিবন্ধন প্রত্যাখান": "center",
          },
        };
      }

      return {
        data: result ? toCamelKeys(result) : result,
        alignItems: {
          "সমিতি ধরণ": "left",
          "নিবন্ধন প্রদান": "center",
          "অপেক্ষমান নিবন্ধন": "center",
          "নিবন্ধন প্রত্যাখান": "center",
        },
      };
    } else if (type == "samityDetails" && user.type == "user") {
      const sql = `select 
                    a.id,
                    a.samity_name,
                    a.samity_level,
                    a.samity_code,
                    b.type_name,
                    c.org_name_bangla,
                    a.is_manual
                   from 
                      coop.samity_info a 
                      inner join coop.samity_type b on a.samity_type_id=b.id
                      inner join master.enterprising_org c on a.enterprising_id=c.id
                    where a.office_id=$1 order by id`;
      let result = (await (await pgConnect.getConnection("slave")).query(sql, [query.officeId])).rows;

      const reportInfoSql = `select data from coop.report_info where form_name = $1`;
      let reportInfo = (
        await (await pgConnect.getConnection("slave")).query(reportInfoSql, [query.formName])
      ).rows[0]?.data?.filter((e: any) => e.type_name == type);

      reportInfo = reportInfo ? toCamelKeys(reportInfo) : reportInfo;
      const hyperAction = reportInfo[0].hyperLinkAction;

      if (result.length > 0) {
        for (const el of result) {
          for (const element of hyperAction) {
            let m: any = {};
            m.reportFrom = element.action.reportFrom;
            m.params = {};
            if (element.action.reportFrom == "jasper") {
              m.reportName = element.action.reportName;
              for (const [i, e] of element.action.jasperParameter.entries()) {
                if (element.action.parameter[i] == "doptor_id") {
                  m.params[e] = user.doptorId;
                } else if (element.action.parameter[i] == "user_name") {
                  m.params[e] = user.name;
                } else {
                  m.params[e] = el[element.action.parameter[i]];
                }
              }
            } else if (element.action.reportFrom == "database" && element.action.parameter.length > 0) {
              for (const [i, e] of element.action.parameter.entries()) {
                if (e == "doptor_id") {
                  m.params[e] = user.doptorId;
                } else if (e == "user_name") {
                  m.params[e] = user.name;
                } else {
                  m.params[e] = el[e];
                }
              }
            }
            el["actionTakenForHyper"] = m;
          }
        }
      }

      result =
        result.length > 0
          ? result.map((e, i) => {
              return {
                serial: this.engToBang(String(i + 1)),
                samity_name: e.samity_name,
                manualOrApplicable: e.is_manual ? `অনলাইনকৃত` : `নিবন্ধিত`,
                samity_level: e.samity_level,
                samity_code: this.engToBang(e.samity_code),
                type_name: e.type_name,
                org_name_bangla: e.org_name_bangla,
                actionTakenForHyper: e.actionTakenForHyper,
              };
            })
          : [
              {
                samity_name: "",
                manualOrApplicable: "",
                samity_level: "",
                samity_code: "",
                type_name: "",
                org_name_bangla: "",
                actionTakenForHyper: {},
              },
            ];

      const returnResult = [];
      for (const [index, element] of result.entries()) {
        const keys = Object.keys(element);
        let obj: any = {};
        for (const e of keys) {
          if (e != "actionTakenForHyper") {
            const name = this.englishToBanglaInterCeptor(e);
            name == "সমিতির ধরণ"
              ? (obj[name] = this.samityLevelChange(element.samity_level))
              : (obj[name] = element[e]);
          } else {
            obj[e] = element[e];
          }
        }

        returnResult.push(obj);
      }
      return { data: returnResult, alignItems: {} };
    } else if (type == "abasayanApplication" && user.type == "user") {
      const sql = `SELECT A.ID,
      B.SAMITY_NAME,
      B.samity_level,
      B.SAMITY_CODE,
      C.TYPE_NAME,
      D.NAME_BN
    FROM COOP.APPLICATION A,
      COOP.SAMITY_INFO B,
      COOP.SAMITY_TYPE C,
      MASTER.OFFICE_EMPLOYEE D
    WHERE A.SAMITY_ID = B.ID
      AND B.SAMITY_TYPE_ID = C.ID
      AND A.NEXT_APP_DESIGNATION_ID = D.DESIGNATION_ID
      AND A.SERVICE_ID = 11
      AND A.STATUS = 'P'
      AND B.OFFICE_ID = $1
      ORDER BY A.ID`;
      let result = (await (await pgConnect.getConnection("slave")).query(sql, [query.officeId])).rows;

      const reportInfoSql = `select data from coop.report_info where form_name = $1`;
      let reportInfo = (
        await (await pgConnect.getConnection("slave")).query(reportInfoSql, [query.formName])
      ).rows[0]?.data?.filter((e: any) => e.type_name == type);

      reportInfo = reportInfo ? toCamelKeys(reportInfo) : reportInfo;
      const hyperAction = reportInfo[0].hyperLinkAction;

      if (result.length > 0) {
        for (const el of result) {
          for (const element of hyperAction) {
            let m: any = {};
            m.reportFrom = element.action.reportFrom;
            m.params = {};
            if (element.action.reportFrom == "jasper") {
              m.reportName = element.action.reportName;
              for (const [i, e] of element.action.jasperParameter.entries()) {
                if (element.action.parameter[i] == "doptor_id") {
                  m.params[e] = user.doptorId;
                } else if (element.action.parameter[i] == "user_name") {
                  m.params[e] = user.name;
                } else {
                  m.params[e] = el[element.action.parameter[i]];
                }
              }
            } else if (element.action.reportFrom == "database" && element.action.parameter.length > 0) {
              for (const [i, e] of element.action.parameter.entries()) {
                if (e == "doptor_id") {
                  m.params[e] = user.doptorId;
                } else if (e == "user_name") {
                  m.params[e] = user.name;
                } else {
                  m.params[e] = el[e];
                }
              }
            }
            el["actionTakenForHyper"] = m;
          }
        }
      }

      result =
        result.length > 0
          ? result.map((e, i) => {
              return {
                serial: this.engToBang(String(i + 1)),
                samity_name: e.samity_name,
                samity_level: e.samity_level,
                samity_code: this.engToBang(e.samity_code),
                samity_type: e.type_name,
                designation: e.name_bn,
                actionTakenForHyper: e.actionTakenForHyper,
              };
            })
          : [
              {
                samity_name: "",
                samity_level: "",
                samity_code: "",
                samity_type: "",
                designation: "",
                actionTakenForHyper: {},
              },
            ];

      const returnResult = [];
      for (const [index, element] of result.entries()) {
        const keys = Object.keys(element);
        let obj: any = {};
        for (const e of keys) {
          if (e != "actionTakenForHyper") {
            const name = this.englishToBanglaInterCeptor(e);
            name == "সমিতির ধরণ"
              ? (obj[name] = this.samityLevelChange(element.samity_level))
              : (obj[name] = element[e]);
          } else {
            obj[e] = element[e];
          }
        }

        returnResult.push(obj);
      }
      return { data: returnResult, alignItems: {} };
    } else if (type == "abasayanDetails" && user.type == "user") {
      const sql = `SELECT A.ID,
      A.SAMITY_NAME,
      A.SAMITY_CODE,
      B.TYPE_NAME,
      C.REMARKS,
      C.CLOSE_DATE,
      string_agg(DISTINCT documents.document_name, E'\n') AS document_names,
      string_agg(DISTINCT remarksQry.remarks, E'\n') AS remarks_array,
      string_agg(DISTINCT d.name_bn, E',\n') AS name_bn
FROM COOP.SAMITY_INFO A
INNER JOIN COOP.SAMITY_TYPE B ON A.SAMITY_TYPE_ID = B.ID
INNER JOIN COOP.SAMITY_CLOSE C ON A.ID = C.SAMITY_ID
LEFT JOIN LATERAL (
 SELECT jsonb_array_elements(attachment)->>'documentNameBangla' AS document_name
 FROM COOP.SAMITY_CLOSE
 WHERE SAMITY_ID = A.ID
) AS documents ON true
LEFT JOIN LATERAL (
 SELECT jsonb_array_elements(workflow)->>'remarks' AS remarks,
        jsonb_array_elements(workflow)->>'designationId' AS designation
 FROM COOP.SAMITY_CLOSE
 WHERE SAMITY_ID = A.ID
) AS remarksQry ON true
LEFT JOIN master.office_employee d ON remarksQry.designation = CAST(d.designation_id AS text)
WHERE A.STATUS = 'I'
 AND A.OFFICE_ID = $1
GROUP BY A.ID, A.SAMITY_NAME, A.SAMITY_CODE, B.TYPE_NAME, C.REMARKS, C.CLOSE_DATE
ORDER BY A.ID`;
      let result = (await (await pgConnect.getConnection("slave")).query(sql, [query.officeId])).rows;

      const reportInfoSql = `select data from coop.report_info where form_name = $1`;
      let reportInfo = (
        await (await pgConnect.getConnection("slave")).query(reportInfoSql, [query.formName])
      ).rows[0]?.data?.filter((e: any) => e.type_name == type);

      reportInfo = reportInfo ? toCamelKeys(reportInfo) : reportInfo;
      const hyperAction = reportInfo[0].hyperLinkAction;

      if (result.length > 0) {
        for (const el of result) {
          for (const element of hyperAction) {
            let m: any = {};
            m.reportFrom = element.action.reportFrom;
            m.params = {};
            if (element.action.reportFrom == "jasper") {
              m.reportName = element.action.reportName;
              for (const [i, e] of element.action.jasperParameter.entries()) {
                if (element.action.parameter[i] == "doptor_id") {
                  m.params[e] = user.doptorId;
                } else if (element.action.parameter[i] == "user_name") {
                  m.params[e] = user.name;
                } else {
                  m.params[e] = el[element.action.parameter[i]];
                }
              }
            } else if (element.action.reportFrom == "database" && element.action.parameter.length > 0) {
              for (const [i, e] of element.action.parameter.entries()) {
                if (e == "doptor_id") {
                  m.params[e] = user.doptorId;
                } else if (e == "user_name") {
                  m.params[e] = user.name;
                } else {
                  m.params[e] = el[e];
                }
              }
            }
            el["actionTakenForHyper"] = m;
          }
        }
      }

      result =
        result.length > 0
          ? result.map((e, i) => {
              return {
                serial: this.engToBang(String(i + 1)),
                samity_name: e.samity_name,
                samity_level: e.samity_level,
                samity_code: this.engToBang(e.samity_code),
                close_date: this.engToBang(moment(e.close_date).format("DD/MM/YYYY")),
                abaremarks: unescape(e.remarks),
                workflow: e.remarks_array,
                designation: e.name_bn,
                actionTakenForHyper: e.actionTakenForHyper,
              };
            })
          : [
              {
                samity_name: "",
                samity_level: "",
                samity_code: "",
                close_date: "",
                abaremarks: "",
                workflow: "",
                designation: "",
                actionTakenForHyper: {},
              },
            ];

      const returnResult = [];
      for (const [index, element] of result.entries()) {
        const keys = Object.keys(element);
        let obj: any = {};
        for (const e of keys) {
          if (e != "actionTakenForHyper") {
            const name = this.englishToBanglaInterCeptor(e);
            name == "সমিতির ধরণ"
              ? (obj[name] = this.samityLevelChange(element.samity_level))
              : (obj[name] = element[e]);
          } else {
            obj[e] = element[e];
          }
        }

        returnResult.push(obj);
      }
      return { data: returnResult, alignItems: {} };
    } else if (type == "investmentDetails" && user.type == "user") {
      const sql = `SELECT A.ID,
      A.SAMITY_NAME,
      A.SAMITY_CODE,
      B.TYPE_NAME,
      C.REMARKS,
      string_agg(DISTINCT documents.document_name, E'\n') AS document_names,
      string_agg(DISTINCT remarksQry.remarks, E'\n') AS remarks_array,
      string_agg(DISTINCT d.name_bn, E',\n') AS name_bn
FROM COOP.SAMITY_INFO A
INNER JOIN COOP.SAMITY_TYPE B ON A.SAMITY_TYPE_ID = B.ID
INNER JOIN COOP.INVESTMENT_INFO C ON A.ID = C.SAMITY_ID
LEFT JOIN LATERAL (
 SELECT jsonb_array_elements(attachment)->>'documentNameBangla' AS document_name
 FROM COOP.INVESTMENT_INFO
 WHERE SAMITY_ID = A.ID
) AS documents ON true
LEFT JOIN LATERAL (
 SELECT jsonb_array_elements(workflow)->>'remarks' AS remarks,
        jsonb_array_elements(workflow)->>'designationId' AS designation
 FROM COOP.INVESTMENT_INFO
 WHERE SAMITY_ID = A.ID
) AS remarksQry ON true
LEFT JOIN master.office_employee d ON remarksQry.designation = CAST(d.designation_id AS text)
WHERE A.OFFICE_ID = $1
GROUP BY A.ID, A.SAMITY_NAME, A.SAMITY_CODE, B.TYPE_NAME, C.REMARKS
ORDER BY A.ID`;

      let result = (await (await pgConnect.getConnection("slave")).query(sql, [query.officeId])).rows;

      const reportInfoSql = `select data from coop.report_info where form_name = $1`;
      let reportInfo = (
        await (await pgConnect.getConnection("slave")).query(reportInfoSql, [query.formName])
      ).rows[0]?.data?.filter((e: any) => e.type_name == type);

      reportInfo = reportInfo ? toCamelKeys(reportInfo) : reportInfo;
      const hyperAction = reportInfo[0].hyperLinkAction;

      if (result.length > 0) {
        for (const el of result) {
          for (const element of hyperAction) {
            let m: any = {};
            m.reportFrom = element.action.reportFrom;
            m.params = {};
            if (element.action.reportFrom == "jasper") {
              m.reportName = element.action.reportName;
              for (const [i, e] of element.action.jasperParameter.entries()) {
                if (element.action.parameter[i] == "doptor_id") {
                  m.params[e] = user.doptorId;
                } else if (element.action.parameter[i] == "user_name") {
                  m.params[e] = user.name;
                } else {
                  m.params[e] = el[element.action.parameter[i]];
                }
              }
            } else if (element.action.reportFrom == "database" && element.action.parameter.length > 0) {
              for (const [i, e] of element.action.parameter.entries()) {
                if (e == "doptor_id") {
                  m.params[e] = user.doptorId;
                } else if (e == "user_name") {
                  m.params[e] = user.name;
                } else {
                  m.params[e] = el[e];
                }
              }
            }
            el["actionTakenForHyper"] = m;
          }
        }
      }

      result =
        result.length > 0
          ? result.map((e, i) => {
              return {
                serial: this.engToBang(String(i + 1)),
                samity_name: e.samity_name,
                samity_level: e.samity_level,
                samity_code: this.engToBang(e.samity_code),
                type_name: e.type_name,
                biniremarks: unescape(e.remarks),
                workflow: e.remarks_array,
                designation: e.name_bn,
                actionTakenForHyper: e.actionTakenForHyper,
              };
            })
          : [
              {
                samity_name: "",
                samity_level: "",
                samity_code: "",
                type_name: "",
                biniremarks: "",
                workflow: "",
                designation: "",
                actionTakenForHyper: {},
              },
            ];

      const returnResult = [];
      for (const [index, element] of result.entries()) {
        const keys = Object.keys(element);
        let obj: any = {};
        for (const e of keys) {
          if (e != "actionTakenForHyper") {
            const name = this.englishToBanglaInterCeptor(e);
            name == "সমিতির ধরণ"
              ? (obj[name] = this.samityLevelChange(element.samity_level))
              : (obj[name] = element[e]);
          } else {
            obj[e] = element[e];
          }
        }

        returnResult.push(obj);
      }
      return { data: returnResult, alignItems: {} };
    } else if (type == "auditDetails" && user.type == "user") {
      const sql = `SELECT
      A.ID AS SAMITY_ID,
      A.SAMITY_CODE,
      A.SAMITY_NAME,
      B.START_YEAR,
      B.END_YEAR,
      CAST(B.INCOME AS VARCHAR) AS INCOME,
      CAST(B.EXPENSE AS VARCHAR) AS EXPENSE,
      CASE
          WHEN A.SOLD_SHARE IS NULL OR A.SHARE_PRICE IS NULL
          THEN '0'
          ELSE CAST(A.SOLD_SHARE * A.SHARE_PRICE AS VARCHAR)
      END AS share_amount
  FROM COOP.SAMITY_INFO A
  LEFT JOIN COOP.AUDIT_INFO B ON B.SAMITY_ID = A.ID
  WHERE A.OFFICE_ID = B.AUDITOR_OFFICE_ID
        AND A.OFFICE_ID = $1
  ORDER BY A.ID`;

      let result = (await (await pgConnect.getConnection("slave")).query(sql, [query.officeId])).rows;

      const reportInfoSql = `select data from coop.report_info where form_name = $1`;
      let reportInfo = (
        await (await pgConnect.getConnection("slave")).query(reportInfoSql, [query.formName])
      ).rows[0]?.data?.filter((e: any) => e.type_name == type);

      reportInfo = reportInfo ? toCamelKeys(reportInfo) : reportInfo;
      const hyperAction = reportInfo[0].hyperLinkAction;

      if (result.length > 0) {
        for (const el of result) {
          for (const element of hyperAction) {
            let m: any = {};
            m.reportFrom = element.action.reportFrom;
            m.params = {};
            if (element.action.reportFrom == "jasper") {
              m.reportName = element.action.reportName;
              for (const [i, e] of element.action.jasperParameter.entries()) {
                if (element.action.parameter[i] == "doptor_id") {
                  m.params[e] = user.doptorId;
                } else if (element.action.parameter[i] == "user_name") {
                  m.params[e] = user.name;
                } else {
                  m.params[e] = el[element.action.parameter[i]];
                }
              }
            } else if (element.action.reportFrom == "database" && element.action.parameter.length > 0) {
              for (const [i, e] of element.action.parameter.entries()) {
                if (e == "doptor_id") {
                  m.params[e] = user.doptorId;
                } else if (e == "user_name") {
                  m.params[e] = user.name;
                } else {
                  m.params[e] = el[e];
                }
              }
            }
            el["actionTakenForHyper"] = m;
          }
        }
      }

      result =
        result.length > 0
          ? result.map((e, i) => {
              return {
                serial: this.engToBang(String(i + 1)),
                samity_name: e.samity_name,
                samity_code: this.engToBang(e.samity_code),
                start_year: this.engToBang(e.start_year) + " - " + this.engToBang(e.end_year),
                share_amount: this.engToBang(e.share_amount),
                income: this.engToBang(e.income),
                expense: this.engToBang(e.expense),
                actionTakenForHyper: e.actionTakenForHyper,
              };
            })
          : [
              {
                samity_name: "",
                samity_level: "",
                samity_code: "",
                start_year: "",
                share_amount: "",
                income: "",
                expense: "",
                actionTakenForHyper: {},
              },
            ];

      const returnResult = [];
      for (const [index, element] of result.entries()) {
        const keys = Object.keys(element);
        let obj: any = {};
        for (const e of keys) {
          if (e != "actionTakenForHyper") {
            const name = this.englishToBanglaInterCeptor(e);
            name == "সমিতির ধরণ"
              ? (obj[name] = this.samityLevelChange(element.samity_level))
              : (obj[name] = element[e]);
          } else {
            obj[e] = element[e];
          }
        }

        returnResult.push(obj);
      }
      return { data: returnResult, alignItems: {} };
    } else if (type == "memberDetails" && user.type == "user" && query.samityId) {
      const sql = `SELECT
                     a.id,
                     a.member_code,
                     a.member_name_bangla,
                     a.father_name,
                     a.nid,
                     a.brn,
                     a.mobile
                   FROM
                     coop.member_info a
                   WHERE
                     a.samity_id = $1
                   ORDER BY a.id`;

      let result = (await (await pgConnect.getConnection("slave")).query(sql, [query.samityId])).rows;

      const reportInfoSql = `select data from coop.report_info where form_name = $1`;
      let reportInfo = (
        await (await pgConnect.getConnection("slave")).query(reportInfoSql, [query.formName])
      ).rows[0]?.data?.filter((e: any) => e.type_name == type);

      reportInfo = reportInfo ? toCamelKeys(reportInfo) : reportInfo;
      const hyperAction = reportInfo[0].hyperLinkAction;

      if (result.length > 0) {
        for (const el of result) {
          for (const element of hyperAction) {
            let m: any = {};
            m.reportFrom = element.action.reportFrom;
            if (element.action.reportFrom == "jasper") {
              m.reportName = element.action.reportName;

              m.params = {};
              for (const [i, e] of element.action.jasperParameter.entries()) {
                if (element.action.parameter[i] == "doptor_id") {
                  m.params[e] = user.doptorId;
                } else if (element.action.parameter[i] == "user_name") {
                  m.params[e] = user.name;
                } else {
                  m.params[e] = el[element.action.parameter[i]];
                }
              }
            }
            el.actionTakenForHyper = m;
          }
        }
      }

      result =
        result.length > 0
          ? result.map((e) => {
              return {
                member_code: this.engToBang(e.member_code),
                member_name_bangla: e.member_name_bangla,
                father_name: e.father_name,
                nidOrBrn: e.nid ? this.engToBang(e.nid) : this.engToBang(e.brn),
                mobile: this.engToBang(e.mobile),
                actionTakenForHyper: e.actionTakenForHyper,
              };
            })
          : [
              {
                member_code: "",
                member_name_bangla: "",
                father_name: "",
                nidOrBrn: "",
                mobile: "",
                actionTakenForHyper: {},
              },
            ];

      const returnResult = [];
      for (const [index, element] of result.entries()) {
        const keys = Object.keys(element);
        let obj: any = {};
        for (const e of keys) {
          if (e != "actionTakenForHyper") {
            const name = this.englishToBanglaInterCeptor(e);
            obj[name] = element[e];
          } else {
            obj[e] = element[e];
          }
        }

        returnResult.push(obj);
      }
      return { data: returnResult, alignItems: {} };
    } else if (type == "samityCategory" && user.type == "user") {
      const sql = `select id, type_name from coop.samity_type order by id`;

      let result = (await (await pgConnect.getConnection("slave")).query(sql)).rows;

      const reportInfoSql = `select data from coop.report_info where form_name = $1`;

      let reportInfo = (
        await (await pgConnect.getConnection("slave")).query(reportInfoSql, [query.formName])
      ).rows[0]?.data?.filter((e: any) => e.type_name == type);

      reportInfo = reportInfo ? toCamelKeys(reportInfo) : reportInfo;
      const hyperAction = reportInfo[0].hyperLinkAction;

      if (result.length > 0) {
        for (const el of result) {
          for (const element of hyperAction) {
            let m: any = {};
            m.reportFrom = element.action.reportFrom;
            m.params = {};
            if (element.action.reportFrom == "jasper") {
              m.reportName = element.action.reportName;
              for (const [i, e] of element.action.jasperParameter.entries()) {
                if (element.action.parameter[i] == "doptor_id") {
                  m.params[e] = user.doptorId;
                } else if (element.action.parameter[i] == "user_name") {
                  m.params[e] = user.name;
                } else {
                  m.params[e] = el[element.action.parameter[i]];
                }
              }
            } else if (element.action.reportFrom == "database" && element.action.parameter.length > 0) {
              for (const [i, e] of element.action.parameter.entries()) {
                if (e == "doptor_id") {
                  m.params[e] = user.doptorId;
                } else if (e == "user_name") {
                  m.params[e] = user.name;
                } else {
                  m.params[e] = el[e];
                }
              }
            }
            el["actionTakenForHyper"] = m;
          }
        }
      }

      result =
        result.length > 0
          ? result.map((e, i) => {
              return {
                serial: this.engToBang(String(i + 1)),
                type_name: e.type_name,
                actionTakenForHyper: e.actionTakenForHyper,
              };
            })
          : [
              {
                type_name: "",
                actionTakenForHyper: {},
              },
            ];

      const returnResult = [];
      for (const [index, element] of result.entries()) {
        const keys = Object.keys(element);
        let obj: any = {};
        for (const e of keys) {
          if (e != "actionTakenForHyper") {
            const name = this.englishToBanglaInterCeptor(e);
            obj[name] = element[e];
          } else {
            obj[e] = element[e];
          }
        }
        returnResult.push(obj);
      }
      return { data: returnResult, alignItems: {} };
    } else if (type == "committeeSummaryByUserOffice" && user.type == "user" && query.officeId) {
      const sql = `select
      a.id samity_id,
      a.samity_code,
      a.samity_name,
      a.samity_level,
      b.committee_type,
      b.election_date,
      b.effect_date,
      b.expire_date,
      b.duration,
      b.no_of_member,
      c.member_name as committee_president_name ,
      c.mobile
    from
      coop.samity_info a
    left join coop.committee_info b on
      b.samity_id = a.id
    left join coop.committee_member c on 
        c.committee_id = b.id 
    where
      b.status = 'A'
      and b.committee_type in ('I', 'E', 'S')
      and a.office_id = $1 and c.committee_role_id = 1 
    order by a.id`;

      let result = (await (await pgConnect.getConnection("slave")).query(sql, [query.officeId])).rows;

      const reportInfoSql = `select data from coop.report_info where form_name = $1`;
      let reportInfo = (
        await (await pgConnect.getConnection("slave")).query(reportInfoSql, [query.formName])
      ).rows[0]?.data?.filter((e: any) => e.type_name == type);

      reportInfo = reportInfo ? toCamelKeys(reportInfo) : reportInfo;
      const hyperAction = reportInfo[0].hyperLinkAction;

      for (const el of result) {
        for (const element of hyperAction) {
          let m: any = {};
          m.reportFrom = element.action.reportFrom;
          if (element.action.reportFrom == "jasper") {
            m.reportName = element.action.reportName;
            m.params = {};
            for (const [i, e] of element.action.jasperParameter.entries()) {
              if (element.action.parameter[i] == "doptor_id") {
                m.params[e] = user.doptorId;
              } else if (element.action.parameter[i] == "user_name") {
                m.params[e] = user.name;
              } else {
                m.params[e] = el[element.action.parameter[i]];
              }
            }
          }
          el.actionTakenForHyper = m;
        }
      }

      result =
        result.length > 0
          ? result.map((e) => {
              return {
                committee_type: this.committeeLevelChange(e.committee_type),
                samity_name: e.samity_name,
                election_date: this.engToBang(
                  moment(e.election_date).isValid() ? moment(e.election_date).format("DD/MM/YYYY") : ""
                ),
                effect_date: this.engToBang(
                  moment(e.effect_date).isValid() ? moment(e.effect_date).format("DD/MM/YYYY") : ""
                ),
                expire_date: this.engToBang(
                  moment(e.expire_date).isValid() ? moment(e.expire_date).format("DD/MM/YYYY") : ""
                ),
                committee_president_name: e.committee_president_name,
                mobile: e.mobile,

                actionTakenForHyper: e.actionTakenForHyper,
              };
            })
          : [
              {
                committee_type: "",
                samity_name: "",
                election_date: "",
                effect_date: "",
                expire_date: "",
                committee_president_name: "",
                mobile: "",
                actionTakenForHyper: {},
              },
            ];

      const returnResult = [];
      for (const [index, element] of result.entries()) {
        const keys = Object.keys(element);
        let obj: any = {};
        for (const e of keys) {
          if (e != "actionTakenForHyper") {
            const name = this.englishToBanglaInterCeptor(e);
            obj[name] = element[e];
          } else {
            obj[e] = element[e];
          }
        }
        returnResult.push(obj);
      }
      return { data: returnResult, alignItems: {} };
    } else if (type == "calendarDetails" && user.type == "user" && query.officeId) {
      const sql = `SELECT a.id samity_id,samity_code, samity_name, samity_level, committee_type,
      election_date, effect_date, expire_date, duration, no_of_member
      FROM coop.samity_info a
      LEFT JOIN coop.committee_info b ON b.samity_id = a.id
      WHERE b.status = 'A' and b.committee_type='EC'
      AND a.office_id=$1`;

      let result = (await (await pgConnect.getConnection("slave")).query(sql, [query.officeId])).rows;

      result =
        result.length > 0
          ? result.map((e) => {
              return {
                committee_type: this.committeeLevelChange(e.committee_type),
                samity_name: e.samity_name,
                election_date: this.engToBang(
                  moment(e.election_date).isValid() ? moment(e.election_date).format("DD/MM/YYYY") : ""
                ),
                effect_date: this.engToBang(
                  moment(e.effect_date).isValid() ? moment(e.effect_date).format("DD/MM/YYYY") : ""
                ),
                expire_date: this.engToBang(
                  moment(e.expire_date).isValid() ? moment(e.expire_date).format("DD/MM/YYYY") : ""
                ),
              };
            })
          : [
              {
                committee_type: "",
                samity_name: "",
                election_date: "",
                effect_date: "",
                expire_date: "",
              },
            ];

      const returnResult = [];
      for (const [index, element] of result.entries()) {
        const keys = Object.keys(element);
        let obj: any = {};
        for (const e of keys) {
          const name = this.englishToBanglaInterCeptor(e);
          obj[name] = element[e];
        }

        returnResult.push(obj);
      }
      return { data: returnResult, alignItems: {} };
    } else if (type == "rejectApplicationByServices" && query.officeId && query.serviceId) {
      const sql = `
          select * from coop.application where status='R' and service_id=$1`;

      let result = (await (await pgConnect.getConnection("archive")).query(sql, [query.serviceId])).rows;

      for (const e of result) {
        let sql;
        if (e.service_id != 1 && e.service_id != 2) {
          sql = `select
          a.id as samity_id,
          a.samity_name,
          b.type_name,
          c.service_name
        from
          coop.samity_info a
        left join coop.samity_type b on
          a.samity_type_id = b.id ,
          coop.service_info c
        where
          a.id = $1
          and c.id = $2`;

          const result = (await (await pgConnect.getConnection("slave")).query(sql, [e.samity_id, e.service_id]))
            .rows[0];
          e["samity_id"] = result.samity_id;
          e["samity_name"] = result.samity_name;
          e["samity_type_name"] = result.type_name;
          e["service_name"] = result.service_name;
        } else if (e.service_id == 1 || e.service_id == 2) {
          const sql = `select a.service_name,b.type_name 
                      from 
                     coop.service_info a,
                     coop.samity_type b
                     where a.id=$1 and b.id=$2`;
          const result = (
            await (await pgConnect.getConnection("slave")).query(sql, [e.service_id, e.data.samity_type_id])
          ).rows[0];

          e["samity_id"] = e.service_id == 2 ? e.data.samity_id : null;
          e["samity_name"] = e.data.samity_name;
          e["samity_type_name"] = result.type_name;
          e["service_name"] = result.service_name;
        }
      }

      const ServiceInfoService = Container.get(ServiceInfoServices);
      const serviceInfoData = await ServiceInfoService.getServiceById(Number(query.serviceId));

      const reportInfoSql = `select data from coop.report_info where form_name = $1`;
      let reportInfo = (
        await (await pgConnect.getConnection("slave")).query(reportInfoSql, [query.formName])
      ).rows[0]?.data?.filter((e: any) => e.type_name == type);

      reportInfo = reportInfo ? toCamelKeys(reportInfo) : reportInfo;
      const hyperAction = reportInfo[0].hyperLinkAction;

      if (result.length > 0) {
        for (const el of result) {
          for (const element of hyperAction) {
            let m: any = {};
            m.reportFrom = element.action.reportFrom;
            m.params = {};
            if (element.action.reportFrom == "jasper") {
              m.reportName = element.action.reportName;
              for (const [i, e] of element.action.jasperParameter.entries()) {
                if (element.action.parameter[i] == "doptor_id") {
                  m.params[e] = user.doptorId;
                } else if (element.action.parameter[i] == "user_name") {
                  m.params[e] = user.name;
                } else {
                  m.params[e] = el[element.action.parameter[i]];
                }
              }
            } else if (element.action.reportFrom == "database" && element.action.parameter.length > 0) {
              for (const [i, e] of element.action.parameter.entries()) {
                if (e == "doptor_id") {
                  m.params[e] = user.doptorId;
                } else if (e == "user_name") {
                  m.params[e] = user.name;
                } else {
                  m.params[e] = el[e];
                }
              }
            }
            el["actionTakenForHyper"] = m;
          }
        }
      }

      result =
        result.length > 0
          ? result.map((e) => {
              return {
                id: e.id,
                service_name: serviceInfoData.serviceName,
                samity_name: e.data.samity_name,
                actionTakenForHyper: e.actionTakenForHyper,
              };
            })
          : [
              {
                id: null,
                service_name: "",
                samity_name: "",
                actionTakenForHyper: {},
              },
            ];

      const returnResult = [];
      for (const [index, element] of result.entries()) {
        const keys = Object.keys(element);
        let obj: any = {};
        for (const e of keys) {
          if (e != "actionTakenForHyper") {
            const name = this.englishToBanglaInterCeptor(e);
            name == "সমিতির ধরণ"
              ? (obj[name] = this.samityLevelChange(element.samity_level))
              : (obj[name] = element[e]);
          } else {
            obj[e] = element[e];
          }
        }
        returnResult.push(obj);
      }
      return { data: returnResult, alignItems: {} };
    } else if (type == "feeCollection" && user.type == "user" && query.officeId) {
      const sql = `SELECT
      a.id,
      a.samity_name,
      a.samity_code,
      CAST(b.income AS VARCHAR) AS income,
      CAST(b.expense AS VARCHAR) AS expense,
      CAST(b.audit_fee AS VARCHAR) AS audit_fee,
      CAST(b.audit_fee_collection AS VARCHAR) AS audit_fee_collection,
      CAST(b.cdf_fee AS VARCHAR) AS cdf_fee,
      CAST(b.cdf_fee_collection AS VARCHAR) AS cdf_fee_collection
  FROM coop.samity_info a
  INNER JOIN coop.audit_info b ON a.id = b.samity_id
  WHERE a.office_id = $1
  ORDER BY a.id`;

      let result = (await (await pgConnect.getConnection("slave")).query(sql, [query.officeId])).rows;

      console.log("result", result);

      const reportInfoSql = `select data from coop.report_info where form_name = $1`;
      let reportInfo = (
        await (await pgConnect.getConnection("slave")).query(reportInfoSql, [query.formName])
      ).rows[0]?.data?.filter((e: any) => e.type_name == type);

      reportInfo = reportInfo ? toCamelKeys(reportInfo) : reportInfo;
      const hyperAction = reportInfo[0].hyperLinkAction;

      if (result.length > 0) {
        for (const el of result) {
          for (const element of hyperAction) {
            let m: any = {};
            m.reportFrom = element.action.reportFrom;
            m.params = {};
            if (element.action.reportFrom == "jasper") {
              m.reportName = element.action.reportName;
              for (const [i, e] of element.action.jasperParameter.entries()) {
                if (element.action.parameter[i] == "doptor_id") {
                  m.params[e] = user.doptorId;
                } else if (element.action.parameter[i] == "user_name") {
                  m.params[e] = user.name;
                } else {
                  m.params[e] = el[element.action.parameter[i]];
                }
              }
            } else if (element.action.reportFrom == "database" && element.action.parameter.length > 0) {
              for (const [i, e] of element.action.parameter.entries()) {
                if (e == "doptor_id") {
                  m.params[e] = user.doptorId;
                } else if (e == "user_name") {
                  m.params[e] = user.name;
                } else {
                  m.params[e] = el[e];
                }
              }
            }
            el["actionTakenForHyper"] = m;
          }
        }
      }

      result =
        result.length > 0
          ? result.map((e, i) => {
              return {
                serial: this.engToBang(String(i + 1)),
                samity_name: e.samity_name,
                samity_code: this.engToBang(e.samity_code),
                income: this.engToBang(e.income),
                expense: this.engToBang(e.expense),
                audit_fee: this.engToBang(e.audit_fee),
                audit_fee_collection: this.engToBang(e.audit_fee_collection),
                cdf_fee: this.engToBang(e.cdf_fee),
                cdf_fee_collection: this.engToBang(e.cdf_fee_collection),
                actionTakenForHyper: e.actionTakenForHyper,
              };
            })
          : [
              {
                samity_name: "",
                samity_code: "",
                income: "",
                expense: "",
                audit_fee: "",
                audit_fee_collection: "",
                cdf_fee: "",
                cdf_fee_collection: "",
                actionTakenForHyper: {},
              },
            ];

      const returnResult = [];
      for (const [index, element] of result.entries()) {
        const keys = Object.keys(element);
        let obj: any = {};
        for (const e of keys) {
          if (e != "actionTakenForHyper") {
            const name = this.englishToBanglaInterCeptor(e);
            name == "সমিতির ধরণ"
              ? (obj[name] = this.samityLevelChange(element.samity_level))
              : (obj[name] = element[e]);
          } else {
            obj[e] = element[e];
          }
        }
        returnResult.push(obj);
      }
      return { data: returnResult, alignItems: {} };
    } else if (type == "manualApplication" && user.type == "user" && query.officeId) {
      const sql = `SELECT DISTINCT ON (A.Id) A.Id,
      A.Samity_level,
      A.Samity_name,
      A.Samity_code,
      To_char(A.Samity_formation_date,
    
        'DD/MM/YYYY') AS Samity_formation_date,
      To_char(A.Samity_registration_date,
    
        'DD/MM/YYYY') AS Samity_registration_date,
      A.Old_registration_no,
      St.Type_name,
      Eo.Org_name_bangla AS Org_name_bangla,
      M.Project_name_bangla AS Project_name_bangla,
      CASE A.Samity_effectiveness
              WHEN 'A' THEN 'কার্যকর'
              WHEN 'I' THEN 'অকার্যকর'
              WHEN 'R' THEN 'অবসায়নে ন্যস্ত'
              ELSE 'বিদ্যমান নেই'
      END AS Samity_effectiveness,
      Concat(A.Samity_details_address,
        ', ',
        Ut.Uni_thana_paw_name_bangla,
        ', ',
        Uc.Upa_city_name_bangla,
        ', ',
        Di.District_name_bangla,
        ', ',
        Dv.Division_name_bangla) AS Samity_details_address,
    
      (SELECT STRING_AGG(CONCAT(Details_address, '', ' ', Uni_thana_paw_name_bangla, '', ', ', Upa_city_name_bangla, ''), ', ') 
    FROM
      (SELECT Details_address,
          Upa_city_name_bangla,
          Uni_thana_paw_name_bangla
        FROM
          (SELECT Ma.Samity_id Samity_id, Mb.Upa_city_name_bangla Upa_city_name_bangla
            FROM Coop.Member_area Ma,
              Master.Mv_union_thana_paurasabha_info Mb
            WHERE Ma.Upa_city_id = Mb.Upa_city_id
              AND Ma.Upa_city_type = Mb.Upa_city_type
              AND Ma.Samity_id = A.Id)Aa
        FULL JOIN
          (SELECT Ma.Samity_id Samity_id, Mb.Uni_thana_paw_name_bangla Uni_thana_paw_name_bangla
            FROM Coop.Member_area Ma,
              Master.Mv_union_thana_paurasabha_info Mb
            WHERE Ma.Uni_thana_paw_type = Mb.Uni_thana_paw_type
              AND Ma.Uni_thana_paw_id = Mb.Uni_thana_paw_id
              AND Ma.Samity_id = A.Id)Bb ON Aa.Samity_id = Bb.Samity_id
        FULL JOIN
          (SELECT Ma.Samity_id Samity_id, Details_address Details_address
            FROM Coop.Member_area Ma
            WHERE Ma.Samity_id = A.Id)Cc ON Aa.Samity_id = Cc.Samity_id
        AND Bb.Samity_id = Cc.Samity_id
        GROUP BY Upa_city_name_bangla,
          Uni_thana_paw_name_bangla,
          Details_address) Dd) AS Member_area,
    
      (SELECT STRING_AGG(CONCAT(Details_address, '', ' ', Uni_thana_paw_name_bangla, '', ', ', Upa_city_name_bangla, ''), ', ') 
    FROM
      (SELECT Details_address,
          Upa_city_name_bangla,
          Uni_thana_paw_name_bangla
        FROM
          (SELECT Ma.Samity_id Samity_id, Mb.Upa_city_name_bangla Upa_city_name_bangla
            FROM Coop.Working_area Ma,
              Master.Mv_union_thana_paurasabha_info Mb
            WHERE Ma.Upa_city_id = Mb.Upa_city_id
              AND Ma.Upa_city_type = Mb.Upa_city_type
              AND Ma.Samity_id = A.Id)Aa
        FULL JOIN
          (SELECT Ma.Samity_id Samity_id, Uni_thana_paw_name_bangla Uni_thana_paw_name_bangla
            FROM Coop.Working_area Ma,
              Master.Mv_union_thana_paurasabha_info Mb
            WHERE Ma.Uni_thana_paw_type = Mb.Uni_thana_paw_type
              AND Ma.Uni_thana_paw_id = Mb.Uni_thana_paw_id
              AND Ma.Samity_id = A.Id)Bb ON Aa.Samity_id = Bb.Samity_id
        FULL JOIN
          (SELECT Ma.Samity_id Samity_id, Details_address Details_address
            FROM Coop.Working_area Ma
            WHERE Ma.Samity_id = A.Id)Cc ON Aa.Samity_id = Cc.Samity_id
        AND Bb.Samity_id = Cc.Samity_id
        GROUP BY Upa_city_name_bangla,
          Uni_thana_paw_name_bangla,
          Details_address) Dd) AS Working_area,
      Mo.Member_name_bangla,
      Sa.Nid,
      Mo.Mobile,
      CASE
              WHEN Sd.Document_name IS NOT NULL THEN 'আছে'
              ELSE 'নাই'
      END AS Document_name
    FROM Coop.Samity_info A
    LEFT JOIN Master.Project_info M ON A.Project_id = M.Id
    LEFT JOIN Master.Enterprising_org Eo ON A.Enterprising_id = Eo.Id
    LEFT JOIN Master.Mv_union_thana_paurasabha_info Ut ON A.Samity_uni_thana_paw_id = Ut.Uni_thana_paw_id
    LEFT JOIN Master.Mv_upazila_city_info Uc ON A.Samity_upa_city_id = Uc.Upa_city_id
    LEFT JOIN Master.Division_info Dv ON A.Samity_division_id = Dv.Id
    LEFT JOIN Master.District_info Di ON A.Samity_district_id = Di.Id
    LEFT JOIN Coop.Samity_type St ON A.Samity_type_id = St.Id
    LEFT JOIN Coop.Samity_authorized_person Sa ON A.Id = Sa.Samity_id
    LEFT JOIN Coop.Member_info Mo ON Mo.Id = Sa.Member_id
    LEFT JOIN Coop.Samity_document Sd ON A.Id = Sd.Samity_id
    AND Sd.Document_id = 18
    WHERE A.Office_id = $1
      AND A.Is_manual = TRUE
      ORDER BY A.Id`;

      let result = (await (await pgConnect.getConnection("slave")).query(sql, [query.officeId])).rows;

      const reportInfoSql = `select data from coop.report_info where form_name = $1`;
      let reportInfo = (
        await (await pgConnect.getConnection("slave")).query(reportInfoSql, [query.formName])
      ).rows[0]?.data?.filter((e: any) => e.type_name == type);

      reportInfo = reportInfo ? toCamelKeys(reportInfo) : reportInfo;
      const hyperAction = reportInfo[0].hyperLinkAction;

      if (result.length > 0) {
        for (const el of result) {
          for (const element of hyperAction) {
            let m: any = {};
            m.reportFrom = element.action.reportFrom;
            m.params = {};
            if (element.action.reportFrom == "jasper") {
              m.reportName = element.action.reportName;
              for (const [i, e] of element.action.jasperParameter.entries()) {
                if (element.action.parameter[i] == "doptor_id") {
                  m.params[e] = user.doptorId;
                } else if (element.action.parameter[i] == "user_name") {
                  m.params[e] = user.name;
                } else {
                  m.params[e] = el[element.action.parameter[i]];
                }
              }
            } else if (element.action.reportFrom == "database" && element.action.parameter.length > 0) {
              for (const [i, e] of element.action.parameter.entries()) {
                if (e == "doptor_id") {
                  m.params[e] = user.doptorId;
                } else if (e == "user_name") {
                  m.params[e] = user.name;
                } else {
                  m.params[e] = el[e];
                }
              }
            }
            el["actionTakenForHyper"] = m;
          }
        }
      }

      result =
        result.length > 0
          ? result.map((e, i) => {
              return {
                serial: this.engToBang(String(i + 1)),
                samity_level: e.samity_level,
                samity_name: e.samity_name,
                samity_code: this.engToBang(e.samity_code),
                samity_formation_date: e.samity_formation_date,
                samity_registration_date: e.samity_registration_date,
                old_registration_no: e.old_registration_no,
                type_name: e.type_name,
                org_name_bangla: e.org_name_bangla,
                project_name_bangla: e.project_name_bangla,
                samity_effectiveness: e.samity_effectiveness,
                samity_details_address: e.samity_details_address,
                member_area: e.member_area,
                working_area: e.working_area,
                authorized_person: e.member_name_bangla,
                nidOrBrn: this.engToBang(e.nid),
                mobile: this.engToBang(e.mobile),
                samity_certificate: e.document_name,
                actionTakenForHyper: e.actionTakenForHyper,
              };
            })
          : [
              {
                samity_level: "",
                samity_name: "",
                samity_code: "",
                samity_formation_date: "",
                samity_registration_date: "",
                old_registration_no: "",
                type_name: "",
                org_name_bangla: "",
                project_name_bangla: "",
                samity_effectiveness: "",
                samity_details_address: "",
                member_area: "",
                working_area: "",
                authorized_person: "",
                nidOrBrn: "",
                mobile: "",
                samity_certificate: "",
                actionTakenForHyper: {},
              },
            ];

      const returnResult = [];
      for (const [index, element] of result.entries()) {
        const keys = Object.keys(element);
        let obj: any = {};
        for (const e of keys) {
          if (e != "actionTakenForHyper") {
            const name = this.englishToBanglaInterCeptor(e);
            name == "সমিতির ধরণ"
              ? (obj[name] = this.samityLevelChange(element.samity_level))
              : (obj[name] = element[e]);
          } else {
            obj[e] = element[e];
          }
        }
        returnResult.push(obj);
      }
      return { data: returnResult, alignItems: {} };
    }
  }

  englishToBanglaInterCeptor(name: any) {
    if (name == "id") {
      return "আইডি";
    } else if (name == "name") {
      return "আবেদনকারীর নাম";
    } else if (name == "email") {
      return "ইমেইল";
    } else if (name == "roles") {
      return "রোল নাম";
    } else if (name == "samity_name") {
      return "সমিতির নাম";
    } else if (name == "samity_level") {
      return "সমিতির ধরণ";
    } else if (name == "samity_code") {
      return "সমিতির নিবন্ধন নম্বর";
    } else if (name == "type_name") {
      return "সমিতির ক্যাটাগরি";
    } else if (name == "org_name_bangla") {
      return "উদ্যোগী সংস্থার নাম";
    } else if (name == "member_code") {
      return "সদস্য নম্বর";
    } else if (name == "member_name_bangla") {
      return "সদস্যের নাম";
    } else if (name == "nidOrBrn") {
      return "এনআইডি/জন্ম নিবন্ধন";
    } else if (name == "mobile") {
      return "মোবাইল নম্বর";
    } else if (name == "father_name") {
      return "পিতার নাম";
    } else if (name == "address") {
      return "ঠিকানা";
    } else if (name == "committee_type") {
      return "কমিটির ধরন";
    } else if (name == "committee_status") {
      return "কমিটির অবস্থা";
    } else if (name == "election_date") {
      return "নির্বাচনের তারিখ";
    } else if (name == "effect_date") {
      return "মেয়াদ শুরুর তারিখ";
    } else if (name == "effect_date") {
      return "মেয়াদ শুরুর তারিখ";
    } else if (name == "expire_date") {
      return "মেয়াদ শেষের তারিখ";
    } else if (name == "duration") {
      return "মেয়াদকাল";
    } else if (name == "no_of_member") {
      return "কমিটির সদস্য সংখ্যা";
    } else if (name == "serial") {
      return "ক্রমিক";
    } else if (name == "committee_role") {
      return "কমিটি পদবী";
    } else if (name == "committee_president_name") {
      return "সভাপতি";
    } else if (name == "service_name") {
      return "সেবার নাম";
    } else if (name == "manualOrApplicable") {
      return "অনলাইনকৃত/নিবন্ধিত";
    } else if (name == "no_of_share") {
      return "শেয়ার সংখ্যা";
    } else if (name == "share_amount") {
      return "শেয়ার মূলধন";
    } else if (name == "loan_outstanding") {
      return "ঋণ";
    } else if (name == "close_date") {
      return "বাতিলের তারিখ";
    } else if (name == "abaremarks") {
      return "অবসায়নের কারণ";
    } else if (name == "biniremarks") {
      return "বিনিয়োগের কারণ";
    } else if (name == "workflow") {
      return "কর্মকান্ড";
    } else if (name == "designation") {
      return "আবেদনকারীদের নাম";
    } else if (name == "start_year") {
      return "অর্থ বছর";
    } else if (name == "income") {
      return "আয়";
    } else if (name == "expense") {
      return "ব্যয়";
    } else if (name == "audit_fee") {
      return "নিরীক্ষা ফি";
    } else if (name == "audit_fee_collection") {
      return "নিরীক্ষা ফি আদায়";
    } else if (name == "cdf_fee") {
      return "সিডিএফ ফি";
    } else if (name == "cdf_fee_collection") {
      return "সিডিএফ ফি আদায়";
    } else if (name == "samity_details_address") {
      return "বিস্তারিত ঠিকানা";
    } else if (name == "project_name_bangla") {
      return "প্রকল্পের নাম";
    } else if (name == "member_area") {
      return "সদস্য নির্বাচনী এলাকা";
    } else if (name == "working_area") {
      return "কর্ম এলাকা";
    } else if (name == "samity_formation_date") {
      return "সমিতি গঠনের তারিখ";
    } else if (name == "samity_registration_date") {
      return "সমিতি নিবন্ধনের তারিখ";
    } else if (name == "old_registration_no") {
      return "মূল নিবন্ধন নম্বর";
    } else if (name == "samity_effectiveness") {
      return "সমিতির অবস্থা";
    } else if (name == "samity_certificate") {
      return "সমিতির সার্টিফিকেট";
    } else if (name == "authorized_person") {
      return "অথরাইজড পারসন";
    } else {
      return "সমিতির ক্যাটাগরি";
    }
  }

  samityLevelChange(samityLevel: string) {
    if (samityLevel == "P") {
      return "প্রাথমিক";
    }
    if (samityLevel == "C") {
      return "কেন্দ্রীয়";
    }
    if (samityLevel == "N") {
      return "জাতীয়";
    }
  }

  engToBang(str: string) {
    let banglaNumber: any = {
      0: "০",
      1: "১",
      2: "২",
      3: "৩",
      4: "৪",
      5: "৫",
      6: "৬",
      7: "৭",
      8: "৮",
      9: "৯",
      "/": "/",
      ".": ".",
    };
    const arrStr = str.split("");
    str = "";
    for (const element of arrStr) {
      str = str + banglaNumber[element];
    }
    return str;
  }

  committeeLevelChange(committee_type: string) {
    if (committee_type == "S") {
      return "অনুমোদিত প্রথম কমিটি";
    }
    if (committee_type == "E") {
      return "নির্বাচিত কমিটি";
    }
    if (committee_type == "EC") {
      return "নির্বাচন কমিটি";
    }
    if (committee_type == "I") {
      return "অন্তবর্তী কমিটি";
    }
  }
}
