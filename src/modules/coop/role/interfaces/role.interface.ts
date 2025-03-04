import { IFeatureAttrs } from "./feature.interface";

export interface IRoleAttrs {
  id?: number;
  roleName?: string;
  description?: string;
  approveStatus?: string;
  isActive?: boolean;
  doptorId?: number;
  approvedBy?: string;
  approveDate?: Date;
  createdBy?: string;
  createDate?: Date;
  updatedBy?: string;
  updateDate?: Date;
  features?: number[];
  featureList?: IFeatureAttrs[];
  assignedFeaturesIds?: number[];
}
