/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-06-19 11:53:43
 * @modify date 2022-06-19 11:53:43
 * @desc [description]
 */

export interface notificationObject {
  sms: { status: boolean; message: string };
  email: {
    body: string;
    status: boolean;
    subject: string;
  };
  component: { status: boolean; message: string };
  dashboard: { status: boolean; message: string };
}

export interface createNotification {
  userType: "citizen" | "user";
  userId: number;
  doptorId: number;
  serviceId: number;
  componentId: number;
  message?: string;
  applicationStatus?: any;
  applicationId?: number;
  serviceActionId?: number;
  createdBy: string;
}
export interface ComponentNotification {
  id?: number;
  userType: "citizen" | "user";
  userId?: number;
  designationId?: number;
  doptorId: number;
  componentId: number;
  content: object;
  readStatus?: boolean;
  readAt?: Date;
  createdBy?: string;
  createdAt?: Date;
}

export interface DashboardNotification {
  id?: number;
  userType: "citizen" | "user";
  userId?: number;
  designationId?: number;
  doptorId: number;
  componentId: number;
  content: object;
  sendStatus?: boolean;
  createdBy?: string;
  createdAt?: Date;
}

export interface SMSNotification {
  id?: number;
  userType: "citizen" | "user";
  userId?: number;
  designationId?: number;
  doptorId: number;
  componentId: number;
  content: object;
  sendStatus?: boolean;
  mobile?: string;
  createdBy?: string;
  createdAt?: Date;
}

export interface EmailNotification {
  id?: number;
  userType: "citizen" | "user";
  userId?: number;
  designationId?: number;
  doptorId: number;
  componentId: number;
  content: object;
  sendStatus?: boolean;
  email: string;
  createdBy?: string;
  createdAt?: Date;
}
