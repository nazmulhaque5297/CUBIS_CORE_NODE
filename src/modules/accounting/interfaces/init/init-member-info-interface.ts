/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-10-27 12:20:14
 * @modify date 2021-10-27 12:20:14
 * @desc [description]
 */

export interface InitialMemberInfoInputAttrs {
  memberCode: string;
  samityId: number;
  doptorId?: number;
  educationLevelId?: number;
  maritalStatusId?: number;
  genderId?: number;
  nid?: number;
  brn?: number;
  dob: Date;
  memberName: string;
  memberNamebangla: string;
  fatherName: string;
  motherName: string;
  spouseName: string;
  occupationId: string;
  mobile: string;
  email?: string;
  permanentAddress: any;
  presentAddress: any;
  documents: MemberDocuments[];
  memberPhoto?: any;
  memberSign?: any;
  // memberTestimonial?: string;
  // memberPhotoUrl?: string;
  // memberSignUrl?: string;
  // memberTestimonialUrl?: string;
  isActive?: boolean;
}

export interface MemberDocuments {
  doctypeId?: number;
  docType?: string;
  docTypeDesc?: string;
  name: string;
  mimeType?: string;
  base64Image?: string;
  fileName?: string;
}

export interface InitialMemberReg {
  memberCode: string;
  samityId: number;
  educationLevelId?: number;
  maritalStatusId?: number;
  genderId?: number;
  nid?: number;
  brn?: number;
  dob: Date;
  memberName: string;
  memberNamebangla: string;
  fatherName: string;
  motherName: string;
  spouseName: string;
  occupationId: string;
  mobile: string;
  email?: string;
  // memberPhoto?: string;
  // memberSign?: string;
  // memberTestimonial?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}

export interface MemberAddress {
  samityId?: number;
  memberId?: string;
  districtId?: number;
  upaCityId?: number;
  upaCityType?: string;
  uniThanaPawId?: number;
  uniThanaPawType?: string;
  detailsAdress?: string;
}

export interface MemberInfos extends InitialMemberReg {
  id: number;
  memberPhotoUrl?: string;
  memberSignUrl?: string;
  memberTestimonialUrl?: string;
  committeeOrganizer?: string;
  committeeContactPerson?: string;
  CommitteeSignatoryPerson?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}

export interface MemberInfoOutput {
  memberValue: MemberInfos;
  PresentAddress: MemberAddressInfos;
  PermanentAddress: MemberAddressInfos;
  memberFinancialData: {};
}

export interface MemberAddressInfos {
  id: number;
  samityId: number;
  memberId: number;
  addressType: string;
  districtId?: number;
  upazilaId?: number;
  cityCorpId?: number;
  unionId?: number;
  village?: string;
}

// export interface MemberInfoAttrs extends InitialMemberInfoInputAttrs {
//   memberId?: string;
//   committeeOrganizer?: string;
//   committeeContactPerson?: string;
//   CommitteeSignatoryPerson?: string;
//   createdBy?: string;
//   createdAt?: Date;
//   updatedBy?: string | null;
//   updatedAt?: Date | null;
// }

export interface UpdateMemberDesignationAttrs {
  committeeOrganizer: number;
  committeeContactPerson: number;
  committeeSignatoryPerson: number;
}
