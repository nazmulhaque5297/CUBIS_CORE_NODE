/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-16 17:48:00
 * @modify date 2021-11-16 17:48:00
 * @desc [description]
 */

export interface InitCommitteeMembersInputAttrs {
  memberId: number;
  committeeRoleId: number;
}

export interface InitCommitteeMembersAttrs
  extends InitCommitteeMembersInputAttrs {
  committeeMemberId?: number;
  samityId: number;
  memberType: string; // Samity Member(S)/Govt Official(G)
  name?: string;
  organization?: string;
  designation?: string;
  mobile?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}

export interface InitCommitteeRegistrationInputAttrs {
  samityId: number;
  doptorId?: number;
  noOfMember: number;
  committeeOrganizer: number;
  committeeContactPerson: number;
  committeeSignatoryPerson: number;
  committeeMembers: InitCommitteeMembersInputAttrs[];
  isMemberOfCentalOrNational: Boolean;
}

export interface InitCommitteeRegistrationAttrs
  extends InitCommitteeRegistrationInputAttrs {
  committeeId: number;
  electionDate?: Date;
  effectDate?: Date;
  expireDate?: Date;
  duration: number;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string | null;
  updatedAt?: Date | null;
  committeeMembers: InitCommitteeMembersAttrs[];
}

export interface InitCommitteeRegistrationUpdateAttrs
  extends InitCommitteeRegistrationInputAttrs {
  committeeId: number;
}
