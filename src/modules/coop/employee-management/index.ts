import { Application } from "express";
import { designationRouter } from "./routes/employee-designation.route";
import { salaryRoute } from "./routes/employee-salary.route";
import { employeeInformationRouter } from "./routes/employee_information.route";

export function init(app: Application) {
  app.use("/coop/employee-designation", designationRouter);
  app.use("/coop/employee-information", employeeInformationRouter);
  app.use("/coop/employee-salary-info", salaryRoute);
}
