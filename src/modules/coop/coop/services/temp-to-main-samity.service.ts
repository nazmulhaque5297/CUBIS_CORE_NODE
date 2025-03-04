import { toSnakeCase } from "keys-transform";
import moment from "moment";
import { PoolClient } from "pg";
import { BadRequestError, buildGetSql, buildUpdateWithWhereSql } from "rdcd-common";
import { Service } from "typedi";
import { buildTempToMainSql } from "../../../../utils/sql-builder.util";
import { toSnakeKeysArray } from "../../../../utils/toCamelCase.utils";
import { databaseTableKeys } from "../types/databaseTableKeys.type";
import { keysOfTables } from "../types/keys.type";

@Service()
export class TempToMainSamityServices {
  constructor() {}

  async transfer(samityId: number, transaction: PoolClient) {
    const samityCode = await this.samityCodeGenerator(samityId, transaction);

    // samity_reg_temp to samity_reg

    const samityRegMainTableDataArray = [];
    const samityRegTempTableDataArray = [];
    for (const element of databaseTableKeys.samityRegistrationKeys) {
      samityRegMainTableDataArray.push(toSnakeCase(element));
      samityRegTempTableDataArray.push(toSnakeCase(element));
    }

    const dataChangeForSamityReg = ["status", "samity_code"];
    const { sql: tempSamityToMainSamitySql } = buildTempToMainSql(
      "temps.samity_info",
      "coop.samity_info",
      1,
      samityRegMainTableDataArray,
      samityRegTempTableDataArray,
      "id",
      "*",
      dataChangeForSamityReg,
      ["id"]
    );

    const samityRegMainTableValue = (await transaction.query(tempSamityToMainSamitySql, ["A", samityCode, samityId]))
      .rows[0];

    //samity data for pageData

    const samityDataPageDataSql = `SELECT
                                    a.samity_name,
                                    a.samity_code,
                                    a.samity_level,
                                    a.samity_district_id,
                                    a.samity_division_id,
                                    a.samity_upa_city_id,
                                    a.samity_upa_city_type,
                                    a.samity_uni_thana_paw_id,
                                    a.samity_uni_thana_paw_type,
                                    a.samity_type_id,
                                    a.mobile,
                                    a.email,
                                    b.name as name_bangla,
                                    c.project_name_bangla,
                                    d.name_bn office_name,
                                    e.name_bn doptor_name,
                                    f.district_name_bangla,
                                    g.upazila_name_bangla,
                                    h.division_name_bangla as samity_division_name_bangla,
                                    i.type_name samiy_type_name,
                                    j.name_bn doptor_name
                                  FROM
                                    coop.samity_info a
                                  INNER JOIN users.user b ON
                                    b.id = a.organizer_id
                                  LEFT JOIN master.project_info c ON
                                    c.id = a.project_id
                                  INNER JOIN master.office_info d ON
                                    d.id = a.office_id
                                  INNER JOIN master.doptor_info e ON
                                    e.id = a.doptor_id
                                  INNER JOIN master.district_info f ON
                                    f.id = a.district_id
                                  INNER JOIN master.upazila_info g ON
                                    g.id = a.upazila_id
                                  INNER JOIN master.division_info h ON
                                    h.id=a.samity_division_id
                                  INNER JOIN coop.samity_type i ON
                                    i.id=a.samity_type_id
                                  INNER JOIN master.doptor_info j ON
                                    j.id=a.doptor_id
                                  WHERE
                                    a.id = $1`;
    const samityDataForPageData = (await transaction.query(samityDataPageDataSql, [samityRegMainTableValue.id]))
      .rows[0];

    // memberInfoTemp  to MemberInfo
    const membersql = `select id from temps.member_info where samity_id=$1 and is_active=$2`;
    const memberIdOfSamity = (await transaction.query(membersql, [samityId, true])).rows;

    const newSamityId = samityRegMainTableValue.id;
    const memberInfoMainTableValue = [];
    const memberIdOfMainTemp = [];

    const memberInfoMainTableKeysArray = databaseTableKeys.memberRegistrationInfo;
    const memberInfoTempTableKeysArray = databaseTableKeys.memberRegistrationInfo;
    const dataChangeForMemberInfo = ["samity_id"];
    const { sql: tempMemberToMainMemberSql } = buildTempToMainSql(
      "temps.member_info",
      "coop.member_info",
      1,
      memberInfoMainTableKeysArray,
      memberInfoTempTableKeysArray,
      "samity_id",
      "*",
      dataChangeForMemberInfo,
      ["samity_id", "id"]
    );

    for (const element of memberIdOfSamity) {
      const result = (await transaction.query(tempMemberToMainMemberSql, [newSamityId, samityId, element.id])).rows[0];

      const memberIdTempToMain = {
        main_member_id: result.id,
        temp_member_id: element.id,
      };

      memberIdOfMainTemp.push(memberIdTempToMain);
      memberInfoMainTableValue.push(result);
    }

    //Member Financial Temp to Member Financial Main

    const memberFinancialMainTableKeysArray = databaseTableKeys.memberFinancial;
    const memberFinancialTempTableKeysArray = databaseTableKeys.memberFinancial;
    keysOfTables.memberFinancialKeys;
    const dataChangeForMemberInfot = ["samity_id", "member_id"];
    const whereCondition = ["samity_id", "member_id"];
    const dataOfMainMemberFinacial = [];

    for (const element of memberIdOfMainTemp) {
      const { sql: tempMemberFinancialMainMemberFinancialSql } = buildTempToMainSql(
        "temps.member_financial_info",
        "coop.member_financial_info",
        1,
        memberFinancialMainTableKeysArray,
        memberFinancialTempTableKeysArray,
        "samity_id",
        "*",
        dataChangeForMemberInfot,
        whereCondition
      );

      const data = await (
        await transaction.query(tempMemberFinancialMainMemberFinancialSql, [
          newSamityId,
          element.main_member_id,
          samityId,
          element.temp_member_id,
        ])
      ).rows[0];
      dataOfMainMemberFinacial.push(data);
    }

    // // memberAddressInfoTemp  to MemberAddressInfo
    const memberAddressInfoMainTableKeysArray = databaseTableKeys.memberAddressInfo;
    const memberAddressInfoTempTableKeysArray = databaseTableKeys.memberAddressInfo;
    const memberAddressInfoMainTableValue: any = [];

    for (const element of memberIdOfMainTemp) {
      const { sql: tempMemberAddressToMainMemberAddressSql } = buildTempToMainSql(
        "temps.member_address_info",
        "coop.member_address_info",
        1,
        memberAddressInfoMainTableKeysArray,
        memberAddressInfoTempTableKeysArray,
        "samity_id",
        "*",
        ["samity_id", "member_id"],
        ["samity_id", "member_id"]
      );
      const data = (
        await transaction.query(tempMemberAddressToMainMemberAddressSql, [
          newSamityId,
          element.main_member_id,
          samityId,
          element.temp_member_id,
        ])
      ).rows;
      memberAddressInfoMainTableValue.push(data);
    }

    // Commitee_info_temp to Committee_info
    const committeeInfoTableDataArray = databaseTableKeys.committeeInfo;
    const committeeInfoTempTableDataArray = databaseTableKeys.committeeInfo;
    // const date = new Date();
    // let electionDate = date.toLocaleDateString();
    // let effectDate = date.toLocaleDateString();
    // date.setFullYear(date.getFullYear() + 2);
    // let expireDate = date.toLocaleDateString();
    // electionDate = moment(electionDate).format("DD/MM/YYYY");
    // effectDate = moment(effectDate).format("DD/MM/YYYY");
    // expireDate = moment(expireDate).format("DD/MM/YYYY");
    const date = new Date();

    // Format the date as ISO 8601 (YYYY-MM-DD)
    let electionDate = date.toISOString().split("T")[0];
    let effectDate = date.toISOString().split("T")[0];

    // Calculate the date two years from now
    date.setFullYear(date.getFullYear() + 2);
    let expireDate = date.toISOString().split("T")[0];

    // Format using Moment.js
    electionDate = moment(electionDate).format("DD/MM/YYYY");
    effectDate = moment(effectDate).format("DD/MM/YYYY");
    expireDate = moment(expireDate).format("DD/MM/YYYY");

    const { sql: tempCommitteeInfoToMainSql } = buildTempToMainSql(
      "temps.committee_info",
      "coop.committee_info",
      1,
      committeeInfoTableDataArray,
      committeeInfoTempTableDataArray,
      "samity_id",
      "*",
      ["samity_id", "election_date", "effect_date", "expire_date"],
      ["samity_id"]
    );

    const committeeInfoData = (
      await transaction.query(tempCommitteeInfoToMainSql, [newSamityId, electionDate, effectDate, expireDate, samityId])
    ).rows[0];

    const mainTableCommiteeId = committeeInfoData.id;
    //Commitee_Member_info_temp to Committee_Member_info committeeMemberInfo
    const committeeMemberTableDataArray = databaseTableKeys.committeeMemberInfo;
    const committeeMemberTempTableDataArray = databaseTableKeys.committeeMemberInfo;
    const { sql: tempCommitteeMemberToMainSql } = buildTempToMainSql(
      "temps.committee_member",
      "coop.committee_member",
      1,
      committeeMemberTableDataArray,
      committeeMemberTempTableDataArray,
      "samity_id",
      "*",
      ["committee_id", "samity_id", "member_id", "status"],
      ["samity_id", "member_id"]
    );

    let mainCommitteeMemberData = [];

    for (const element of memberIdOfMainTemp) {
      const result = await (
        await transaction.query(tempCommitteeMemberToMainSql, [
          mainTableCommiteeId,
          newSamityId,
          element.main_member_id,
          "A",
          samityId,
          element.temp_member_id,
        ])
      ).rows[0];
      mainCommitteeMemberData.push(result);
    }

    //Temp Samity GL Transaction To Main Samity GL Transaction

    const workingAreaTableDataArray = databaseTableKeys.workingArea;
    const workingAreaTempTableDataArray = databaseTableKeys.workingArea;
    const { sql: tempWorkingAreaTempToMainSql } = buildTempToMainSql(
      "temps.working_area",
      "coop.working_area",
      1,
      workingAreaTableDataArray,
      workingAreaTempTableDataArray,
      "samity_id",
      "*",
      ["samity_id"],
      ["samity_id"]
    );

    await transaction.query(tempWorkingAreaTempToMainSql, [newSamityId, samityId]);

    // //Temp Member Area To Member Area

    const memberAreaTableDataArray = databaseTableKeys.memberArea;
    const memberAreaTempTableDataArray = databaseTableKeys.memberArea;
    const { sql: tempMemberAreaTempToMainSql } = buildTempToMainSql(
      "temps.member_area",
      "coop.member_area",
      1,
      memberAreaTableDataArray,
      memberAreaTempTableDataArray,
      "samity_id",
      "*",
      ["samity_id"],
      ["samity_id"]
    );

    await transaction.query(tempMemberAreaTempToMainSql, [newSamityId, samityId]);

    //Temp Samity Document To Samity Document

    const samityDocumentTableDataArray = databaseTableKeys.samityDocument;
    const samityDocumentTempTableDataArray = databaseTableKeys.samityDocument;
    const { sql: tempSamityDocumentTempToMainSql } = buildTempToMainSql(
      "temps.samity_document",
      "coop.samity_document",
      1,
      samityDocumentTableDataArray,
      samityDocumentTempTableDataArray,
      "samity_id",
      "*",
      ["samity_id"],
      ["samity_id"]
    );

    await transaction.query(tempSamityDocumentTempToMainSql, [newSamityId, samityId]);

    // Temp Samity Gl Trans TO Budget

    const samityGlTransBudgetSql = `SELECT id,financial_year,inc_amt,exp_amt FROM temps.samity_gl_trans WHERE samity_id=$1 AND is_ie_budget=$2`;
    const samityGlTransBudgetData = (await transaction.query(samityGlTransBudgetSql, [samityId, "B"])).rows;

    const budgetTableDataArray = toSnakeKeysArray(databaseTableKeys.budget);
    const { sql: mainBudgetSql } = buildTempToMainSql(
      "temps.samity_gl_trans",
      "coop.budget_info",
      1,
      budgetTableDataArray,
      budgetTableDataArray,
      "id",
      "*",
      ["samity_id", "start_year", "end_year", "amount"],
      ["samity_id", "id"]
    );

    const mainBudgetTableIds = [];
    const mainBudgetData = [];

    for (const element of samityGlTransBudgetData) {
      const financialYear = element.financial_year;
      const startYear = financialYear.slice(0, 4);
      const endYear = financialYear.slice(5, 9);
      const amount = parseInt(element.inc_amt) === 0 ? element.exp_amt : element.inc_amt;
      const result = (
        await transaction.query(mainBudgetSql, [newSamityId, startYear, endYear, amount, samityId, element.id])
      ).rows[0];

      mainBudgetTableIds.push(result.id);
      mainBudgetData.push(result);
    }

    // Temp Samity Gl Trans TO gl_trans

    const glTransTableDataArray = toSnakeKeysArray(databaseTableKeys.glTrans);
    const mainGlTransSql = `insert
                      into
                      coop.gl_transaction(samity_id,
                      glac_id,
                      tran_date,
                      tran_amount,
                      drcr_code,
                      remarks,
                      status,
                      created_by,
                      created_at,
                      updated_by,
                      updated_at) 
                    select
                      $1,
                      a.glac_id,
                      a.tran_date,
                      case
                        when inc_amt = 0 then exp_amt
                        when exp_amt = 0 then inc_amt
                        else 0
                      end as tran_amount,
                      b.gl_nature as drcr_code ,
                      a.remarks,
                      a.status,
                      a.created_by,
                      a.created_at,
                      a.updated_by,
                      a.updated_at
                    from
                      temps.samity_gl_trans a
                    inner join coop.glac_mst b on
                      a.glac_id = b.id
                    where
                      samity_id = $2
                      and is_ie_budget = 'E' returning * ;`;

    const mainGlTransData = transaction.query(mainGlTransSql, [newSamityId, samityId]);

    // insert into page-data

    // const sqlSamityTypeName = `select type_name from coop.samity_type where id=$1`;
    // const { type_name: samityTypeName } = (
    //   await transaction.query(sqlSamityTypeName, [
    //     samityRegMainTableValue.samity_type_id,
    //   ])
    // ).rows[0];

    const pageDataInsertSql = `INSERT INTO 
                               portal.page_data(
                                    doptor_id, 
                                    samity_id,
                                    samity_regno,
                                    samity_name, 
                                    data, 
                                    status, 
                                    created_by, 
                                    created_at) 
                              VALUES ($1,$2,$3,$4,$5,$6,$7,$8);`;
    const pageDataValues = [
      1,
      newSamityId,
      samityRegMainTableValue.samity_code,
      samityRegMainTableValue.samity_name,
      {
        samityRegMainTableValue: samityDataForPageData,
      },
      true,
      "admin",
      new Date(),
    ];

    const pageData = (await transaction.query(pageDataInsertSql, pageDataValues)).rows;

    return {
      samityId: newSamityId,
      userId: samityRegMainTableValue.organizer_id,
      samityLevel: samityRegMainTableValue.samity_level,
    };
  }

  async updateByLawsData(samityId: number, transaction: PoolClient) {
    const samitySql = buildGetSql(
      [
        "samity_type_id",
        "samity_level",
        "samity_name",
        "member_admission_fee",
        "no_of_share",
        "share_price",
        "sold_share",
      ],
      "coop.samity_info",
      {
        id: samityId,
      }
    );
    const samityInfo = (await transaction.query(samitySql.queryText, samitySql.values)).rows[0];

    const samityTypeSql = buildGetSql(["by_laws_primary", "by_laws_centeral", "by_laws_national"], "coop.samity_type", {
      id: samityInfo.samity_type_id,
    });
    const samityTypeInfo = (await transaction.query(samityTypeSql.queryText, samityTypeSql.values)).rows[0];
    const samityLevel = samityInfo.samity_level;
    const samityName = samityInfo.samity_name;
    const memberAdmissionFee = samityInfo.member_admission_fee;
    const noOfShare = samityInfo.no_of_share;
    const sharePrice = samityInfo.share_price;

    if (samityLevel == "P") {
      // find byLaws from samity Type table
      const byLawsInfo = samityTypeInfo?.by_laws_primary;

      /////////////////////// initial set samity name ok/////////////////////////
      const initialByLaws = byLawsInfo.find((b: any) => b.name_en == "initial");
      const partialByLaws = initialByLaws.data.find((i: any) => i.type == "partial");
      const samityNameByLaws = partialByLaws.data.find((p: any) => p.name == "samityName");
      samityNameByLaws.data = samityName;
      ///////////////////////samityName_Address set samity name ok////////////////
      const samityNameAddress = byLawsInfo.find((b: any) => b.name_en == "samityName_Address");
      const partialSamityNameAddress = samityNameAddress.data.find((i: any) => i.type == "partial");
      const samityNameset = partialSamityNameAddress.data.find((p: any) => p.name == "samityName");
      samityNameset.data = samityName;
      //////////////////////////////// membership set admission fee, share ok/////////////////
      const memberShip = byLawsInfo.find((b: any) => b.name_en == "memberShip");
      const partialMemberShip = memberShip.data.find((i: any) => i.type == "partial");
      const admissionSet = partialMemberShip.data.find((p: any) => p.name == "admission");
      admissionSet.data = memberAdmissionFee;
      const shareSet = partialMemberShip.data.find((p: any) => p.name == "share");
      shareSet.data = sharePrice;
      //////////////////////////////// capitalLoan set share price and share capital ok////////
      const capitalLoan = byLawsInfo.find((b: any) => b.name_en == "capitalLoan");
      const partialCapitalLoan = capitalLoan.data.find((i: any) => i.type == "partial");
      const capitalLoanSet = partialCapitalLoan.data.find((p: any) => p.name == "shareCapital");
      capitalLoanSet.data = sharePrice * noOfShare;
      const sharePriceSet = partialCapitalLoan.data.find((p: any) => p.name == "sharePrice");
      sharePriceSet.data = sharePrice;
      // ////////////////////////  ////////////////////////////////
      const { sql, params } = buildUpdateWithWhereSql(
        "coop.samity_info",
        { id: samityId },
        {
          by_laws: JSON.stringify(byLawsInfo),
        }
      );
      await transaction.query(sql, params);
      return { samityId };
    } else if (samityLevel == "C") {
      // if needed it will be change per business plan
      // find byLaws from samity Type table
      const byLawsInfo = samityTypeInfo?.by_laws_centeral;
      /////////////////////// initial set samity name ok/////////////////////////
      const initialByLaws = byLawsInfo.find((b: any) => b.name_en == "initial");
      const partialByLaws = initialByLaws.data.find((i: any) => i.type == "partial");
      const samityNameByLaws = partialByLaws.data.find((p: any) => p.name == "samityName");
      samityNameByLaws.data = samityName;
      ///////////////////////samityName_Address set samity name ok////////////////
      const samityNameAddress = byLawsInfo.find((b: any) => b.name_en == "samityName_Address");
      const partialSamityNameAddress = samityNameAddress.data.find((i: any) => i.type == "partial");
      const samityNameset = partialSamityNameAddress.data.find((p: any) => p.name == "samityName");
      samityNameset.data = samityName;
      //////////////////////////////// membership set admission fee, share ok/////////////////
      const memberShip = byLawsInfo.find((b: any) => b.name_en == "memberShip");
      const partialMemberShip = memberShip.data.find((i: any) => i.type == "partial");
      const admissionSet = partialMemberShip.data.find((p: any) => p.name == "admission");
      admissionSet.data = memberAdmissionFee;
      const shareSet = partialMemberShip.data.find((p: any) => p.name == "share");
      shareSet.data = sharePrice;
      //////////////////////////////// capitalLoan set share price and share capital ok////////
      const capitalLoan = byLawsInfo.find((b: any) => b.name_en == "capitalLoan");
      const partialCapitalLoan = capitalLoan.data.find((i: any) => i.type == "partial");
      const capitalLoanSet = partialCapitalLoan.data.find((p: any) => p.name == "shareCapital");
      capitalLoanSet.data = sharePrice * noOfShare;
      const sharePriceSet = partialCapitalLoan.data.find((p: any) => p.name == "sharePrice");
      sharePriceSet.data = sharePrice;
      ////////////////////////  ////////////////////////////////
      const { sql, params } = buildUpdateWithWhereSql(
        "coop.samity_info",
        { id: samityId },
        {
          by_laws: JSON.stringify(byLawsInfo),
        }
      );
      try {
        await transaction.query(sql, params);
      } catch (error) {
        // console.log({ error });
      }
      return { samityId };
    } else if (samityLevel == "N") {
      // if needed it will be change per business plan
      // find byLaws from samity Type table
      const byLawsInfo = samityTypeInfo?.by_laws_national;
      /////////////////////// initial set samity name ok/////////////////////////
      const initialByLaws = byLawsInfo.find((b: any) => b.name_en == "initial");
      const partialByLaws = initialByLaws.data.find((i: any) => i.type == "partial");
      const samityNameByLaws = partialByLaws.data.find((p: any) => p.name == "samityName");
      samityNameByLaws.data = samityName;
      ///////////////////////samityName_Address set samity name ok////////////////
      const samityNameAddress = byLawsInfo.find((b: any) => b.name_en == "samityName_Address");
      const partialSamityNameAddress = samityNameAddress.data.find((i: any) => i.type == "partial");
      const samityNameset = partialSamityNameAddress.data.find((p: any) => p.name == "samityName");
      samityNameset.data = samityName;
      //////////////////////////////// membership set admission fee, share ok/////////////////
      const memberShip = byLawsInfo.find((b: any) => b.name_en == "memberShip");
      const partialMemberShip = memberShip.data.find((i: any) => i.type == "partial");
      const admissionSet = partialMemberShip.data.find((p: any) => p.name == "admission");
      admissionSet.data = memberAdmissionFee;
      const shareSet = partialMemberShip.data.find((p: any) => p.name == "share");
      shareSet.data = sharePrice;
      //////////////////////////////// capitalLoan set share price and share capital ok////////
      const capitalLoan = byLawsInfo.find((b: any) => b.name_en == "capitalLoan");
      const partialCapitalLoan = capitalLoan.data.find((i: any) => i.type == "partial");
      const capitalLoanSet = partialCapitalLoan.data.find((p: any) => p.name == "shareCapital");
      capitalLoanSet.data = sharePrice * noOfShare;
      const sharePriceSet = partialCapitalLoan.data.find((p: any) => p.name == "sharePrice");
      sharePriceSet.data = sharePrice;
      ////////////////////////  ////////////////////////////////
      const { sql, params } = buildUpdateWithWhereSql(
        "coop.samity_info",
        { id: samityId },
        {
          by_laws: JSON.stringify(byLawsInfo),
        }
      );
      await transaction.query(sql, params);
      return true;
    }
    return { samityId };
  }

  async samityCodeGenerator(samityId: number, transaction: PoolClient) {
    const year = new Date().getFullYear();

    try {
      const queryText = `SELECT 
      a.samity_type_id,
      a.samity_level,
      b.district_code,
      b.upa_city_code,
      a.samity_upa_city_id,
      a.samity_upa_city_type
     FROM TEMPS.SAMITY_INFO a
     INNER JOIN master.mv_upazila_city_info b ON a.samity_upa_city_id=b.upa_city_id
     WHERE a.id = $1`;
      const result = (await transaction.query(queryText, [samityId])).rows[0];

      const samityLevelId = () => {
        if (result.samity_level === "P" || result.samity_level === "p") {
          return 1;
        } else if (result.samity_level === "C" || result.samity_level === "c") {
          return 2;
        } else if (result.samity_level === "N" || result.samity_level === "n") {
          return 3;
        } else {
          return null;
        }
      };

      const samityTypeId = result.samity_type_id < 10 ? `0${result.samity_type_id}` : result.samity_type_id;

      const samityCodeWithoutSerial = `${year}.${samityLevelId()}.${samityTypeId}.${
        result.district_code < 10 ? "0" + result.district_code : result.district_code
      }${result.upa_city_code < 10 ? "0" + result.upa_city_code : result.upa_city_code}`.trim();

      // const queryTextLastValue = `SELECT samity_code FROM coop.samity_info  WHERE samity_code LIKE $1 ORDER BY id DESC LIMIT 1`;

      const queryTextLastValue = `SELECT samity_code FROM coop.samity_info  WHERE samity_upa_city_id = $1 and samity_upa_city_type = $2 ORDER BY id DESC LIMIT 1`;

      //last samity Code For same year and same samity type

      // const lastSamityCode = (await transaction.query(queryTextLastValue, [`${year}.${samityLevelId()}.%`])).rows[0];

      const lastSamityCode = (
        await transaction.query(queryTextLastValue, [result.samity_upa_city_id, result.samity_upa_city_type])
      ).rows[0];

      if (
        lastSamityCode &&
        lastSamityCode.samity_code.slice(15) &&
        parseInt(lastSamityCode.samity_code.slice(15)) + 1 > 9999
      ) {
        throw new BadRequestError(`সমিতি কোড সিরিয়াল ৯৯৯৯ হতে বড় পারবে না`);
      }

      const initialValue = "0000";
      const serial = lastSamityCode ? (parseInt(lastSamityCode.samity_code.slice(15)) + 1).toString() : "0001";

      // initialValue.substring(0, initialValue.length - serial.length)
      // for generating 0003 if the serial value will be 3

      const samityCode =
        samityCodeWithoutSerial +
        "." +
        (serial.length < 4 ? initialValue.substring(0, initialValue.length - serial.length) + serial : serial);

      return samityCode;
    } catch (ex) {
      //console.log("error in samity code generator ", ex);
    }
  }
}
