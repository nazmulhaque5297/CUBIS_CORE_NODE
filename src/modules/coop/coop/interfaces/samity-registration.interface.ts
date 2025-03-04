/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-10-24 12:56:41
 * @modify date 2021-10-24 12:56:41
 * @desc samity registration interface
 */

export interface SamityInputAttrs {
  samityCode: string;
  samityName: string;
  samityLevel: string;
  organizerId: number;
  initiatorOfficeId: number;
  projectId: number;
  officeDivisionId: number;
  officeDistrictId: number;
  officeUpazilaId: number;
  officeCityCorpId: number;
  officeUnionId: number;
  officeDetailsAddress: string;
  samityTypeId: number;
  purpose?: string;
  noOfShare: number;
  sharePrice: number;
  soldShare: number;
  phone?: string;
  mobile?: string;
  email?: string;
  enterprisingId?: number;
  website?: string;
  byLaw?: string;
}

export interface SamityAttrs extends SamityInputAttrs {
  samityId?: string;
  status?: string; //i=inactive,a=active
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}
