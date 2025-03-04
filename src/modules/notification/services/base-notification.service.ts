/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-06-28 11:00:32
 * @modify date 2022-06-28 11:00:32
 * @desc [description]
 */

import { buildGetSql } from "rdcd-common";
import Container, { Service } from "typedi";
import { pgConnect } from "../../../db-coop/factory/connection.db";
import db from "../../../db/connection.db";
import { createNotification, notificationObject } from "../interfaces/component.interface";
import { ComponentNotificationService } from "./component.service";
import { DashboardNotificationService } from "./dashboard.service";
import { EmailNotificationService } from "./email.service";
import { SMSNotificationService } from "./sms.service";

@Service()
export class NotificationService {
  constructor() {}

  async create(notifications: notificationObject, data: createNotification) {
    //component notification
    if (notifications.component.status === true) {
      const componentNotification = Container.get(ComponentNotificationService);
      await componentNotification.create({
        userType: data.userType,
        userId: data.userId,
        doptorId: data.doptorId,
        componentId: data.componentId,
        content: {
          message: data.message ? data.message + notifications.component.message : notifications.component.message,
          serviceId: data.serviceId,
          applicationStatus: data.applicationStatus,
          applicationId: data.applicationId,
          serviceActionId: data.serviceActionId,
        },
        createdBy: data.createdBy,
        createdAt: new Date(),
      });
    }

    //dashboard notification
    if (notifications.dashboard.status === true) {
      const dashboardNotification = Container.get(DashboardNotificationService);
      await dashboardNotification.create({
        userType: data.userType,
        userId: data.userId,
        doptorId: data.doptorId,
        componentId: data.componentId,
        content: {
          message: data.message ? data.message + notifications.component.message : notifications.component.message,
          serviceId: data.serviceId,
          applicationStatus: data.applicationStatus,
          applicationId: data.applicationId,
          serviceActionId: data.serviceActionId,
        },
        createdBy: data.createdBy,
        createdAt: new Date(),
      });
    }

    //sms notification
    if (notifications.sms.status === true) {
      const smsNotification = Container.get(SMSNotificationService);
      await smsNotification.create({
        userType: data.userType,
        userId: data.userId,
        doptorId: data.doptorId,
        componentId: data.componentId,
        content: {
          message: data.message ? data.message + notifications.component.message : notifications.component.message,
          serviceId: data.serviceId,
          applicationStatus: data.applicationStatus,
          applicationId: data.applicationId,
          serviceActionId: data.serviceActionId,
        },
        mobile: await this.getMobileNumber(data.userType, data.userId),
        createdBy: data.createdBy,
        createdAt: new Date(),
      });
    }

    //email notification
    if (notifications.email.status === true) {
      const emailNotification = Container.get(EmailNotificationService);
      await emailNotification.create({
        userType: data.userType,
        userId: data.userId,
        doptorId: data.doptorId,
        componentId: data.componentId,
        content: {
          subject: notifications.email.subject,
          body: notifications.email.body,
          serviceId: data.serviceId,
          applicationStatus: data.applicationStatus,
          applicationId: data.applicationId,
          serviceActionId: data.serviceActionId,
        },
        email: await this.getEmailId(data.userType, data.userId),
        createdBy: data.createdBy,
        createdAt: new Date(),
      });
    }
  }

  async getMobileNumber(userType: "citizen" | "user", userId: number) {
    // let mobile_no;
    // if (userType == "citizen") {
    //   const { queryText, values } = buildGetSql(["mobile"], "users.user", {
    //     id: userId,
    //   });

    //   const {
    //     rows: [{ mobile_no: mobile }],
    //   } = await db.getConnection("slave").query(queryText, values);

    //   mobile_no = mobile;
    // }

    // if (userType == "user") {
    //   const { queryText, values } = buildGetSql(["mobile"], "users.user", {
    //     id: userId,
    //   });

    //   const {
    //     rows: [{ mobile }],
    //   } = await db.getConnection("slave").query(queryText, values);

    //   mobile_no = mobile;
    // }

    const { queryText, values } = buildGetSql(["mobile"], "users.user", {
      id: userId,
    });

    const {
      rows: [{ mobile }],
    } = await db.getConnection("slave").query(queryText, values);

    return mobile;
  }

  async getEmailId(userType: "citizen" | "user", userId: number) {
    // let email_id;
    // if (userType == "citizen") {
    //   const { queryText, values } = buildGetSql(["email"], "users.user", {
    //     id: userId,
    //   });

    //   const {
    //     rows: [{ email_id: email }],
    //   } = await db.getConnection("slave").query(queryText, values);

    //   email_id = email;
    // }

    // if (userType == "user") {
    //   const { queryText, values } = buildGetSql(["email"], "users.user", {
    //     id: userId,
    //   });

    //   const {
    //     rows: [{ email }],
    //   } = await db.getConnection("slave").query(queryText, values);

    //   email_id = email;
    // }
    const { queryText, values } = buildGetSql(["email"], "users.user", {
      id: userId,
    });

    const {
      rows: [{ email }],
    } = await db.getConnection("slave").query(queryText, values);

    return email;
  }

  async createCustomNotificationMessage(serviceId: number, applicationId: number): Promise<string> {
    const sqlForApplication = `select
                                  a.data->>'samity_name' as samity_name_application,
                                  a.data->'samity_info'->>'samity_name' as samity_name_from_data,
                                  b.samity_name,
                                  c.service_name
                                from
                                  coop.application a
                                left join coop.samity_info b on
                                  a.samity_id = b.id
                                inner join coop.service_info c on a.service_id = c.id
                                where a.id=$1`;
    const applicationData = (await (await pgConnect.getConnection("slave")).query(sqlForApplication, [applicationId]))
      .rows[0];
    return `${applicationData.service_name} (${
      applicationData.samity_name
        ? applicationData.samity_name
        : applicationData.samity_name_application
        ? applicationData.samity_name_application
        : applicationData.samity_name_from_data
        ? applicationData.samity_name_from_data
        : null
    }) - `;
  }
  async createCustomNotificationMessageForLoan(serviceId: number, applicationId: number): Promise<string> {
    const sqlForApplication = `select a.service_id,
    b.service_name
    from
    temps.application a
    inner join master.service_info b on a.service_id = b.id
    where a.id=1706`;
    const applicationData = (await (await pgConnect.getConnection("slave")).query(sqlForApplication, [applicationId]))
      .rows[0];
    return `${applicationData.service_name} - `;
  }
}
