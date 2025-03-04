/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-06-16 10:08:03
 * @modify date 2022-06-16 10:08:03
 * @desc [description]
 */

import { floor, max, range } from "lodash";
import moment from "moment-timezone";
import { ScheduleAttrs } from "../interfaces/schedule.interface";
import { ScheduleCalculator } from "./schedule.util";

export class DOCCustomScheduleCalculator extends ScheduleCalculator {
  protected DOCInterest: number[] = [];
  constructor({
    principal = 0,
    loanTerm = 0,
    rate = 0,
    type = "F",
    installmentType = "M",
    installmentNumber = 0,
    gracePeriodType = "NO",
    gracePeriod = 0,
    disbursementDate = moment(),
    meetingDay = undefined,
    weekPosition = undefined,
    doptorId = undefined,
    officeId = undefined,
    holidayEffect = "NO",
    roundingType = "C",
    roundingValue = 5,
  }: ScheduleAttrs = {}) {
    super({
      principal,
      loanTerm,
      rate,
      type,
      installmentType,
      gracePeriodType,
      gracePeriod,
      disbursementDate,
      installmentNumber,
      meetingDay,
      weekPosition,
      doptorId,
      officeId,
      holidayEffect,
      roundingType,
      roundingValue,
    });
  }

  protected calCharge(): this {
    const periods = range(1, this.installmentNumber / 12 + 1);

    const interests = periods.map((p) => this.calDOCCharge(p));
    this.DOCInterest = interests;

    const charge = interests.reduce((a, b) => a + b);

    this.charge = this.round(charge);

    //grace period service charge calculation
    this.gracePeriodServiceCharge = this.installmentServiceChargeGracePeriod = this.calGracePeriodServiceCharge();

    return this;
  }

  protected calDOCCharge(periodNo: number) {
    let timeMultiplier = 1;

    if (this.gracePeriodType == "EQUAL" && periodNo == 1) {
      timeMultiplier = (12 + this.gracePeriod) / 12;
    } else {
      const scheduleNo = (periodNo - 1) * 12;
      const diff = this.installmentNumber - scheduleNo;

      timeMultiplier = diff >= 12 ? 1 : diff / 12;
    }

    const duePrincipal = this.principal - 12 * (periodNo - 1) * this.installmentPrincipal;
    const installmentServiceCharge = ((duePrincipal * this.rate) / 100) * timeMultiplier;

    return this.round(max([installmentServiceCharge, 0]) as number, 1);
  }

  protected calGracePeriodServiceCharge() {
    if (this.gracePeriodType != "EQUAL") return 0;

    return this.round(((this.principal * this.rate) / 100) * (this.gracePeriod / 12));
  }

  async getSchedule() {
    this.calCharge();
    const schedules = [];
    let startDate = this.getFirstScheduleDate();

    let dateCursor = moment(startDate);
    let serviceCharge = this.charge;
    let principalBalance = this.principal;

    for (let i = 1; i <= this.installmentNumber; i++) {
      const schedule = {
        principalBalance,
        scheduleNo: i,
        serviceCharge: this.round(serviceCharge),
        serviceChargeRate: this.rate,
        installmentServiceChargeAmt: this.round(this.calInstallmentServiceChargeAmt(i)),
        installmentGracePeriodChargeAmt: i == 1 ? this.installmentServiceChargeGracePeriod : 0,
        installmentPrincipalAmt: this.round(this.calInstallmentAmt(i, this.installmentPrincipal, principalBalance)),
        installmentDate: await this.installmentDate(i, startDate, dateCursor),
        total: this.round(
          this.calTotalInstallmentAmt(
            i,
            principalBalance,
            this.installmentPrincipal,
            this.calInstallmentServiceChargeAmt(i)
          )
        ),
      };

      principalBalance = principalBalance - this.installmentPrincipal;
      serviceCharge = this.calBalance(serviceCharge, this.calInstallmentServiceChargeAmt(i));

      schedules.push(schedule);
    }

    return schedules;
  }

  calInstallmentServiceChargeAmt(scheduleNo: number) {
    if (scheduleNo % 12 == 1) {
      const i = floor(scheduleNo / 12);
      return this.DOCInterest[i];
    }
    return 0;
  }

  calTotalInstallmentAmt(
    scheduleNo: number,
    principalBalance: number,
    installmentPrincipalAmt: number,
    serviceCharge: number
  ) {
    if (this.installmentNumber == scheduleNo) return principalBalance + serviceCharge;
    return installmentPrincipalAmt + serviceCharge;
  }
}
