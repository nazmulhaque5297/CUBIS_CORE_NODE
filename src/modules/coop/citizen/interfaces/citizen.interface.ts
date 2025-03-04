/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-24 12:02:00
 * @modify date 2021-11-24 12:02:00
 * @desc [description]
 */

export interface CitizenInputAttrs {
  myGovId: string;
  mobile: string;
  email: string;
  memberId: string;
  nid: string;
  name: string;
  nameBangla: string;
  motherName?: string;
  motherNameBangla?: string;
  fatherName?: string;
  fatherNameBangla?: string;
  spouseName?: string;
  spouseNameBangla?: string;
  gender: string;
  dob: string;
  occupation?: string;
  religion?: string;
  presentAddress?: string;
  permanentAddress?: string;
  photo?: string;
  type: string;
  brn?: string;
  passport?: string;
  tin?: string;
  bin?: string;
  emailVerify: string;
  nidVerify: string;
  brnVerify: string;
  passportVerify: string;
  tinVerify: string;
  binVerify: string;
}

export interface CitizenAttrs extends CitizenInputAttrs {
  id: number;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: string;
}

export interface CitizenUpdateAttrs {
  id: number;
  myGovId?: string;
  mobile?: string;
  email?: string;
  nid?: string;
  name?: string;
  nameBangla?: string;
  motherName?: string;
  motherNameBangla?: string;
  fatherName?: string;
  fatherNameBangla?: string;
  spouseName?: string;
  spouseNameBangla?: string;
  gender?: string;
  dob?: string;
  occupation?: string;
  religion?: string;
  presentAddress?: string;
  permanentAddress?: string;
  photo?: string;
  type?: string;
  brn?: string;
  passport?: string;
  tin?: string;
  bin?: string;
  emailVerify?: string;
  nidVerify?: string;
  brnVerify?: string;
  passportVerify?: string;
  tinVerify?: string;
  binVerify?: string;

  updatedBy: string;
  updatedAt: Date;
}
