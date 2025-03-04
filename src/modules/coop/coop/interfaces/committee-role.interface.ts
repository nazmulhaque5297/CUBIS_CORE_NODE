/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-02 13:51:26
 * @modify date 2021-11-02 13:51:26
 * @desc [description]
 */

export interface CommitteeRoleInputAttrs {
  roleName: string;
  noOfMember?: number;
}

export interface CommitteeRoleAttrs extends CommitteeRoleInputAttrs {
  committeeRoleId?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}
