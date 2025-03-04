import Container, { Service } from "typedi";
import lodash from "lodash";
import { Pool } from "pg";
import { toCamelKeys } from "keys-transform";
import { buildInsertSql } from "../../../utils/sql-builder.util";
import SamityService from "../../samity/services/samity.service";
import ProjectService from "../../master/services/project.service";
import { BadRequestError } from "rdcd-common";

@Service()
export class LoanDisbursementApplicationService {
  constructor() {}
  async createLoanDisbursementApplication(applicationData: any, customerInfo: any, pool: Pool) {
    const samityService: SamityService = Container.get(SamityService);
    const customerLoanInfo = await samityService.getCustomerLoanInfo(Number(applicationData.data.customerId));
    if (customerLoanInfo && customerLoanInfo[0]) {
      applicationData.data.productId = customerLoanInfo[0]?.productId;
    }
    const projectService: ProjectService = Container.get(ProjectService);
    const projectIds = await projectService.getPermitProjectIds(applicationData.nextAppDesignationId);

    if (applicationData.projectId && !projectIds.includes(Number(applicationData.projectId)))
      throw new BadRequestError(`বাছাইকৃত প্রকল্পটিতে পর্যবেক্ষক/ অনুমোদনকারীর অনুমতি নেই`);
    applicationData.data.remarks = customerInfo;
    applicationData.data.userId = applicationData.createdBy;
    applicationData.data.userType = "user";
    // applicationData.isEditable = true;
    let { sql, params } = buildInsertSql("temps.application", {
      ...lodash.omit(applicationData, ["officeId", "serviceName", "projectStatus"]),
      remarks: customerInfo,
    });
    let result = await (await pool.query(sql, params)).rows[0];

    return Object.keys(result).length > 0 ? toCamelKeys(result) : {};
  }
}
