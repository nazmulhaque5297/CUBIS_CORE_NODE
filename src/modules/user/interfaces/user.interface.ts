export interface IUserAttrs {
  id: number;
  name: string;
  username: string;
  mobile: string;
  email: string;

  doptorId: number | null;
  officeId: number | null;
  layerId: number | null;
  originId: number | null;
  employeeId: number | null;
  designationId: number | null;

  isActive: boolean;

  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: string;
}

export interface UsersTokenAttrs {
  userId: number;
  name: string;
  username: string;
  designationNameBn: string;
  designationNameEn: string;
  doptorId: number;
  officeId: number;
  officeNameBn: string;
  officeNameEn: string;
  layerId: number;
  originId: number;
  employeeId: number;
  designationId: number;
  type: string;
  iat: number;
  exp: number;
}

export interface ICreateUserAttrs {
  id: number;
  name: string;
  username: string;
  mobile: string;
  email: string;

  doptorId: number | null;
  officeId: number | null;
  layerId: number | null;
  originId: number | null;
  employeeId: number | null;
  designationId: number | null;

  isActive: boolean;

  createdBy: string;
}

export interface ICreatePersonAttrs {
  id?: number;
  nameEn?: string;
  nameBn?: string;
  nid: string;
  brn?: string;
  passport?: string;
  nidFrontUrl?: string;
  nidBackUrl?: string;
  dob?: string;
  mobile?: string;
  email?: string;
  fatherNameEn?: string;
  fatherNameBn?: string;
  motherNameEn?: string;
  motherNameBn?: string;
  spouseName?: string;
  gender?: string;
  religion?: string;
  photoUrl?: string;
  createdBy: string;
}

export interface IUpdateUserAttrs {
  id: number;
  username?: string;

  designationBn?: string;
  designationEn?: string;

  employeeId?: number;
  doptorId?: number | null;
  officeUnitId?: number;
  inchargeLabel?: string;
  officeUnitOrganogramId?: number;

  officeNameEn?: string;
  officeNameBn?: string;

  unitNameEn?: string;
  unitNameBn?: string;

  isCadre?: number;
  employeeGrade?: string;
  joiningDate?: string;
  designationLevel?: number;
  designationSequence?: number;
  officeHead?: number;
  lastOfficeDate?: string;

  approveStatus?: string;
  isActive?: boolean;
  officeId?: number;
  personId?: number;
  roleId?: number;

  updatedBy: string;
  updateDate: Date;
}
