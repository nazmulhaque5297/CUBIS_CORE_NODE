/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2023-06-15 11:28:29
 * @modify date 2023-06-15 11:28:29
 * @desc [description]
 */

import { toCamelKeys } from "keys-transform";
import lo from "lodash";
import { PoolClient } from "pg";
import { buildGetSql } from "rdcd-common";
import Container, { Service } from "typedi";
import db from "../../../db/connection.db";
import BadRequestError from "../../../errors/bad-request.error";
import { buildInsertSql, buildUpdateWithWhereSql } from "../../../utils/sql-builder.util";
import { applicationApprovalInput } from "../interfaces/application-approval.interface";
import ServiceInfoServices from "./service-info.service";

@Service()
export class ApplicationApprovalServices {
  constructor() {}

  async create(
    data: applicationApprovalInput,
    userId: number,
    employeeId: number,
    approverOfficeId: number,
    serviceId: number,
    designationId: number
  ) {
    const ServiceInfoService = Container.get(ServiceInfoServices);
    const serviceAction = await ServiceInfoService.getServiceActionById(serviceId, data.serviceActionId);
    if (serviceAction) throw new BadRequestError("serviceActionId is not found");

    const transaction = await db.getConnection("master").connect();

    let result: any;
    let applicationUpdateQuery: any, applicationUpdateParams, response;

    try {
      transaction.query("BEGIN");
      if (serviceAction.isFinal && serviceAction.applicationStatus == "R") {
        const { sql, params } = buildUpdateWithWhereSql(
          "temps.application",
          {
            id: data.applicationId,
          },
          { status: "R" }
        );

        result = (await transaction.query(sql, params)).rows[0];
        await transaction.query("COMMIT");

        return { message: serviceAction.notification, data: toCamelKeys(result) };
      } else {
        const { sql, params } = buildInsertSql("temps.application_approval", {
          ...lo.omit(data, ["nextAppDesignationId", "payload"]),
          designationId: designationId,
          actionDate: new Date(),
          createdAt: new Date(),
          createdBy: userId,
          userId,
          employeeId,
          officeId: approverOfficeId,
        });

        result = (await transaction.query(sql, params)).rows;

        applicationUpdateQuery = `UPDATE 
                              temps.application 
                            SET 
                              status = $1, 
                              updated_at = $2, 
                              updated_by = $3, 
                              next_app_designation_id = $4 
                            WHERE 
                              id = $5`;

        applicationUpdateParams = [
          serviceAction.applicationStatus,
          new Date(),
          userId,
          data.nextAppDesignationId,
          Number(data.applicationId),
        ];

        //final data save during approval
        this.applicationFinalValidation(data, serviceAction, userId, transaction);
      }
      await transaction.query(applicationUpdateQuery, applicationUpdateParams);
      await transaction.query("COMMIT");
      return { message: serviceAction.notification, data: toCamelKeys(result) };
    } catch (error: any) {
      transaction.query("ROLLBACK");
      throw new BadRequestError(String(error).substring(7));
    } finally {
      transaction.release();
    }
  }

  async applicationFinalValidation(
    data: applicationApprovalInput,
    serviceAction: any,
    userId: number,
    transaction: PoolClient
  ) {
    if (serviceAction.isFinal) {
      const getApplicationSql = buildGetSql(
        [
          "id",
          "doptor_id",
          "project_id",
          "samity_id",
          "service_id",
          "next_app_designation_id",
          "status",
          "data",
          "created_by",
        ],
        "temps.application",
        { id: data.applicationId }
      );

      let [applicationData] = (await transaction.query(getApplicationSql.queryText, getApplicationSql.values)).rows;

      if (!applicationData) throw new BadRequestError("আবেদনটি খুঁজে পাওয়া যাইনি");

      applicationData = applicationData ? toCamelKeys(applicationData) : applicationData;
      if (applicationData.status == "A") throw new BadRequestError(`আবেদনটি ইতিমধ্যে অনুমোদন করা হয়েছে`);
      else if (applicationData.created_by == userId) {
        throw new BadRequestError("আবেদনকারী এবং অনুমোদনকারী ভিন্ন হতে হবে");
      } else {
      }
    }
  }
}
