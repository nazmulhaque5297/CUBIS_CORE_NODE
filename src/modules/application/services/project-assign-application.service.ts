import { Service } from "typedi";
import lodash from "lodash";
import { Pool } from "pg";
import { toCamelKeys } from "keys-transform";
import { buildInsertSql } from "../../../utils/sql-builder.util";

@Service()
export class ProjectAssignApplicationService {
  constructor() {}
  async createProjectAssignApplication(applicationData: any, userInfo: any, pool: Pool) {
    const userNameSql = `SELECT  
                          b.name_bn designation_bn,
                          c.name_bn
                        FROM 
                          users.user a
                          INNER JOIN master.office_designation b ON b.id = a.designation_id
                          INNER JOIN master.office_employee c ON c.id = a.employee_id
                        WHERE 
                          a.id = $1`;
    let assignProjectsIds = [];
    var userWiseProjectsDetails = (await pool.query(userNameSql, [applicationData.data.userId])).rows[0];
    for (let [index, singleProject] of applicationData.data.projects.entries()) {
      if (singleProject.assignStatus.toString() != singleProject.isChecked.toString()) {
        if (singleProject.assignStatus.toString() == "false" && singleProject.isChecked.toString() == "true") {
          assignProjectsIds.push(singleProject.id);
        }
      }
    }
    const projectNameSql = `SELECT project_name_bangla, project_director FROM master.project_info WHERE id = ANY($1::INT[])`;
    let projectsName = (await pool.query(projectNameSql, [assignProjectsIds])).rows;
    projectsName = projectsName.length > 0 ? projectsName.map((value: any) => value.project_name_bangla) : projectsName;
    userInfo = `ব্যবহারকারীর নাম: ${userWiseProjectsDetails.name_bn},
                  ব্যবহারকারীর পদবি: ${userWiseProjectsDetails.designation_bn},
                  বরাদ্দকৃত প্রকল্প: ${projectsName}`;
    applicationData.data.assignUser = applicationData.data.userId;
    applicationData.data.userId = applicationData.createdBy;
    applicationData.data.userType = "user";
    applicationData.data.remarks = userInfo;
    let { sql, params } = buildInsertSql("temps.application", {
      ...lodash.omit(applicationData, ["officeId", "serviceName"]),
      remarks: userInfo,
    });
    let result = await (await pool.query(sql, params)).rows[0];

    return Object.keys(result).length > 0 ? toCamelKeys(result) : {};
  }
}
