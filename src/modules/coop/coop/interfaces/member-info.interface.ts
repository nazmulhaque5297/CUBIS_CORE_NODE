/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-10-27 12:20:14
 * @modify date 2021-10-27 12:20:14
 * @desc [description]
 */

export interface MemberInfoInputAttrs {
  samityId: number;
  nid: number;
  dob: Date;
  memberName: string;
  fatherName: string;
  motherName: string;
  spouseName: string;
  gender?: string; //m=male,f=female,o=others
  occupationId: string;
  mobile: string;
  email?: string;
  divisionId: string;
  districtId: string;
  upazilaId: string;
  cityCorpId: string;
  unionId: string;
  permanentAddress: string;
  presentAddress: string;
  memberPhoto?: string;
  memberSign?: string;
  memberTestimonial?: string;
  memberPhotoUrl?: string;
  memberSignUrl?: string;
  memberTestimonialUrl?: string;
}

export interface MemberInfoAttrs extends MemberInfoInputAttrs {
  memberId?: string;
  committeeOrganizer?: string;
  committeeContactPerson?: string;
  CommitteeSignatoryPerson?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}

export interface UpdateMemberDesignationAttrs {
  committeeOrganizer: number;
  committeeContactPerson: number;
  committeeSignatoryPerson: number;
}
