export interface userInfoAttrs {
  IdsNo: number,
  IdsPass: string,
  IdsLevel: number,
  IdsLogInFlag: number,
  IdsLockFlag: number,
  IdsName: string,
  IdsFlag: string,
  IdsType: string,
  IdsStatus: string,
  EmpCode: number,
  GLCashCode: number,
  UserBranchNo: number,
  UserId: number,
  CreateDate: Date,
  IdsSODFlag: Boolean,
  IdsVPrintFlag: Boolean,
  IdsAutoVchFlag: Boolean,
  CSLastVchNo?: string,
  GLLastVchNo?: string,
  IdsGLVPrintFlag: Boolean,
  IdsLogInTable: number,
  IdsSMSFlag: Boolean,
  IdsMobileNo?: string,
  IdsNameBang?: string
}


export interface newUserCreateAttrs {
  UserId: number,
  UserBranchNo: Number,
  IdsNo: number,
  IdsLevel:string,
  selectedOptionCode: number,
  IdsName: string,
  IdsPass?:string,
  IdsMobileNo: string,
  GLCashCode: number,
  SODflag?: Boolean,
  CSVPrintflag?: Boolean,
  GLVPrintflag?: Boolean,
  AutoVchflag?: Boolean,
  SMSflag?: Boolean,
  LIdsCashCredit: string,
  LIdsCashDebit:  string,
  LIdsTrfCredit:  string,
  LIdsTrfDebit:   string
}


export interface userLogin {
  LoginID: string,
  Terminal:string,
  Password: string
}


