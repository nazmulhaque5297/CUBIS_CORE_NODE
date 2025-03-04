import Container, { Service } from "typedi";
import lodash from "lodash";
import { Pool } from "pg";
import { toCamelKeys } from "keys-transform";
import { buildInsertSql } from "../../../utils/sql-builder.util";
import { BadRequestError } from "rdcd-common";
import ProjectService from "../../master/services/project.service";
import db from "../../../db/connection.db";

@Service()
export class ProductCreateApplicationService {
  constructor() {}
  async productCreateValidation(payload: any) {
    const pool = db.getConnection("slave");
    const existingApplicationSql = `SELECT 
                                      COUNT(*) 
                                    FROM 
                                      temps.application 
                                    WHERE 
                                      service_id = 11 
                                      AND created_by = $1
                                      AND status != 'A'`;
    const existingApplicationCount = (await pool.query(existingApplicationSql, [payload.data.userId])).rows[0].count;

    if (existingApplicationCount > 0) {
      throw new BadRequestError(`ইতিমধ্যে ব্যবহারকারীর একটি প্রোডাক্ট তৈরির আবেদন অপেক্ষমান আছে`);
    } else return true;
  }

  async createProductApplication(applicationData: any, pool: Pool) {
    applicationData.data = {
      ...applicationData.data,
      userId: applicationData.createdBy,
      userType: "user",
    };
    //applicationData = { ...applicationData, userId: applicationData.createdBy, userType: "user" };
    if (applicationData.nextAppDesId) {
      const projectService: ProjectService = Container.get(ProjectService);
      const projectIds = await projectService.getPermitProjectIds(applicationData.nextAppDesId);
      if (!projectIds.includes(Number(applicationData.projectId)))
        throw new BadRequestError(`বাছাইকৃত প্রকল্পটিতে পর্যবেক্ষক/ অনুমোদনকারীর অনুমতি নেই`);
    }
    let { sql, params } = buildInsertSql("temps.application", {
      ...lodash.omit(applicationData, ["officeId", "serviceName"]),
      remarks: "প্রোডাক্ট তৈরি অ্যাপ্লিকেশন সম্পন্ন হয়েছে",
    });
    let result = await (await pool.query(sql, params)).rows[0];

    return Object.keys(result).length > 0 ? toCamelKeys(result) : {};
  }
}
