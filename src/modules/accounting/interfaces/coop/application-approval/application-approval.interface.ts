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
  attachment: JSON;
  createdBy: string;
  createDate: Date;
  updatedBy: string;
  updateDate: Date;
}

export interface applicationApprovalInput {
  remarks: string;
  serviceActionId: number;
  designationId: number | null;
  attachment?: string;
  attachmentUrl?: string;
  applicationId: number;
  serviceId?: number;
}
