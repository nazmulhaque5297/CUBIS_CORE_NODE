/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-12-27 10:44:32
 * @modify date 2021-12-27 10:44:32
 * @desc [description]
 */

export interface ApplicationAttrs {
  id?: number;
  doptorId?: number;
  samityId?: number | null;
  serviceId?: number;
  nextAppDesignationId?: number;
  finalApprove?: string;
  data: any;
  editEnable?: Boolean;
  status?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string;
  updatedAt?: Date;
}

export interface CommitteeRequestAttrs {
  committee_type?: string;
  election_date?: Date;
  effect_date?: Date;
  expire_date?: Date;
  members?: any;
}
