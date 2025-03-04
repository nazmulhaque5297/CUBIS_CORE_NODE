export interface nameClearanceInput {
  id: number;
  samityName: string;
  samityTypeId: number;
  userId: number;
  divisionId: number;
  districtId: number;
  upazilaId: number;
  cityCorpId: number;
  unionId: number;
  status: string;
  village?: string;
}

export interface nameClearanceOutput extends nameClearanceInput {
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}
