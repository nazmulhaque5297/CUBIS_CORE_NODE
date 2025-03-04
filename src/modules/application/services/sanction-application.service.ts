import DataService from "../../master/services/master-data.service";
import Container, { Service } from "typedi";
import BadRequestError from "../../../errors/bad-request.error";
import lodash from "lodash";
import { Pool } from "pg";
import { toCamelKeys } from "keys-transform";
import { buildInsertSql } from "../../../utils/sql-builder.util";
import ServiceChargeService from "../../transaction/services/service-charge.service";
import moment from "moment";
import ProjectService from "../../master/services/project.service";
import { uploadObject as upload } from "../../../utils/minio.util";

@Service()
export class SanctionApplicationService {
  constructor() {}
  async createSanctionApplication(payload: any, customerInfo: any, pool: Pool) {
    const productInfoSql = `SELECT 
                                b.int_rate, 
                                a.cal_type, 
                                a.rep_frq, 
                                a.allow_grace_period, 
                                a.grace_period, 
                                a.grace_amt_repay_ins,
                                a.holiday_effect,
                                a.installment_amount_method,
                                a.installment_division_digit
                              FROM 
                                loan.product_mst a 
                                INNER JOIN loan.product_interest b ON a.id = b.product_id 
                              WHERE 
                                a.id = $1`;
    const productInfo = (await pool.query(productInfoSql, [payload.data.productId])).rows[0];
    let samitySql = `SELECT b.return_value AS meeting_day, a.week_position FROM samity.samity_info a
      INNER JOIN master.code_master b ON b.id = a.meeting_day
      WHERE a.id = $1`;

    let samityInfo = (await pool.query(samitySql, [payload.samityId])).rows[0];
    const serviceCharge = Container.get(ServiceChargeService);

    const loanData = await serviceCharge.get(
      Number(payload.data.loanAmount),
      Number(payload.data.loanTerm),
      Number(productInfo.int_rate),
      productInfo.cal_type,
      Number(payload.data.installmentNumber),
      productInfo.rep_frq,
      moment(new Date()),
      productInfo?.grace_amt_repay_ins ? productInfo.grace_amt_repay_ins : "NO",
      productInfo.grace_period,
      samityInfo.meeting_day,
      samityInfo.week_position ? Number(samityInfo.week_position) : undefined,
      payload.doptorId ? Number(payload.doptorId) : undefined,
      payload.officeId ? Number(payload.officeId) : undefined,
      productInfo.holiday_effect ? productInfo.holiday_effect : undefined,
      productInfo.installment_amount_method ? productInfo.installment_amount_method : undefined,
      productInfo.installment_division_digit ? Number(productInfo.installment_division_digit) : undefined
    );

    payload.data.frequency = loanData.installmentType;
    payload.data.interestRate = loanData.rate;
    payload.data.serviceCharge = loanData.serviceCharge;
    payload.data.installmentAmount = loanData.installmentAmount;
    payload.data.loanAmount = loanData.principal;
    payload.data.loanTerm = loanData.loanTerm;
    payload.data.installmentNumber = loanData.installmentNumber;

    const projectService: ProjectService = Container.get(ProjectService);
    const projectIds = await projectService.getPermitProjectIds(payload.nextAppDesignationId);
    if (!projectIds.includes(Number(payload.projectId)))
      throw new BadRequestError(`বাছাইকৃত প্রকল্পটিতে পর্যবেক্ষক/ অনুমোদনকারীর অনুমতি নেই`);
    payload.data.userId = payload.createdBy;
    payload.data.userType = "user";
    payload.data.remarks = customerInfo;
    for (const [index, value] of payload.data.documentList.entries()) {
      let buffer: any;
      let fileName: any;
      let mRes;
      let documentFront = "";
      let documentBack = "";
      if (value.documentFront && value.documentFrontType) {
        buffer = Buffer.from(value.documentFront, "base64");
        if (buffer) {
          fileName = `sanction-${payload.data.customerId}-${new Date().getTime()}.${
            String(value.documentFrontType).split("/")[1]
          }`;
          mRes = await upload({
            fileName: fileName,
            buffer: buffer,
          });
        }
        if (mRes) documentFront = fileName;

        buffer = "";
        fileName = "";
        mRes = "";
      }
      if (value.documentBack && value.documentBackType) {
        buffer = Buffer.from(value.documentBack, "base64");
        if (buffer) {
          fileName = `sanction-${payload.data.customerId}-${new Date().getTime()}.${
            String(value.documentBackType).split("/")[1]
          }`;
          mRes = await upload({
            fileName: fileName,
            buffer: buffer,
          });
        }
        if (mRes) documentBack = fileName;
        buffer = "";
        fileName = "";
        mRes = "";
      }

      const dataService: DataService = Container.get(DataService);
      const docTypeId = await dataService.getDocTypeId(value.documentType.toString(), pool);
      payload.data.documentList[index] = {
        documentTypeId: docTypeId,
        documentType: value.documentType.toString(),
        documentNumber: value.documentNumber ? value.documentNumber : null,
        documentFront: documentFront ? documentFront : "",
        documentBack: documentBack ? documentBack : "",
        status: true,
      };
    }

    let { sql, params } = buildInsertSql("temps.application", {
      ...lodash.omit(payload, ["serviceName", "officeId"]),
      remarks: customerInfo,
      editEnable: true,
    });
    let result = await (await pool.query(sql, params)).rows[0];

    return Object.keys(result).length > 0 ? toCamelKeys(result) : {};
  }
}
