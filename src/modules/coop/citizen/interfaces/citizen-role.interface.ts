/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-12-05 11:34:16
 * @modify date 2021-12-05 11:34:16
 * @desc [description]
 */

export interface CitizenRoleAttrs {
  id?: number;
  roleName?: string;
  description?: string;
  approveStatus?: string;
  isActive?: boolean;
  approvedBy?: string;
  approveDate?: Date;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string;
  updatedAt?: Date;
}
