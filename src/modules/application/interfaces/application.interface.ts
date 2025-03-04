export interface ApplicationAttrs {
    id?: number;
    samityId?: number | null;
    serviceId?: number;
    nextAppDesignationId?: number;
    finalApprove?: string;
    data: any;
    message?:string;
    createdBy?: string;
    createdAt?: Date;
    updatedBy?: string;
    updatedAt?: Date;
  }