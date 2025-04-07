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
  officeId: number;
  districtId: number;
  upazilaId: number;
  projectId: number;
  samityDivisionId: number;
  samityDistrictId: number;
  samityUpaCityId: number;
  samityUpaCityType: string;
  samityUniThanaPawId: number;
  samityUniThanaPawType: string;
  samityDetailsAddress: string;
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
  declaration?: string;
  byLaw?: string;
  memberArea: memberAreaInputAttrs[];
  memberAreaType: number;
  workingArea: workingAreaInputAttrs[];
  workingAreaType: number;
  doptorId?: number;
  certificateGetBy?: string;
  samityFormationDate?: Date;
  oldRegistrationNo?: string;
  samityRegistrationDate: Date;
  accountType: string;
  accountNo: string;
  accountTitle: string;
  memberAdmissionFee?: number;

  applicationId: number;
}

export interface SamityAttrs extends SamityInputAttrs {
  id: number;
  status?: string; //i=inactive,a=active
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}

export interface memberAreaInputAttrs {
  samityId: number;
  divisionId: number;
  districtId: number | null;
  upaCityId: number | null;
  upaCityType: string | "";
  uniThanaPawId: number | null;
  uniThanaPawType: string | "";
  detailsAddress?: string | "";
  status?: string | "";
}

export interface memberAreaAttrs extends memberAreaInputAttrs {
  id: number;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}

export interface workingAreaInputAttrs {
  samityId?: string;
  divisionId?: string;
  districtId?: string;
  upaCityId: number;
  upaCityType: string;
  uniThanaPawId: number;
  uniThanaPawType: string;
  detailsAddress?: string;
  status?: string;
}

export interface workingAreaAttrs extends workingAreaInputAttrs {
  id: number;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}
