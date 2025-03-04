import { toCamelKeys } from "keys-transform";
import { PoolClient } from "pg";
import { BadRequestError, buildInsertSql } from "rdcd-common";
import { Service } from "typedi";

@Service()
export class EmployeeMigrationServices {
  constructor() { }
  async migration(applicationData: any, transaction: PoolClient) {

    const employeeInfoData = applicationData.employeeInfo;
    const imageDocument = applicationData.imageDocument.fileName;
    const signatureDocument = applicationData.signatureDocument.fileName;
    const createdBy = applicationData.userId;
    const createdAt = new Date();
    employeeInfoData.status = true;
    const allMigrationData = {
      ...employeeInfoData,
      imageDocument,
      signatureDocument,
      createdBy,
      createdAt,
    };

    allMigrationData.ranking = applicationData.employeeInfo.ranking ? applicationData.employeeInfo.ranking : null;
    allMigrationData.employee_id = applicationData.employeeInfo.employeeId;
    allMigrationData.religion = parseInt(applicationData.employeeInfo.religion?.id);
    allMigrationData.samityId = parseInt(applicationData.employeeInfo.samityId?.id)
      ? parseInt(applicationData.employeeInfo.samityId?.id)
      : parseInt(applicationData.employeeInfo.samityId);
    allMigrationData.designationId = parseInt(applicationData.employeeInfo.designationId?.id)
      ? parseInt(applicationData.employeeInfo.designationId?.id)
      : null;
    allMigrationData.maritalStatusId = parseInt(applicationData.employeeInfo.maritalStatusId?.id);
    allMigrationData.educationalQualification = parseInt(applicationData.employeeInfo.educationalQualification?.id);

    const { sql: employeeInfoCreationSql, params: employeeCreationParams } = buildInsertSql(
      "coop.employee_info",
      allMigrationData
    );


    try {
      const employeeResult = await (await transaction.query(employeeInfoCreationSql, employeeCreationParams)).rows[0];
      const migrateSamityInfo = employeeResult ? toCamelKeys(employeeResult) : employeeResult;
    } catch (error: any) {
      throw new BadRequestError(error);

    }
  }
}
