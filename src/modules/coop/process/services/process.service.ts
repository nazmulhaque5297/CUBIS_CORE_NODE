import Container, { Service } from "typedi";

import { toCamelKeys, toSnakeCase } from "keys-transform";
import moment from "moment";
import { buildSql } from "rdcd-common";
import { pgConnect } from "../../../../db-coop/factory/connection.db";
import { AssociationSyncService } from "../../../../modules/dashboard/services/association.service";
import SamityInfoScheduleServices from "../../../../modules/schedule/services/schedule.service";
import { RoleSyncService } from "../../../../modules/dashboard/services/role-sync.service";

@Service()
export default class ProcessServices {
  [x: string]: any;
  constructor() {}

  async get(isPagination: boolean, limit: number, offset: number, allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT * FROM coop.process_info";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      const createSql = buildSql(sql, allQuery, "AND", this.filter, "id ", limit, offset);
      const queryText = isPagination ? createSql[0] : createSql[1];
      var features = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = isPagination
        ? "SELECT * FROM coop.process_info ORDER BY id  LIMIT $1 OFFSET $2"
        : "SELECT * FROM coop.process_info ORDER BY id ";
      features = await (await pgConnect.getConnection("slave")).query(queryText, isPagination ? [limit, offset] : []);
    }

    return features.rows;
  }

  async processCreate(type: string, userId: number, query: any) {
    console.log({ arguments });

    const SamityInfoScheduleService = Container.get(SamityInfoScheduleServices);
    const AssociationSyncServices = Container.get(AssociationSyncService);

    const transaction = await (await pgConnect.getConnection("master")).connect();
    let isProcessCompleted = false;

    if (type == "webDataSync") {
      try {
        transaction.query("BEGIN");

        await SamityInfoScheduleService.webSiteSync(transaction, query.officeId);
        isProcessCompleted = true;

        transaction.query("COMMIT");
      } catch (ex) {
        transaction.query("ROLLBACK");
        isProcessCompleted = false;
      } finally {
        transaction.release();
      }
    } else if (type == "associationSync") {
      await AssociationSyncServices.sendSamityToDashboard("coop", userId, query?.doptorId, query?.officeId);
      isProcessCompleted = true;
    } else if (type == "roleDataSync") {
      const roleSyncService = Container.get(RoleSyncService);
      await roleSyncService.syncRoles();
      isProcessCompleted = true;
    }

    return isProcessCompleted;
  }

  async count(allQuery: object) {
    var queryText: string = "";
    const sql: string = "SELECT COUNT(id) FROM coop.process_info";
    const allQueryValues: any[] = Object.values(allQuery);
    if (Object.keys(allQuery).length > 0) {
      queryText = await buildSql(sql, allQuery, "AND", this.filter, "id")[1];
      var result = await (await pgConnect.getConnection("slave")).query(queryText, allQueryValues);
    } else {
      queryText = "SELECT COUNT(id) FROM coop.process_info";
      result = await (await pgConnect.getConnection("slave")).query(queryText);
    }
    return result.rows[0].count;
  }

  filter(key: string) {
    return toSnakeCase(key);
  }

  async uuuuuuuuuuuuuu45wser76zsrgetByType(type: string, query: any, user: any) {
    if (type == "samitySummaryByUserOffice" && user.type == "user") {
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
                       coop.application
                     WHERE
                       service_id = 2
                       AND DATA->'office_id' = $1
                       AND DATA->>'samity_level' = 'P'
                       AND status = 'A' ) A ,
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
                       coop.application
                     WHERE
                       service_id = 2
                       AND DATA->'office_id' = $4
                       AND DATA->>'samity_level' = 'C'
                       AND status = 'A' ) D ,
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
                       coop.application
                     WHERE
                       service_id = 2
                       AND DATA->'office_id' = $7
                       AND DATA->>'samity_level' = 'N'
                       AND status = 'A' ) G ,
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

      if (result) {
        return [
          {
            "সমিতি টাইপ": "প্রাথমিক সমিতি",
            "নিবন্ধন প্রদান": result.primarySamityApprove,
            "অপেক্ষমান নিবন্ধন": result.primarySamityPending,
            "নিবন্ধন প্রত্যাখান": result.primarySamityReject,
          },
          {
            "সমিতি টাইপ": "কেন্দ্রীয় সমিতি",
            "নিবন্ধন প্রদান": result.centerSamityApprove,
            "অপেক্ষমান নিবন্ধন": result.centerSamityPending,
            "নিবন্ধন প্রত্যাখান": result.centerSamityReject,
          },
          {
            "সমিতি টাইপ": "জাতীয় সমিতি",
            "নিবন্ধন প্রদান": result.nationalSamityApprove,
            "অপেক্ষমান নিবন্ধন": result.nationalSamityPending,
            "নিবন্ধন প্রত্যাখান": result.nationalSamityReject,
          },
        ];
      }
      return result ? toCamelKeys(result) : result;
    }

    if (type == "samityDetails" && user.type == "user") {
      const sql = `select 
                    a.id,
                    a.samity_name,
                    a.samity_level,
                    a.samity_code,
                    b.type_name,
                    c.org_name_bangla
                   from 
                      coop.samity_info a 
                      inner join coop.samity_type b on a.samity_type_id=b.id
                      inner join master.enterprising_org c on a.enterprising_id=c.id
                    where a.office_id=$1`;
      let result = (await (await pgConnect.getConnection("slave")).query(sql, [query.officeId])).rows;

      result =
        result.length > 0
          ? result
          : [
              {
                samity_name: "",
                samity_level: "",
                samity_code: "",
                type_name: "",
                org_name_bangla: "",
              },
            ];

      //console.log("result", result);

      const returnResult = [];
      for (const [index, element] of result.entries()) {
        const keys = Object.keys(element);
        //console.log({ keys });
        let obj: any = {};
        for (const e of keys) {
          const name = this.englishToBanglaInterCeptor(e);
          name == "সমিতির ধরণ" ? (obj[name] = this.samityLevelChange(element.samity_level)) : (obj[name] = element[e]);
        }

        returnResult.push(obj);
      }
      return returnResult;
    }

    if (type == "memberDetails" && user.type == "user" && query.samityId) {
      const sql = `SELECT
                     a.id,
                     a.member_code,
                     a.member_name_bangla,
                     a.father_name,
                     a.nid,
                     a.brn,
                     a.mobile,
                     (
                     SELECT
                       b.details_address || ',' ||
                           c.uni_thana_paw_name_bangla
                     FROM
                       coop.member_address_info b
                     LEFT JOIN master.mv_union_thana_paurasabha_info c ON
                       b.uni_thana_paw_id = c.uni_thana_paw_id
                     WHERE
                       b.member_id = a.id
                       AND b.address_type = 'PER') address
                   FROM
                     coop.member_info a
                   WHERE
                     a.samity_id = $1
                   ORDER BY a.member_code`;

      let result = (await (await pgConnect.getConnection("slave")).query(sql, [query.samityId])).rows;

      result =
        result.length > 0
          ? result.map((e) => {
              return {
                member_code: this.engToBang(e.member_code),
                member_name_bangla: e.member_name_bangla,
                father_name: e.father_name,
                nidOrBrn: e.nid ? this.engToBang(e.nid) : this.engToBang(e.brn),
                mobile: this.engToBang(e.mobile),
                address: e.address,
              };
            })
          : [
              {
                member_code: "",
                member_name_bangla: "",
                nid: "",
                mobile: "",
              },
            ];

      //console.log("result", result);

      const returnResult = [];
      for (const [index, element] of result.entries()) {
        const keys = Object.keys(element);
        //console.log({ keys });
        let obj: any = {};
        for (const e of keys) {
          const name = this.englishToBanglaInterCeptor(e);
          obj[name] = element[e];
        }

        returnResult.push(obj);
      }
      return returnResult;
    }

    if (type == "samityCategory" && user.type == "user") {
      const sql = `select id,type_name from coop.samity_type order by id`;
      let result = (await (await pgConnect.getConnection("slave")).query(sql)).rows;

      //console.log("result", result);

      result =
        result.length > 0
          ? result.map((e) => {
              return {
                id: this.engToBang(`${e.id}`),
                type_name: e.type_name,
              };
            })
          : [
              {
                id: null,
                type_name: "",
              },
            ];

      const returnResult = [];
      for (const [index, element] of result.entries()) {
        const keys = Object.keys(element);
        //console.log({ keys });
        let obj: any = {};
        for (const e of keys) {
          const name = this.englishToBanglaInterCeptor(e);
          obj[name] = element[e];
        }

        returnResult.push(obj);
      }
      return returnResult;
    }

    if (type == "committeeSummaryByUserOffice" && user.type == "user" && query.officeId) {
      const sql = `SELECT a.id samity_id,samity_code, samity_name, samity_level, committee_type,
      election_date, effect_date, expire_date, duration, no_of_member
      FROM coop.samity_info a
      LEFT JOIN coop.committee_info b ON b.samity_id = a.id
      WHERE b.status='A'
      AND a.office_id=$1`;

      let result = (await (await pgConnect.getConnection("slave")).query(sql, [query.officeId])).rows;

      // result.map((e) => {
      //   return {
      //     committee_type: e.committee_type,
      //     election_date: e.election_date,
      //     effect_date: e.effect_date,
      //     expire_date: e.expire_date,
      //   };
      // });

      result =
        result.length > 0
          ? result.map((e) => {
              return {
                committee_type: this.committeeLevelChange(e.committee_type),
                election_date: this.engToBang(moment(e.election_date).format("DD/MM/YYYY")),
                effect_date: this.engToBang(moment(e.effect_date).format("DD/MM/YYYY")),
                expire_date: this.engToBang(moment(e.expire_date).format("DD/MM/YYYY")),
              };
            })
          : [
              {
                committee_type: "",
                election_date: "",
                effect_date: "",
                expire_date: "",
              },
            ];

      //console.log("result", result);

      const returnResult = [];
      for (const [index, element] of result.entries()) {
        const keys = Object.keys(element);
        //console.log({ keys });
        let obj: any = {};
        for (const e of keys) {
          const name = this.englishToBanglaInterCeptor(e);
          obj[name] = element[e];
        }

        returnResult.push(obj);
      }
      return returnResult;
    }

    if (type == "calendarDetails" && user.type == "user" && query.officeId) {
      const sql = `SELECT a.id samity_id,samity_code, samity_name, samity_level, committee_type,
      election_date, effect_date, expire_date, duration, no_of_member
      FROM coop.samity_info a
      LEFT JOIN coop.committee_info b ON b.samity_id = a.id
      WHERE b.committee_type='EC'
      AND a.office_id=$1`;

      let result = (await (await pgConnect.getConnection("slave")).query(sql, [query.officeId])).rows;

      result =
        result.length > 0
          ? result.map((e) => {
              return {
                committee_type: this.committeeLevelChange(e.committee_type),
                election_date: e.election_date,
                effect_date: moment(e.effect_date).format("DD/MM/YYYY"),
                expire_date: moment(e.expire_date).format("DD/MM/YYYY"),
              };
            })
          : [
              {
                committee_type: "",
                election_date: "",
                effect_date: "",
                expire_date: "",
              },
            ];

      const returnResult = [];
      for (const [index, element] of result.entries()) {
        const keys = Object.keys(element);
        //console.log({ keys });
        let obj: any = {};
        for (const e of keys) {
          const name = this.englishToBanglaInterCeptor(e);
          obj[name] = element[e];
        }

        returnResult.push(obj);
      }
      return returnResult;
    }
  }

  englishToBanglaInterCeptor(name: any) {
    if (name == "id") {
      return "আইডি";
    } else if (name == "samity_name") {
      return "সমিতির নাম";
    } else if (name == "samity_level") {
      return "সমিতির ধরণ";
    } else if (name == "samity_code") {
      return "সমিতির নিবন্ধন নম্বর";
    } else if (name == "type_name") {
      return "সমিতির ক্যাটাগরি ";
    } else if (name == "org_name_bangla") {
      return "উদ্যোগী সংস্থার নাম";
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
    } else {
      return "সমিতির ক্যাটাগরি ";
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
      return "নিয়োগকৃত প্রথম কমিটি";
    }
    if (committee_type == "E") {
      return "নির্বাচিত কমিটি";
    }
    if (committee_type == "EC") {
      return "নির্বাচনী কমিটি";
    }
    if (committee_type == "I") {
      return "অন্তবর্তী কমিটি";
    }
  }
}
