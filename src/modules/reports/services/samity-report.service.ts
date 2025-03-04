import { fi } from "date-fns/locale";
import { toCamelKeys } from "keys-transform";
import _ from "lodash";
import moment from "moment-timezone";
import Container, { Service } from "typedi";
import { default as db, default as pgConnect } from "../../../db/connection.db";
import ServiceInfoServices from "../../../modules/application/services/service-info.service";
import DataService from "../../../modules/master/services/master-data.service";
import ZoneService from "../../../modules/master/services/zone.service";
import SamityService from "../../../modules/samity/services/samity.service";
import { emptyPaginationResponse, getPaginationDetails } from "../../../utils/pagination.util";
@Service()
export default class SamityReportService {
  constructor() {}

  async getSamity(
    userId: any,
    officeId: any,
    doptorId: any,
    districtId: any,
    upazilaID: any,
    projectId: any,
    flag: any,
    value: any
  ): Promise<any> {
    const pool = db.getConnection("slave");
    let sql: any;
    let samityInfo = [] as any;
    if (value == 1) {
      sql = `SELECT id, samity_name FROM samity.samity_info 
                WHERE doptor_id = $1 AND office_id = $2 AND district_id = $3 AND upazila_id = $4 AND project_id = $5 AND flag = $6`;
      samityInfo = await await pool.query(sql, [doptorId, officeId, districtId, upazilaID, projectId, flag]);
    } else if (value == 2) {
      sql = `SELECT data::json->'basic'->'samity_name' as samity_name, id FROM temps.staging_area
                WHERE user_id = $1 AND doptor_id = $2 AND district_id = $3 AND upazila_id = $4 AND project_id = $5`;
      samityInfo = await await pool.query(sql, [userId, doptorId, districtId, upazilaID, projectId]);
    }
    return samityInfo.rows.length > 0 ? (toCamelKeys(samityInfo.rows) as any) : [];
  }

  async getSamityName(officeId: any, doptorId: any, projectId: any): Promise<any> {
    const pool = db.getConnection("slave");
    let sql: any;
    let samityInfo = [] as any;
    sql = `SELECT id, samity_name FROM samity.samity_info WHERE doptor_id = $1 AND office_id = $2 AND project_id = $3 AND flag IN ('2','3')`;
    samityInfo = await await pool.query(sql, [doptorId, officeId, projectId]);
    return samityInfo.rows.length > 0 ? (toCamelKeys(samityInfo.rows) as any) : [];
  }

  async getSamityNameList(
    userId: any,
    officeId: any,
    doptorId: any,
    districtId: any,
    upazilaID: any,
    upaCityType: any,
    projectId: any,
    value: any
  ): Promise<any> {
    const pool = db.getConnection("slave");
    let sql: any;
    let samityInfo = [] as any;
    if (value == 1) {
      sql = `SELECT id, samity_name FROM samity.samity_info WHERE doptor_id = $1 AND office_id = $2 AND district_id = $3 AND upa_city_id = $4 AND upa_city_type = $5 AND project_id = $6`;
      samityInfo = await await pool.query(sql, [doptorId, officeId, districtId, upazilaID, upaCityType, projectId]);
    } else if (value == 2) {
      sql = `SELECT data::json->'basic'->'samity_name' as samity_name, id FROM temps.staging_area
                WHERE user_id = $1 AND doptor_id = $2 AND district_id = $3 AND upa_city_id = $4 AND upa_city_type = $5 AND project_id = $6`;
      samityInfo = await await pool.query(sql, [userId, doptorId, districtId, upazilaID, upaCityType, projectId]);
    }
    return samityInfo.rows.length > 0 ? (toCamelKeys(samityInfo.rows) as any) : [];
  }
  async getSamityNameBasedOnOffice(officeId: any, doptorId: any, projectId: any, value: any): Promise<any> {
    const pool = db.getConnection("slave");
    let sql: any;
    let samityInfo = [] as any;
    if (value == 1) {
      sql = `SELECT id, samity_name FROM samity.samity_info 
                WHERE doptor_id = $1 AND office_id = $2 and project_id = $3`;
      samityInfo = await await pool.query(sql, [doptorId, officeId, projectId]);
    } else if (value == 2) {
      sql = `SELECT data::json->'basic'->'samity_name' as samity_name, id FROM temps.staging_area
                WHERE doptor_id = $1 AND office_id = $2 and project_id = $3`;
      samityInfo = await await pool.query(sql, [doptorId, officeId, projectId]);
    }
    return samityInfo.rows.length > 0 ? (toCamelKeys(samityInfo.rows) as any) : [];
  }

  async getSamityReport(districtId: any, upazilaId: any, id: any): Promise<any> {
    const pool = db.getConnection("slave");
    let sql: string;
    let samityInfo;
    sql = `SELECT distinct a.samity_code, INITCAP (a.samity_name) samity_name, INITCAP (f.institute_name) || ' ' || '(' || f.institute_code || ')' INSTITUTE_NAME, INITCAP (b.customer_code) customer_code,
        INITCAP (b.name_en) name_en, INITCAP (b.name_en) name_bn, INITCAP (b.father_name) father_name, INITCAP (b.mother_name) mother_name, 
		INITCAP (e.guardian_name) guardian_name, b.birth_date, b.age, b.mobile, d.document_no, d.doc_type_id
        FROM samity.samity_info a, samity.customer_info b, samity.nominee_info c, loan.document_info d, samity.guardian_info e, samity.institution_info f
        WHERE a.id = b.samity_id and b.id = c.customer_id and b.id = d.ref_no and b.id = e.ref_no and a.id = f.samity_id AND district_id = $1 AND upazila_id = $2 AND a.id = $3 `;
    samityInfo = await (await pool.query(sql, [districtId, upazilaId, id])).rows;

    return samityInfo.length > 0 ? (toCamelKeys(samityInfo) as any) : undefined;
  }

  async getMemberReport(page: any, limit: any, officeId: any, id: any): Promise<any> {
    const pool = db.getConnection("slave");
    let sql: string;
    let memberInfo;
    const zoneService: ZoneService = Container.get(ZoneService);
    const samityService: SamityService = Container.get(SamityService);
    const dataService: DataService = Container.get(DataService);
    var docData: any = {
      own: null,
    };
    sql = `
    SELECT 
      DISTINCT INITCAP (c.doptor_name) doptor_name, 
      INITCAP (c.doptor_name_bangla) doptor_name_bangla, 
      INITCAP (d.name) office_name, 
      INITCAP (d.name_bn) office_name_bangla, 
      INITCAP (e.project_name) project_name, 
      INITCAP (e.project_name_bangla) project_name_bangla, 
      INITCAP (b.samity_name) samity_name, 
      f.district_name, 
      f.district_name_bangla, 
      g.upazila_name, 
      g.upazila_name_bangla, 
      h.union_name, 
      h.union_name_bangla, 
      INITCAP (i.institute_name) institute_name, 
      i.institute_code, 
      i.institute_address, 
      a.id,
      INITCAP (a.customer_code) customer_code, 
      INITCAP (a.name_en) name_en, 
      INITCAP (a.name_bn) name_bn, 
      INITCAP (a.father_name) father_name, 
      INITCAP (a.mother_name) mother_name, 
      a.mobile
    FROM 
      samity.customer_info a 
      LEFT JOIN samity.samity_info b ON b.id = a.samity_id 
      LEFT JOIN master.doptor_info c ON c.id = b.doptor_id 
      LEFT JOIN master.office_info d ON d.id = b.office_id 
      LEFT JOIN master.project_info e ON e.id = b.project_id 
      LEFT JOIN master.district_info f ON b.district_id = f.id 
      LEFT JOIN master.upazila_info g ON b.upazila_id = g.id 
      LEFT JOIN master.union_info h ON b.union_id = h.id 
      LEFT JOIN samity.institution_info i ON b.id = i.samity_id 
    WHERE 
      b.office_id = $1 
      AND b.id = $2`;
    if (page > 0 && limit > 0) {
      const countSql = `
                      SELECT COUNT(a.id) 
                        FROM
                          samity.customer_info a 
                          LEFT JOIN
                            samity.samity_info b 
                            ON b.id = a.samity_id
                        WHERE
                        b.office_id = $1 
                          AND b.id = $2`;
      const count = await (await pool.query(countSql, [officeId, id])).rows[0].count;

      const pagination = getPaginationDetails(page, count, limit);
      if (pagination === undefined) return emptyPaginationResponse(page, limit);
      memberInfo = await (
        await pool.query(sql + ` LIMIT $3 OFFSET $4`, [officeId, id, pagination.limit, pagination.skip])
      ).rows;
      for (const [i, v] of memberInfo.entries()) {
        let presentAddress = await zoneService.getZoneName(
          v.address_data.pre.district_id,
          v.address_data.pre.upazila_id,
          v.address_data.pre.union_id
        );
        let permanentAddress = await zoneService.getZoneName(
          v.address_data.per.district_id,
          v.address_data.per.upazila_id,
          v.address_data.per.union_id
        );
        memberInfo[i].address_data.pre = {
          ...presentAddress,
          village: v.address_data.pre.village,
          postCode: v.address_data.pre.post_code,
        };
        memberInfo[i].address_data.per = {
          ...permanentAddress,
          village: v.address_data.per.village,
          postCode: v.address_data.per.post_code,
        };

        const nidDocTypeId = await dataService.getDocTypeId("NID", pool);
        const pImageDocTypeId = await dataService.getDocTypeId("PIM", pool);
        const signDocTypeId = await dataService.getDocTypeId("SIN", pool);
        // const dImageDocTypeId = await dataService.getDocTypeId("DIM");

        // let fatherDocInfo = await samityService.getMembersDocuments(
        //   v.id,
        //   "F",
        //   nidDocTypeId
        // );
        // let motherDocInfo = await samityService.getMembersDocuments(
        //   v.id,
        //   "M",
        //   nidDocTypeId
        // );
        let ownDocInfoNid = await samityService.getMembersDocuments(v.id, "W", nidDocTypeId);
        let ownDocInfoPImage = await samityService.getMembersDocuments(v.id, "W", pImageDocTypeId);
        let ownDocInfoSign = await samityService.getMembersDocuments(v.id, "W", signDocTypeId);
        // let nomineeDocInfoNid = await samityService.getMembersDocuments(
        //   v.id,
        //   "N",
        //   nidDocTypeId
        // );
        // let nomineeDocInfoPImage = await samityService.getMembersDocuments(
        //   v.id,
        //   "N",
        //   pImageDocTypeId
        // );
        // let nomineeDocInfoSign = await samityService.getMembersDocuments(
        //   v.id,
        //   "N",
        //   signDocTypeId
        // );
        // let guardianDocInfo = await samityService.getMembersDocuments(
        //   v.id,
        //   "G",
        //   nidDocTypeId
        // );

        // docData.father = fatherDocInfo[0];
        // docData.mother = motherDocInfo[0];
        docData.own = {
          memberDoc: ownDocInfoNid[0].documentNo,
          memberImage: ownDocInfoPImage[0].documentNo,
          memberSign: ownDocInfoSign[0].documentNo,
        };
        // docData.nominee = {
        //   nomineeNid: nomineeDocInfoNid,
        //   nomineePImage: nomineeDocInfoPImage,
        //   nomineeSign: nomineeDocInfoSign,
        // };
        // docData.guardian = guardianDocInfo[0];
        memberInfo[i].docData = docData;
      }

      return {
        limit: limit,
        currentPage: page,
        totalPages: pagination.total ?? 0,
        count: count,
        data: toCamelKeys(memberInfo) as any,
      };
    } else {
      memberInfo = await (await pool.query(sql, [officeId, id])).rows;
      for (const [i, v] of memberInfo.entries()) {
        let preAddress = await samityService.getMembersAddress(v.id, 1);
        let perAddress = await samityService.getMembersAddress(v.id, 2);
        let presentAddress = await zoneService.getZoneName(
          preAddress.districtId,
          preAddress.upaCityId,
          preAddress.uniThanaPawId
        );

        let permanentAddress = await zoneService.getZoneName(
          perAddress.districtId,
          perAddress.upaCityId,
          perAddress.uniThanaPawId
        );

        memberInfo[i].presentAddress = {
          ...presentAddress,
          village: preAddress.village,
          postCode: preAddress.postCode,
        };
        memberInfo[i].permanentAddress = {
          ...permanentAddress,
          village: perAddress.village,
          postCode: perAddress.postCode,
        };

        const nidDocTypeId = await dataService.getDocTypeId("NID", pool);
        const pImageDocTypeId = await dataService.getDocTypeId("PIM", pool);
        const signDocTypeId = await dataService.getDocTypeId("SIN", pool);
        // const dImageDocTypeId = await dataService.getDocTypeId("DIM");

        // let fatherDocInfo = await samityService.getMembersDocuments(
        //   v.id,
        //   "F",
        //   nidDocTypeId
        // );
        // let motherDocInfo = await samityService.getMembersDocuments(
        //   v.id,
        //   "M",
        //   nidDocTypeId
        // );
        let ownDocInfoNid = await samityService.getMembersDocuments(v.id, "W", nidDocTypeId);
        let ownDocInfoPImage = await samityService.getMembersDocuments(v.id, "W", pImageDocTypeId);
        let ownDocInfoSign = await samityService.getMembersDocuments(v.id, "W", signDocTypeId);
        // let nomineeDocInfoNid = await samityService.getMembersDocuments(
        //   v.id,
        //   "N",
        //   nidDocTypeId
        // );
        // let nomineeDocInfoPImage = await samityService.getMembersDocuments(
        //   v.id,
        //   "N",
        //   pImageDocTypeId
        // );
        // let nomineeDocInfoSign = await samityService.getMembersDocuments(
        //   v.id,
        //   "N",
        //   signDocTypeId
        // );
        // let guardianDocInfo = await samityService.getMembersDocuments(
        //   v.id,
        //   "G",
        //   nidDocTypeId
        // );

        // docData.father = fatherDocInfo[0];
        // docData.mother = motherDocInfo[0];
        docData.own = {
          memberDoc: ownDocInfoNid[0].documentNo,
          memberImage: ownDocInfoPImage[0].documentNo,
          memberSign: ownDocInfoSign[0].documentNo,
        };
        // docData.nominee = {
        //   nomineeNid: nomineeDocInfoNid,
        //   nomineePImage: nomineeDocInfoPImage,
        //   nomineeSign: nomineeDocInfoSign,
        // };
        // docData.guardian = guardianDocInfo[0];
        memberInfo[i].docData = docData;
      }

      return memberInfo[0] ? (toCamelKeys(memberInfo) as any) : [];
    }
  }
  async getByType(type: string, query: any, user: any, doptorId: number) {
    // if (type == "samitySummaryByUserOffice" && user.type == "user") {
    //   const sql = `SELECT
    //                  A.primary_samity_approve,
    //                  B.primary_samity_pending,
    //                  C.primary_samity_reject,
    //                  D.center_samity_approve,
    //                  E.center_samity_pending,
    //                  F.center_samity_reject,
    //                  G.national_samity_approve,
    //                  H.national_samity_pending,
    //                  I.national_samity_reject
    //                FROM
    //                  (
    //                    SELECT
    //                    count(id) AS primary_samity_approve
    //                  FROM
    //                    coop.samity_info
    //                  WHERE
    //                    samity_level='P' and office_id= $1) A ,
    //                  (
    //                  SELECT
    //                    count(id) AS primary_samity_pending
    //                  FROM
    //                    coop.application
    //                  WHERE
    //                    service_id = 2
    //                    AND DATA->'office_id' = $2
    //                    AND DATA->>'samity_level' = 'P'
    //                    AND status = 'P' ) B ,
    //                  (
    //                  SELECT
    //                    count(id) AS primary_samity_reject
    //                  FROM
    //                    coop.application
    //                  WHERE
    //                    service_id = 2
    //                    AND DATA->'office_id' = $3
    //                    AND DATA->>'samity_level' = 'P'
    //                    AND status = 'R' ) C,
    //                  (
    //                  SELECT
    //                    count(id) AS center_samity_approve
    //                    FROM
    //                    coop.samity_info
    //                  WHERE
    //                    samity_level='C' and office_id= $4 ) D ,
    //                  (
    //                  SELECT
    //                    count(id) AS center_samity_pending
    //                  FROM
    //                    coop.application
    //                  WHERE
    //                    service_id = 2
    //                    AND DATA->'office_id' = $5
    //                    AND DATA->>'samity_level' = 'C'
    //                    AND status = 'P' ) E ,
    //                  (
    //                  SELECT
    //                    count(id) AS center_samity_reject
    //                  FROM
    //                    coop.application
    //                  WHERE
    //                    service_id = 2
    //                    AND DATA->'office_id' = $6
    //                    AND DATA->>'samity_level' = 'C'
    //                    AND status = 'R' ) F,
    //                  (
    //                  SELECT
    //                    count(id) AS national_samity_approve
    //                    FROM
    //                    coop.samity_info
    //                  WHERE
    //                    samity_level='N' and office_id= $7 ) G ,
    //                  (
    //                  SELECT
    //                    count(id) AS national_samity_pending
    //                  FROM
    //                    coop.application
    //                  WHERE
    //                    service_id = 2
    //                    AND DATA->'office_id' = $8
    //                    AND DATA->>'samity_level' = 'N'
    //                    AND status = 'P' ) H ,
    //                  (
    //                  SELECT
    //                    count(id) AS national_samity_reject
    //                  FROM
    //                    coop.application
    //                  WHERE
    //                    service_id = 2
    //                    AND DATA->'office_id' = $9
    //                    AND DATA->>'samity_level' = 'N'
    //                    AND status = 'R' ) I`;

    //   console.log(query.officeId);
    //   const result: any = toCamelKeys(
    //     (
    //       await (
    //         await pgConnect.getConnection("slave")
    //       ).query(sql, [
    //         query.officeId,
    //         query.officeId,
    //         query.officeId,
    //         query.officeId,
    //         query.officeId,
    //         query.officeId,
    //         query.officeId,
    //         query.officeId,
    //         query.officeId,
    //       ])
    //     ).rows[0]
    //   );

    //   console.log(query.officeId);
    //   console.log({ result });
    //   if (result) {
    //     return {
    //       data: [
    //         {
    //           "সমিতি টাইপ": "প্রাথমিক সমিতি",
    //           "নিবন্ধন প্রদান": result.primarySamityApprove,
    //           "অপেক্ষমান নিবন্ধন": result.primarySamityPending,
    //           "নিবন্ধন প্রত্যাখান": result.primarySamityReject,
    //         },
    //         {
    //           "সমিতি টাইপ": "কেন্দ্রীয় সমিতি",
    //           "নিবন্ধন প্রদান": result.centerSamityApprove,
    //           "অপেক্ষমান নিবন্ধন": result.centerSamityPending,
    //           "নিবন্ধন প্রত্যাখান": result.centerSamityReject,
    //         },
    //         {
    //           "সমিতি টাইপ": "জাতীয় সমিতি",
    //           "নিবন্ধন প্রদান": result.nationalSamityApprove,
    //           "অপেক্ষমান নিবন্ধন": result.nationalSamityPending,
    //           "নিবন্ধন প্রত্যাখান": result.nationalSamityReject,
    //         },
    //       ],
    //       alignItems: {
    //         "সমিতি টাইপ": "left",
    //         "নিবন্ধন প্রদান": "center",
    //         "অপেক্ষমান নিবন্ধন": "center",
    //         "নিবন্ধন প্রত্যাখান": "center",
    //       },
    //     };
    //   }

    //   return {
    //     data: result ? toCamelKeys(result) : result,
    //     alignItems: {
    //       "সমিতি টাইপ": "left",
    //       "নিবন্ধন প্রদান": "center",
    //       "অপেক্ষমান নিবন্ধন": "center",
    //       "নিবন্ধন প্রত্যাখান": "center",
    //     },
    //   };
    // } else if (type == "samityDetails" && user.type == "user") {
    //   const sql = `select
    //                 a.id,
    //                 a.samity_name,
    //                 a.samity_level,
    //                 a.samity_code,
    //                 b.type_name,
    //                 c.org_name_bangla,
    //                 a.is_manual
    //                from
    //                   coop.samity_info a
    //                   inner join coop.samity_type b on a.samity_type_id=b.id
    //                   inner join master.enterprising_org c on a.enterprising_id=c.id
    //                 where a.office_id=$1 order by id`;
    //   let result = (await (await pgConnect.getConnection("slave")).query(sql, [query.officeId])).rows;

    //   const reportInfoSql = `select data from report_info where form_name = $1`;
    //   let reportInfo = (
    //     await (await pgConnect.getConnection("slave")).query(reportInfoSql, [query.formName])
    //   ).rows[0]?.data?.filter((e: any) => e.type_name == type);

    //   reportInfo = reportInfo ? toCamelKeys(reportInfo) : reportInfo;
    //   const hyperAction = reportInfo[0].hyperLinkAction;

    //   if (result.length > 0) {
    //     for (const el of result) {
    //       for (const element of hyperAction) {
    //         let m: any = {};
    //         m.reportFrom = element.action.reportFrom;
    //         m.params = {};
    //         if (element.action.reportFrom == "jasper") {
    //           m.reportName = element.action.reportName;
    //           for (const [i, e] of element.action.jasperParameter.entries()) {
    //             if (element.action.parameter[i] == "doptor_id") {
    //               m.params[e] = user.doptorId;
    //             } else if (element.action.parameter[i] == "user_name") {
    //               m.params[e] = user.name;
    //             } else {
    //               m.params[e] = el[element.action.parameter[i]];
    //             }
    //           }
    //         } else if (element.action.reportFrom == "database" && element.action.parameter.length > 0) {
    //           for (const [i, e] of element.action.parameter.entries()) {
    //             if (e == "doptor_id") {
    //               m.params[e] = user.doptorId;
    //             } else if (e == "user_name") {
    //               m.params[e] = user.name;
    //             } else {
    //               m.params[e] = el[e];
    //             }
    //           }
    //         }
    //         el["actionTakenForHyper"] = m;
    //       }
    //     }
    //   }

    //   console.log("result ", result);

    //   result =
    //     result.length > 0
    //       ? result.map((e, i) => {
    //           return {
    //             serial: this.engToBang(String(i + 1)),
    //             samity_name: e.samity_name,
    //             manualOrApplicable: e.is_manual ? `অনলাইনকৃত` : `নিবন্ধিত`,
    //             samity_level: e.samity_level,
    //             samity_code: this.engToBang(e.samity_code),
    //             type_name: e.type_name,
    //             org_name_bangla: e.org_name_bangla,
    //             actionTakenForHyper: e.actionTakenForHyper,
    //           };
    //         })
    //       : [
    //           {
    //             samity_name: "",
    //             manualOrApplicable: "",
    //             samity_level: "",
    //             samity_code: "",
    //             type_name: "",
    //             org_name_bangla: "",
    //             actionTakenForHyper: {},
    //           },
    //         ];

    //   const returnResult = [];
    //   for (const [index, element] of result.entries()) {
    //     const keys = Object.keys(element);
    //     let obj: any = {};
    //     for (const e of keys) {
    //       if (e != "actionTakenForHyper") {
    //         const name = this.englishToBanglaInterCeptor(e);
    //         name == "সমিতির ধরণ"
    //           ? (obj[name] = this.samityLevelChange(element.samity_level))
    //           : (obj[name] = element[e]);
    //       } else {
    //         obj[e] = element[e];
    //       }
    //     }

    //     returnResult.push(obj);
    //   }
    //   return { data: returnResult, alignItems: {} };
    // } else if (type == "memberDetails" && user.type == "user" && query.samityId) {
    //   const sql = `SELECT
    //                  a.id,
    //                  a.member_code,
    //                  a.member_name_bangla,
    //                  a.father_name,
    //                  a.nid,
    //                  a.brn,
    //                  a.mobile,
    //                  (
    //                  SELECT
    //                    b.details_address || ',' ||
    //                        c.uni_thana_paw_name_bangla
    //                  FROM
    //                    coop.member_address_info b
    //                  LEFT JOIN master.mv_union_thana_paurasabha_info c ON
    //                    b.uni_thana_paw_id = c.uni_thana_paw_id
    //                  WHERE
    //                    b.member_id = a.id
    //                    AND b.address_type = 'PER') address
    //                FROM
    //                  coop.member_info a
    //                WHERE
    //                  a.samity_id = $1
    //                ORDER BY a.id`;

    //   let result = (await (await pgConnect.getConnection("slave")).query(sql, [query.samityId])).rows;

    //   const reportInfoSql = `select data from report_info where form_name = $1`;
    //   let reportInfo = (
    //     await (await pgConnect.getConnection("slave")).query(reportInfoSql, [query.formName])
    //   ).rows[0]?.data?.filter((e: any) => e.type_name == type);

    //   reportInfo = reportInfo ? toCamelKeys(reportInfo) : reportInfo;
    //   const hyperAction = reportInfo[0].hyperLinkAction;

    //   if (result.length > 0) {
    //     for (const el of result) {
    //       for (const element of hyperAction) {
    //         let m: any = {};
    //         m.reportFrom = element.action.reportFrom;
    //         if (element.action.reportFrom == "jasper") {
    //           m.reportName = element.action.reportName;

    //           m.params = {};
    //           for (const [i, e] of element.action.jasperParameter.entries()) {
    //             if (element.action.parameter[i] == "doptor_id") {
    //               m.params[e] = user.doptorId;
    //             } else if (element.action.parameter[i] == "user_name") {
    //               m.params[e] = user.name;
    //             } else {
    //               m.params[e] = el[element.action.parameter[i]];
    //             }
    //           }
    //         }
    //         el.actionTakenForHyper = m;
    //       }
    //     }
    //   }

    //   result =
    //     result.length > 0
    //       ? result.map((e) => {
    //           return {
    //             member_code: this.engToBang(e.member_code),
    //             member_name_bangla: e.member_name_bangla,
    //             father_name: e.father_name,
    //             nidOrBrn: e.nid ? this.engToBang(e.nid) : this.engToBang(e.brn),
    //             mobile: this.engToBang(e.mobile),
    //             address: e.address,
    //             actionTakenForHyper: e.actionTakenForHyper,
    //           };
    //         })
    //       : [
    //           {
    //             member_code: "",
    //             member_name_bangla: "",
    //             nid: "",
    //             mobile: "",
    //             actionTakenForHyper: {},
    //           },
    //         ];

    //   const returnResult = [];
    //   for (const [index, element] of result.entries()) {
    //     const keys = Object.keys(element);
    //     let obj: any = {};
    //     for (const e of keys) {
    //       if (e != "actionTakenForHyper") {
    //         const name = this.englishToBanglaInterCeptor(e);
    //         obj[name] = element[e];
    //       } else {
    //         obj[e] = element[e];
    //       }
    //     }

    //     returnResult.push(obj);
    //   }
    //   return { data: returnResult, alignItems: {} };
    // } else if (type == "samityCategory" && user.type == "user") {
    //   const sql = `select id, type_name from coop.samity_type order by id`;

    //   let result = (await (await pgConnect.getConnection("slave")).query(sql)).rows;

    //   result =
    //     result.length > 0
    //       ? result.map((e) => {
    //           return {
    //             id: e.id,
    //             type_name: e.type_name,
    //           };
    //         })
    //       : [
    //           {
    //             id: "",
    //             type_name: "",
    //           },
    //         ];

    //   const returnResult = [];
    //   for (const [index, element] of result.entries()) {
    //     const keys = Object.keys(element);
    //     let obj: any = {};
    //     for (const e of keys) {
    //       const name = this.englishToBanglaInterCeptor(e);
    //       obj[name] = element[e];
    //     }
    //     returnResult.push(obj);
    //   }
    //   return returnResult;
    // } else if (type == "committeeSummaryByUserOffice" && user.type == "user" && query.officeId) {
    //   const sql = `select
    //   a.id samity_id,
    //   a.samity_code,
    //   a.samity_name,
    //   a.samity_level,
    //   b.committee_type,
    //   b.election_date,
    //   b.effect_date,
    //   b.expire_date,
    //   b.duration,
    //   b.no_of_member,
    //   c.member_name as committee_president_name ,
    //   c.mobile_
    // from
    //   coop.samity_info a
    // left join coop.committee_info b on
    //   b.samity_id = a.id
    // left join coop.committee_member c on
    //     c.committee_id = b.id

    // where
    //   b.status = 'A'
    //   and a.office_id = $1 and c.committee_role_id =1
    // order by
    //   a.id`;

    //   let result = (await (await pgConnect.getConnection("slave")).query(sql, [query.officeId])).rows;

    //   const reportInfoSql = `select data from report_info where form_name = $1`;
    //   let reportInfo = (
    //     await (await pgConnect.getConnection("slave")).query(reportInfoSql, [query.formName])
    //   ).rows[0]?.data?.filter((e: any) => e.type_name == type);

    //   reportInfo = reportInfo ? toCamelKeys(reportInfo) : reportInfo;
    //   const hyperAction = reportInfo[0].hyperLinkAction;

    //   for (const el of result) {
    //     for (const element of hyperAction) {
    //       let m: any = {};
    //       m.reportFrom = element.action.reportFrom;
    //       if (element.action.reportFrom == "jasper") {
    //         m.reportName = element.action.reportName;
    //         m.params = {};
    //         for (const [i, e] of element.action.jasperParameter.entries()) {
    //           if (element.action.parameter[i] == "doptor_id") {
    //             m.params[e] = user.doptorId;
    //           } else if (element.action.parameter[i] == "user_name") {
    //             m.params[e] = user.name;
    //           } else {
    //             m.params[e] = el[element.action.parameter[i]];
    //           }
    //         }
    //       }
    //       el.actionTakenForHyper = m;
    //     }
    //   }

    //   // console.log("ttttt", t);

    //   result =
    //     result.length > 0
    //       ? result.map((e) => {
    //           return {
    //             committee_type: this.committeeLevelChange(e.committee_type),
    //             samity_name: e.samity_name,
    //             election_date: this.engToBang(
    //               moment(e.election_date).isValid() ? moment(e.election_date).format("DD/MM/YYYY") : ""
    //             ),
    //             effect_date: this.engToBang(
    //               moment(e.effect_date).isValid() ? moment(e.effect_date).format("DD/MM/YYYY") : ""
    //             ),
    //             expire_date: this.engToBang(
    //               moment(e.expire_date).isValid() ? moment(e.expire_date).format("DD/MM/YYYY") : ""
    //             ),
    //             committee_president_name: e.committee_president_name,
    //             mobile: e.mobile,

    //             actionTakenForHyper: e.actionTakenForHyper,
    //           };
    //         })
    //       : [
    //           {
    //             committee_type: "",
    //             samity_name: "",
    //             election_date: "",
    //             effect_date: "",
    //             expire_date: "",
    //             committee_president_name: "",
    //             mobile: "",
    //             actionTakenForHyper: {},
    //           },
    //         ];

    //   const returnResult = [];
    //   for (const [index, element] of result.entries()) {
    //     const keys = Object.keys(element);
    //     let obj: any = {};
    //     for (const e of keys) {
    //       if (e != "actionTakenForHyper") {
    //         const name = this.englishToBanglaInterCeptor(e);
    //         obj[name] = element[e];
    //       } else {
    //         obj[e] = element[e];
    //       }
    //     }
    //     returnResult.push(obj);
    //   }
    //   return { data: returnResult, alignItems: {} };
    // } else if (type == "calendarDetails" && user.type == "user" && query.officeId) {
    //   const sql = `SELECT a.id samity_id,samity_code, samity_name, samity_level, committee_type,
    //   election_date, effect_date, expire_date, duration, no_of_member
    //   FROM coop.samity_info a
    //   LEFT JOIN coop.committee_info b ON b.samity_id = a.id
    //   WHERE b.committee_type='EC'
    //   AND a.office_id=$1`;

    //   let result = (await (await pgConnect.getConnection("slave")).query(sql, [query.officeId])).rows;

    //   result =
    //     result.length > 0
    //       ? result.map((e) => {
    //           return {
    //             committee_type: this.committeeLevelChange(e.committee_type),
    //             samity_name: e.samity_name,
    //             election_date: this.engToBang(
    //               moment(e.election_date).isValid() ? moment(e.election_date).format("DD/MM/YYYY") : ""
    //             ),
    //             effect_date: this.engToBang(
    //               moment(e.effect_date).isValid() ? moment(e.effect_date).format("DD/MM/YYYY") : ""
    //             ),
    //             expire_date: this.engToBang(
    //               moment(e.expire_date).isValid() ? moment(e.expire_date).format("DD/MM/YYYY") : ""
    //             ),
    //           };
    //         })
    //       : [
    //           {
    //             committee_type: "",
    //             samity_name: "",
    //             election_date: "",
    //             effect_date: "",
    //             expire_date: "",
    //           },
    //         ];

    //   const returnResult = [];
    //   for (const [index, element] of result.entries()) {
    //     const keys = Object.keys(element);
    //     let obj: any = {};
    //     for (const e of keys) {
    //       const name = this.englishToBanglaInterCeptor(e);
    //       obj[name] = element[e];
    //     }

    //     returnResult.push(obj);
    //   }
    //   return { data: returnResult, alignItems: {} };
    // } else
    if (type == "rejectApplicationByServices" && query.officeId && query.serviceId) {
      try {
        const sql = `
  select * from temps.application where status='R' and service_id=$1 `;

        let result = (await (await pgConnect.getConnection("archive")).query(sql, [query.serviceId])).rows;
        const senderDetailsSql = `SELECT 
a.id, 
a.user_id, 
b.name 
FROM 
temps.application_approval a 
INNER JOIN users.user b ON a.user_id = b.id 
WHERE 
a.id =(
SELECT 
  Max (a.id) 
FROM 
  temps.application_approval a 
WHERE 
  a.application_id = $1
) 
AND a.application_id = $1`;
        let userInfoSql = `SELECT name FROM users.user WHERE id = $1`;
        for (const e of result) {
          const sql = `
SELECT 
  a.id, 
  c.samity_name, 
  d.project_name_bangla, 
  b.id as service_id, 
  b.service_name, data ->> 'remarks' as description,
  TO_CHAR(a.created_at, 'dd/mm/yyyy') AS application_date,
  a.created_by
FROM temps.application a 
  INNER JOIN master.service_info b ON a.service_id = b.id 
  FULL OUTER JOIN samity.samity_info c ON a.samity_id = c.id 
  FULL OUTER JOIN master.project_info d ON a.project_id = d.id 
WHERE a.id = $1 And a.status ='R' 
ORDER BY a.id ASC`;
          const applicationData: any = await (
            await (await pgConnect.getConnection("archive")).query(sql, [e.id])
          ).rows[0];
          let senderInfo = (
            await (await pgConnect.getConnection("slave")).query(senderDetailsSql, [applicationData.id])
          ).rows[0]?.name;
          if (!senderInfo)
            senderInfo = (
              await (await pgConnect.getConnection("slave")).query(userInfoSql, [applicationData.created_by])
            ).rows[0]?.name;
          e["id"] = applicationData.id;
          e["samity_name"] = applicationData.samity_name;
          e["project_name_bangla"] = applicationData.project_name_bangla;
          e["description"] = applicationData.description;
          e["application_date"] = applicationData.application_date;
          e["created_by"] = applicationData.created_by;
          e["application_date"] = applicationData.application_date;
          e["sender"] = senderInfo?.name ? senderInfo.name : senderInfo;
          // const   = await applicationServices.getPendingApplication(
          //     Number(req.user.designationId),
          //     Number(req.user.doptorId),
          //     Number(req.query.projectId),
          //     0,
          //     null
          //   );
          // let sql;
          // if (e.service_id != 1 && e.service_id != 2) {
          //   sql = `select
          //   a.id as samity_id,
          //   a.samity_name,
          //   b.type_name,
          //   c.service_name
          // from
          //   coop.samity_info a
          // left join coop.samity_type b on
          //   a.samity_type_id = b.id ,
          //   coop.service_info c
          // where
          //   a.id = $1
          //   and c.id = $2`;

          //   const result = (await (await pgConnect.getConnection("slave")).query(sql, [e.samity_id, e.service_id]))
          //     .rows[0];
          //   e["samity_id"] = result.samity_id;
          //   e["samity_name"] = result.samity_name;
          //   e["samity_type_name"] = result.type_name;
          //   e["service_name"] = result.service_name;
          // } else if (e.service_id == 1 || e.service_id == 2) {
          //   const sql = `select a.service_name,b.type_name
          //               from
          //              coop.service_info a,
          //              coop.samity_type b
          //              where a.id=$1 and b.id=$2`;
          //   const result = (
          //     await (await pgConnect.getConnection("slave")).query(sql, [e.service_id, e.data.samity_type_id])
          //   ).rows[0];

          //   e["samity_id"] = e.service_id == 2 ? e.data.samity_id : null;
          //   e["samity_name"] = e.data.samity_name;
          //   e["samity_type_name"] = result.type_name;
          //   e["service_name"] = result.service_name;
          // }
        }

        const ServiceInfoService = Container.get(ServiceInfoServices);
        const serviceInfoData = await ServiceInfoService.getServiceById(Number(query.serviceId));

        const reportInfoSql = `select data from report_info where form_name = $1`;
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
                  samity_name: e.samity_name,
                  project_name_bangla: e.project_name_bangla,
                  description: e.description,
                  application_date: e.application_date,
                  created_by: e.created_by,
                  sender: e.sender,
                  actionTakenForHyper: e.actionTakenForHyper,
                };
              })
            : [
                {
                  id: null,
                  samity_name: "",
                  project_name_bangla: "",
                  description: "",
                  application_date: "",
                  created_by: "",
                  sender: "",
                  actionTakenForHyper: {},
                },
              ];

        const returnResult = [];
        for (const [index, element] of result.entries()) {
          const keys = Object.keys(element);
          let obj: any = {};
          for (const e of keys) {
            // if (e != "actionTakenForHyper") {
            //   const name = this.englishToBanglaInterCeptor(e);
            // }
            // else {
            obj[e] = element[e];
            // }
          }

          returnResult.push(obj);
        }

        // const returnResult = [];
        // for (const [index, element] of result.entries()) {
        //   const keys = Object.keys(element);
        //   let obj: any = {};
        //   for (const e of keys) {
        //     const name = this.englishToBanglaInterCeptor(e);
        //     obj[name] = element[e];
        //   }

        //   returnResult.push(obj);
        // }
        return { data: returnResult, alignItems: {} };
      } catch (error: any) {
        console.log("error", error);
      }
    } else if (type == "purchaseInfo" && query.fromDate && query.toDate) {
      const sql = `select a.id,a.doptor_id, a.title, a.order_number,TO_CHAR(a.order_date, 'DD/MM/YYYY') AS order_date, b.display_value as tender_type, c.supplier_name from inventory.purchase_info_mst a
      inner join master.code_master b 
      on a.tender_type = b.return_value and b.code_type = 'TDT'
      inner join inventory.supplier_info c on c.id = a.supplier
      where a.order_date between $1 and $2 and a.doptor_id =$3`;
      console.log("doptorId", doptorId);
      let result = (await (await db.getConnection("slave")).query(sql, [query.fromDate, query.toDate, doptorId])).rows;

      const reportInfoSql = `select data from loan.report_info where form_name = $1`;
      let reportInfo = (
        await (await db.getConnection("slave")).query(reportInfoSql, [query.formName])
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
                m.params[e] = el[element.action.parameter[i]];
                console.log("mmmmmmmmmmmmmmmmmm", m);
              }
            } else if (element.action.reportFrom == "database" && element.action.parameter.length > 0) {
              for (const [i, e] of element.action.parameter.entries()) {
                m.params[e] = el[e];
                console.log("mmmmmmmmmmmmmmmmmm", m);
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
                title: e.title,
                order_number: e.order_number,
                order_date: this.engToBang(e.order_date),
                tender_type: e.tender_type,
                supplier_name: e.supplier_name,
                actionTakenForHyper: e.actionTakenForHyper,
              };
            })
          : [
              {
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
    } else if (type === "userRoleFeatureReport") {
      const connection = await db.getConnection("slave");
      const sql = `SELECT c.name,c.employee_id,c.doptor_id, STRING_AGG(a.role_name, ', ') AS roles
      FROM users.role a
      INNER JOIN users.user_role b ON a.component_id = 9 AND a.id = b.role_id
      INNER JOIN users.user c ON c.id = b.user_id and c.doptor_id =$1
      GROUP BY c.name,c.employee_id,c.doptor_id`;
      let result = (await connection.query(sql, [doptorId])).rows;
      const reportInfoSql = `select data from loan.report_info where form_name = $1`;
      let reportInfo = (
        await (await db.getConnection("slave")).query(reportInfoSql, [query.formName])
      ).rows[0]?.data?.filter((e: any) => e.type_name == type);

      reportInfo = reportInfo ? toCamelKeys(reportInfo) : reportInfo;
      const hyperAction = reportInfo[0].hyperLinkAction;
      console.log("hyperAction", hyperAction);

      if (result.length > 0) {
        for (const el of result) {
          for (const element of hyperAction) {
            let m: any = {};
            m.reportFrom = element.action.reportFrom;
            m.params = {};
            if (element.action.reportFrom == "jasper") {
              m.reportName = element.action.reportName;
              for (const [i, e] of element.action.jasperParameter.entries()) {
                m.params[e] = el[element.action.parameter[i]];
                console.log("mmmmmmmmmmmmmmmmmm", m);
              }
            } else if (element.action.reportFrom == "database" && element.action.parameter.length > 0) {
              for (const [i, e] of element.action.parameter.entries()) {
                m.params[e] = el[e];
                console.log("mmmmmmmmmmmmmmmmmm", m);
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
                name: e.name,
                roles: e.roles,
                actionTakenForHyper: e.actionTakenForHyper,
              };
            })
          : [
              {
                actionTakenForHyper: {},
              },
            ];
      console.log("resuilt", result);
      const returnResult = [];
      for (const [index, element] of result.entries()) {
        console.log("element", element);
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
    }
  }
  // e["id"] = applicationData.id;
  // e["samit_name"] = applicationData.samity_name;
  // e["project_name_bangla"] = applicationData.project_name_bangla;
  // e["description"] = applicationData.description;
  // e["application_date"] = applicationData.application_date;
  // e["created_by"] = applicationData.created_by;
  // e["application_date"] = applicationData.application_date;
  // e["sender"] = applicationData.sender;
  englishToBanglaInterCeptor(name: any) {
    console.log("name", name);

    if (name == "name") {
      return "নাম";
    } else if (name == "roles") {
      return "রোল";
    } else if (name == "title") {
      return "শিরোনাম";
    } else if (name == "order_number") {
      return "নাম্বার";
    } else if (name == "order_date") {
      return "তারিখ";
    } else if (name === "tender_type") {
      return "ধরণ";
    } else if (name == "supplier_name") {
      return "সরবরাহকারীর নাম";
    } else if (name == "id") {
      return "আইডি";
    } else if (name == "project_name_bangla") {
      return "প্রকল্পের নাম";
    } else if (name == "samity_name") {
      return "সমিতির নাম";
    } else if (name == "description") {
      return "বর্ণনা";
    } else if (name == "application_date") {
      return "আবেদনের তারিখ";
    } else if (name == "sender") {
      return "আবেদনকারীর নাম";
    } else if (name == "member_code") {
      return "  সদস্য নম্বর  ";
    } else if (name == "member_name_bangla") {
      return "সদস্যের নাম  ";
    } else if (name == "nidOrBrn") {
      return "এনআইডি/জন্ম নিবন্ধন";
    } else if (name == "mobile") {
      return "মোবাইল নম্বর  ";
    } else if (name == "father_name") {
      return "পিতার নাম ";
    } else if (name == "address") {
      return "ঠিকানা";
    } else if (name == "committee_type") {
      return "কমিটির ধরন  ";
    } else if (name == "election_date") {
      return "নির্বাচনের তারিখ  ";
    } else if (name == "effect_date") {
      return "মেয়াদ শুরুর তারিখ  ";
    } else if (name == "effect_date") {
      return "মেয়াদ শুরুর তারিখ  ";
    } else if (name == "expire_date") {
      return "মেয়াদ শেষের তারিখ  ";
    } else if (name == "duration") {
      return "মেয়াদকাল  ";
    } else if (name == "no_of_member") {
      return "কমিটির সদস্য সংখ্যা  ";
    } else if (name == "serial") {
      return "ক্রমিক";
    } else if (name == "committee_role") {
      return "কমিটি পদবী ";
    } else if (name == "committee_president_name") {
      return "সভাপতি";
    } else if (name == "service_name") {
      return "সেবার নাম ";
    } else if (name == "manualOrApplicable") {
      return "অনলাইনকৃত/নিবন্ধিত";
    } else {
      return "সমিতির ক্যাটাগরি ";
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

  committeeLevelChange(committee_type: string) {
    if (committee_type == "S") {
      return "অনুমোদিত প্রথম কমিটি ";
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
