/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-03 14:58:26
 * @modify date 2021-11-03 14:58:26
 * @desc [description]
 */

//interface of committee member input
export interface CommitteeMemberInputAttrs {
  committeeId: number;
  samityId: number;
  memberType: string; // Samity Member(S)/Govt Official(G)
  memberId: number;
  name?: string;
  organization?: string;
  designation?: string;
  mobile?: string;
  committeeRoleId: string;
}

//interface of committee member
export interface CommitteeMemberAttrs {
  committeeMemberId?: number;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}
