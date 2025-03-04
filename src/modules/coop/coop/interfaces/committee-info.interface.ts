/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-03 10:11:46
 * @modify date 2021-11-03 10:11:46
 * @desc [description]
 */

export interface CommitteeInfoInputAttrs {
  samityId: number;
  committeeType: string; //Selected (2years)/Elected (3Years)/Intermediate(120 days)  S/E/I
  noOfMember: number;
}

export interface CommitteeInfoAttrs extends CommitteeInfoInputAttrs {
  committeeId?: string;
  electionDate?: Date;
  effectDate?: Date;
  expireDate?: Date;
  duration: number;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}
