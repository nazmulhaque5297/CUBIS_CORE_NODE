
import { toCamelKeys } from "keys-transform";
//import { BadRequestError, buildSql } from "../../../utils";
import { Service } from "typedi";
import { sqlConnect } from "../../../db-coop/factory/connection.db";
import { buildInsertSql, buildUpdateSql,buildGetSql } from "../../../utils/sql-builder.util";
import { newUserCreateAttrs, userInfoAttrs, userLogin } from "../interfaces/user-management.interface";
import BadRequestError from "../../../errors/bad-request.error";
import { getLongLivedToken } from "../../../utils/jwt.util";
import { sq } from "date-fns/locale";
import { buildInsertSqlWithPrefix } from "../../../utils/build-sql.utils";
import { Console, log } from "console";
const bcrypt = require('bcrypt');


@Service()
export class UserManagementServices {
  constructor() {}

  async GetUserInformation(userId:number){
   
    const{queryText,values} = buildGetSql(['*'],'CCULBSYSIDS',{IdsNo:userId})
    const req = (await sqlConnect.getConnection("master")).request();
    Object.entries(values).forEach(([key, value]) => {
      req.input(key, value);
    });

    const userInfo:any = await req.query(queryText);
    return userInfo.recordset[0];
  }

  async Login (data:userLogin){
    const userInfor:any = await this.GetUserInformation(parseInt(data.LoginID))
    if (userInfor.IdsLevel != 20 && userInfor.IdsLevel != 30)
      {
          if (userInfor.IdsLogInFlag == 1 && userInfor.IdsLogInTable != parseInt(data.Terminal)){
            throw new BadRequestError(`This user already logged in!`);
          }
        
      }
      // const match = await bcrypt.compare(data.Password, userInfor.IdsPass);
      // if (!match) {
      //   throw new BadRequestError ("Hmm, that's not the right Password. Please try again.") ;
      // }

      // new Claim(JwtRegisteredClaimNames.Sub, user.UserName),
      // new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
      // new Claim(JwtRegisteredClaimNames.Email, user.Email),
      // new Claim(JwtRegisteredClaimNames.Sid, user.UserName),
      // new Claim(CustomClaimTypes.BranchId, user.UserBranchId.HasValue?user.UserBranchId.ToString():string.Empty, ClaimValueTypes.Integer),
      // new Claim(CustomClaimTypes.LoggedInUserName, user.LoggedInUserName, ClaimValueTypes.String

      const TokenInformation = {
        Sub:userInfor.IdsName,
        Jti:"2cac0b3c-6f4a-4345-9564-42361a6e1412",
        Email:userInfor.IdsLevel,
        Sid:userInfor.IdsName,
        BranchId:userInfor.UserBranchNo,
        LoggedInUserName:userInfor.IdsName,
        UserId:userInfor.IdsNo
      }

      const token = await getLongLivedToken(TokenInformation, '12h', "user");
    
    
      return token
  }



  async CreateUser(data: newUserCreateAttrs, user: any) {
    try {
      // Prepare user data
      data.UserId = parseInt(user.UserId);
      data.UserBranchNo = user.BranchId;
      data.IdsPass = this.generateResetPass();
  
      // Use builder function
      const { sql, params } = buildInsertSqlWithPrefix(
        "CCULBSYSIDS",
        data,
        ['selectedOptionCode', 'CSVPrintflag', 'LIdsCashCredit', 'LIdsCashDebit', 'LIdsTrfCredit', 'LIdsTrfDebit'],
        [],
        {
          prefix: 'Ids',
          fields: ['SODflag', 'GLVPrintflag', 'AutoVchflag', 'SMSflag']
        }
      );
  
      // Connect and insert into master
      const conn = await sqlConnect.getConnection("master");
      const request = conn.request();
  
      Object.entries(params).forEach(([key, value]) => {
        request.input(key, value);
      });
  
      const result = await request.query(sql);
      console.log("Inserted into master:", result);
  
      // Insert into CCULBCSCUBS if successful
      if (result.rowsAffected[0] > 0) {
        const conn2 = await sqlConnect.getConnection("CCULBCSCUBS");
        const request2 = conn2.request();
  
        Object.entries(params).forEach(([key, value]) => {
          request2.input(key, value);
        });
  
        const result2 = await request2.query(sql);
        console.log("Inserted into CCULBCSCUBS:", result2);
      }
  
    } catch (error) {
      console.error("CreateUser error:", error);
      throw error;
    }
  }
  

generateResetPass() {
    const alphaNumeric = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const stringChars = new Array(8);
    const randIndex = Math.floor(Math.random() * alphaNumeric.length);
    const char = alphaNumeric[randIndex];
    
    for (let i = 0; i < stringChars.length; i++) {
        stringChars[i] = char;
    }
    
    return stringChars.join('');
}


}
