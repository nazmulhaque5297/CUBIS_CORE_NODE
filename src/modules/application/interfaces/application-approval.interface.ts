export interface applicationApproval {
  id: number;
  userId: number;
  remarks: string;
  actionDate: Date;
  serviceActionId: number;
  originUnitId: number;
  officeId: number;
  designationId: number;
  employeeId: number;
  attachment?: {
    fileName: string;
    date: Date;
  };
  createdBy: string;
  createDate: Date;
  updatedBy: string;
  updateDate: Date;
}

export interface applicationApprovalInput {
  remarks: string;
  serviceActionId: number;
  nextAppDesignationId: number;
  attachment?: {
    fileName: string;
    date: Date;
  };
  applicationId: number;
  serviceId?: number;
  doptorId: number;
  projectId: number;
  payload?: any;
}
