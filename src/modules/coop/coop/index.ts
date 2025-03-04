import { Application } from "express";
import "reflect-metadata";
import { AuthorizedPersonRouter } from "./routes/authorized-person.route";
import { committeeRoleRouter } from "./routes/committee-role.route";
import { applicationApprovalRouter } from "./routes/coop/application-approval/application-approval.route";
import { applicationRouter } from "./routes/coop/application/application.route";
import { committeeInfoRouter } from "./routes/coop/committee-info.router";
import { auditInfoRouter } from "./routes/coop/audit-info.router";
import { coopWorkingAreaRouter } from "./routes/coop/coop-working-area.route";
import { MemberInfoRouter } from "./routes/coop/member-info.route";
import { nameClearanceRouter } from "./routes/coop/name-clearance.route";
import { samityInfoRouter } from "./routes/coop/samityInfo/samity-info.route";
import { dashBoardSamityInfoRouter } from "./routes/dashboard/samity-info.route";
import { dashBoardRouter } from "./routes/dashboard/dashboard.router";
import { subscribeRoute } from "./routes/dashboard/subscribe.route";
import { docMappingRouter } from "./routes/doc-mapping.route";
import financialYearRouter from "./routes/financial-route";
import glacMstRouter from "./routes/glac-mst.router";
import { initCommitteeRegistrationRouter } from "./routes/init/init-committee-registration.route";
import initMemberFinancialRouter from "./routes/init/init-member-financial.route";
import { initMemberInfoRouter } from "./routes/init/init-member-info.route";
import { initSamityDocumentRouter } from "./routes/init/init-samity-document.route";
import { initSamityRegistrationRouter } from "./routes/init/init-samity-info.route";
import initSamityTransactionRouter from "./routes/init/init-samity-transaction.route";
import memberAreaRouter from "./routes/member-area.route";
import { regStepsRouter } from "./routes/reg-steps.router";
import { samityVerifyRouter } from "./routes/samity-certificate-verifiy.router";
import { samityTypeRouter } from "./routes/samity-type.route";
import { serviceInfoRoute } from "./routes/service_info.route";
import workingAreaRouter from "./routes/working-area.route";

export function init(app: Application) {
  //init
  app.use("/coop/init-samity-registration", initSamityRegistrationRouter);
  app.use("/coop/init-member-info", initMemberInfoRouter);
  app.use("/coop/init-committee-registration", initCommitteeRegistrationRouter);
  app.use("/coop/init-member-financial-info", initMemberFinancialRouter);
  app.use("/coop/init-samity-document", initSamityDocumentRouter);
  app.use("/coop/init-samity-gl-trans", initSamityTransactionRouter);

  //coop
  app.use("/coop/samity-info", samityInfoRouter);
  app.use("/coop/member-info", MemberInfoRouter);
  app.use("/coop/name-clearance", nameClearanceRouter);
  app.use("/coop/application-approval", applicationApprovalRouter);
  app.use("/coop/application", applicationRouter);

  app.use("/coop/samity-type", samityTypeRouter);
  app.use("/coop/member-area", memberAreaRouter);
  app.use("/coop/working-area", workingAreaRouter);
  app.use("/coop/committee-role", committeeRoleRouter);
  app.use("/coop/gl-list", glacMstRouter);
  app.use("/coop/financial-year-list", financialYearRouter);
  app.use("/coop/authorized-person", AuthorizedPersonRouter);
  app.use("/coop/samity-reg-steps", regStepsRouter);
  app.use("/coop/coop-working-area", coopWorkingAreaRouter);

  app.use("/coop/doc-mapping", docMappingRouter);
  app.use("/coop/service-info", serviceInfoRoute);

  app.use("/coop/committee-info", committeeInfoRouter);
  app.use("/coop/audit", auditInfoRouter);

  //samity-certificate-verify
  app.use("/coop/samity-certificate-verify", samityVerifyRouter);

  //dashboard
  app.use("/coop/dashboard/samity-info", dashBoardSamityInfoRouter);
  app.use("/coop/dashboard", dashBoardRouter);
  app.use("/coop/subscribe", subscribeRoute);
}
