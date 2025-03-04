import { toCamelKeys } from "keys-transform";
import { BadRequestError, buildInsertSql, buildUpdateWithWhereSql } from "rdcd-common";
import { Service } from "typedi";
import db from "../../../../db/connection.db";

@Service()
export class MemberFinancialInfoService {
  constructor() {}

  async getmemberfinancedata(id: number) {
    const pool = db.getConnection("slave");
    const memberdatasql = `SELECT A.ID as MEMBER_ID,
    A.MEMBER_CODE,
    A.MEMBER_NAME_BANGLA,
    B.NO_OF_SHARE,
    B.SHARE_AMOUNT,
    B.SAVINGS_AMOUNT,
    B.LOAN_OUTSTANDING,
    C.SHARE_PRICE
  FROM COOP.MEMBER_INFO A
  LEFT JOIN COOP.MEMBER_FINANCIAL_INFO B ON A.ID = B.MEMBER_ID
  LEFT JOIN COOP.SAMITY_INFO C ON C.ID = A.SAMITY_ID
  WHERE A.SAMITY_ID = $1`;
    let memberfinancedata = (await pool.query(memberdatasql, [id])).rows;
    return memberfinancedata ? toCamelKeys(memberfinancedata) : {};
  }

  async postData(data: any, user: any) {
    let result, message;
    const finInfo: any = toCamelKeys(data);
    const transaction = await db.getConnection().connect();
    const createdBy = user.userId ? user.userId : user.userId;
    const createdAt = new Date();
    const pool = db.getConnection("slave");
    try {
      transaction.query("BEGIN");

      for (const element of finInfo.data) {
        // first serch member fin info table exits member data
        const sql = `SELECT count(id) FROM coop.member_financial_info where member_id=$1`;
        let findMember = (await pool.query(sql, [element.memberId])).rows[0];
        // main table update here
        if (findMember?.count == 0) {
          const { sql: memberFinancialSql, params: memberFinancialParams } = buildInsertSql(
            "coop.member_financial_info",
            {
              memberId: element.memberId,
              samityId: finInfo.samityId,
              noOfShare: element.noOfShare,
              savingsAmount: element.savingsAmount,
              shareAmount: element.shareAmount,
              loanOutstanding: element.loanOutstanding,
              createdBy,
              createdAt,
            }
          );
          await transaction.query(memberFinancialSql, memberFinancialParams);
        } else {
          const { sql: updateSql, params: UpdateParams } = buildUpdateWithWhereSql(
            "coop.member_financial_info",
            { memberId: element.memberId },
            {
              noOfShare: element.noOfShare,
              savingsAmount: element.savingsAmount,
              shareAmount: element.shareAmount,
              loanOutstanding: element.loanOutstanding,
              updatedBy: createdBy,
              updatedAt: createdAt,
            }
          );
          result = await (await transaction.query(updateSql, UpdateParams)).rows;
        }

        if (element.transation.length > 0) {
          for (const tranElement of element.transation) {
            // transation table data insert here
            const { sql, params } = buildInsertSql("coop.member_financial_tran", {
              ...tranElement,
              ...{
                samityId: finInfo.samityId,
                memberId: element.memberId,
                tranDate: createdAt,
                remarks: "insert",
                createdBy,
                createdAt,
              },
            });

            result = await (await transaction.query(sql, params)).rows;
          }
        }
      }
      transaction.query("COMMIT");
    } catch (error: any) {
      transaction.query("ROLLBACk");
      throw new BadRequestError(error.toString());
    } finally {
      transaction.release();
    }
    message = "সফলভাবে তৈরি করা হয়েছে";
    return result && message ? (toCamelKeys({ result, message }) as any) : {};
  }
}
