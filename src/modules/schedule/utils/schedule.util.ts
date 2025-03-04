/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-05-21 13:31:57
 * @modify date 2022-05-21 13:31:57
 * @desc [description]
 */

import "date-fns/locale";
import { ipmt, pmt, ppmt } from "financial";
import { ceil, max } from "lodash";
import moment, { Moment } from "moment-timezone";
import Container from "typedi";
import { defaultDateFormat } from "../../../configs/app.config";
import { HolidayInfoServices } from "../../../modules/master/services/holiday.service";
import { ServiceChargeCalculator } from "../../transaction/utils/service-charge-calculator.util";
import { Days, HolidayEffect, ScheduleAttrs } from "../interfaces/schedule.interface";

export class ScheduleCalculator extends ServiceChargeCalculator {
  protected meetingDay: Days | undefined;
  protected weekPosition: number | undefined;
  protected doptorId: number | undefined;
  protected officeId: number | undefined;
  protected holidayEffect: HolidayEffect;

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
    roundingType,
    roundingValue,
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
      roundingType,
      roundingValue,
    });

    this.meetingDay = meetingDay;
    this.weekPosition = weekPosition;
    this.doptorId = doptorId;
    this.officeId = officeId;
    this.holidayEffect = holidayEffect;
  }

  async getSchedule() {
    const schedules = [];
    let startDate = this.getFirstScheduleDate(),
      dateCursor = moment(startDate),
      serviceChargeBalance = this.charge,
      principalBalance = this.principal,
      gracePeriodChargeBalance = this.gracePeriodServiceCharge;

    if (this.type == "F") {
      let installmentPrincipalAmt = ceil(this.installmentAmount - this.installmentServiceCharge),
        installmentAmt = ceil(this.installmentAmount),
        installmentServiceChargeAmt = this.installmentServiceCharge,
        installmentGracePeriodAmt = this.installmentServiceChargeGracePeriod;

      for (let i = 1; i <= this.installmentNumber; i++) {
        const schedule = {
          principalBalance,
          scheduleNo: i,
          serviceCharge: this.round(serviceChargeBalance),
          serviceChargeRate: this.rate,
          installmentServiceChargeAmt: this.round(
            this.calInstallmentAmt(i, installmentServiceChargeAmt, serviceChargeBalance)
          ),
          installmentGracePeriodChargeAmt: this.round(
            this.calInstallmentAmt(i, installmentGracePeriodAmt, gracePeriodChargeBalance)
          ),
          installmentPrincipalAmt: this.round(this.calInstallmentAmt(i, installmentPrincipalAmt, principalBalance)),
          installmentDate: await this.installmentDate(i, startDate, dateCursor),
          total: this.round(this.calTotalInstallmentAmt(i, installmentAmt, principalBalance, serviceChargeBalance)),
        };

        principalBalance = max([principalBalance - installmentPrincipalAmt, 0]) as number;
        serviceChargeBalance = this.calBalance(serviceChargeBalance, installmentServiceChargeAmt);
        gracePeriodChargeBalance = this.calBalance(gracePeriodChargeBalance, installmentGracePeriodAmt);

        schedules.push(schedule);
      }
    }

    if (this.type == "D") {
      let installmentGracePeriodAmt = this.installmentServiceChargeGracePeriod;

      for (let i = 1; i <= this.installmentNumber; i++) {
        const installmentPrincipalAmt = this.round(
          ppmt(this.rate / (this.unitTime * 100), i, this.installmentNumber, -this.principal)
        );

        const installmentServiceChargeAmt = this.round(
          ipmt(this.rate / (this.unitTime * 100), i, this.installmentNumber, -this.principal)
        );

        const schedule = {
          principalBalance: this.round(principalBalance),
          scheduleNo: i,
          serviceCharge: this.round(serviceChargeBalance),
          serviceChargeRate: this.rate,
          installmentServiceChargeAmt: this.round(installmentServiceChargeAmt),
          installmentGracePeriodChargeAmt: this.round(
            this.calInstallmentAmt(i, installmentGracePeriodAmt, gracePeriodChargeBalance)
          ),
          installmentPrincipalAmt: this.round(installmentPrincipalAmt),
          installmentDate: await this.installmentDate(i, startDate, dateCursor),
          total: this.round(pmt(this.rate / (this.unitTime * 100), this.installmentNumber, -this.principal)),
        };

        principalBalance = max([principalBalance - installmentPrincipalAmt, 0]) as number;
        serviceChargeBalance = serviceChargeBalance - installmentServiceChargeAmt;
        gracePeriodChargeBalance = this.calBalance(gracePeriodChargeBalance, installmentGracePeriodAmt);

        schedules.push(schedule);
      }
    }
    return schedules;
  }

  calBalance(balance: number, dueCharge: number) {
    if (balance <= dueCharge) return 0;
    return balance - dueCharge;
  }

  calTotalInstallmentAmt(scheduleNo: number, installmentAmt: number, principalBalance: number, serviceCharge: number) {
    if (this.installmentNumber == scheduleNo) return principalBalance + serviceCharge;
    return installmentAmt;
  }

  calInstallmentAmt(scheduleNo: number, installmentAmt: number, balance: number) {
    if (this.installmentNumber == scheduleNo) return balance;
    return installmentAmt;
  }

  async getNextScheduleDate(dateCursor: Moment | undefined, startDate: Moment): Promise<string | null> {
    if (!this.installmentType || !dateCursor) return null;

    if (this.installmentType == "W") {
      dateCursor == startDate ? startDate : dateCursor.add(1, "week");

      return (await this.nextWorkingDay(dateCursor)).format(defaultDateFormat);
    }

    if (this.installmentType == "M" && !this.weekPosition) {
      dateCursor == startDate ? startDate : dateCursor.add(1, "month");

      return (await this.nextWorkingDay(dateCursor)).format(defaultDateFormat);
    }

    //RDA ugly loan with week position and meeting date
    if (
      this.installmentType == "M" &&
      this.weekPosition &&
      this.weekPosition > 0 &&
      this.weekPosition <= 4 &&
      this.meetingDay
    ) {
      dateCursor == startDate ? startDate : dateCursor.add(1, "month");

      return (await this.nextWorkingDay(this.nthDayOfMonth(dateCursor, this.weekPosition))).format(defaultDateFormat);
    }

    return null;
  }

  getFirstScheduleDate() {
    let firstDate = moment(this.disbursementDate);

    if (this.meetingDay && !this.weekPosition) {
      const weekDayNumber = this.getDayNumberOfWeek(this.meetingDay);
      firstDate = this.nextWeekDay(weekDayNumber as Day);
    }

    //weekly and grace period
    if (this.installmentType === "W" && !(this.gracePeriodType == "NO")) {
      this.gracePeriod ? firstDate.add(this.gracePeriod + 1, "week") : firstDate.add(1, "week");

      if (this.disbursementDate.get("weekday") != firstDate.get("weekday")) {
        firstDate.subtract(1, "week");
      }
    }

    if (this.installmentType === "W" && this.gracePeriodType == "NO") {
      firstDate = firstDate.add(1, "week");
    }

    //monthly and grace period
    if (this.installmentType === "M" && !(this.gracePeriodType == "NO")) {
      this.gracePeriod ? firstDate.add(this.gracePeriod, "month") : firstDate.add(1, "month");
    }

    //monthly and no grace period
    if (this.installmentType === "M" && this.gracePeriodType == "NO") {
      console.log({ firstDate });

      firstDate.add(1, "month");

      console.log({ firstDate });
    }

    //monthly and grace period and week position and meeting date
    if (
      this.installmentType == "M" &&
      this.weekPosition &&
      this.weekPosition > 0 &&
      this.weekPosition <= 4 &&
      this.meetingDay
    ) {
      firstDate = moment(this.nthDayOfMonth(firstDate, this.weekPosition));
      const dayGapRDA = firstDate.diff(this.disbursementDate, "day");

      if (dayGapRDA > 40) {
        firstDate = moment(this.nthDayOfMonth(firstDate.subtract(1, "month"), this.weekPosition));
      }
    }

    return firstDate;
  }

  async installmentDate(scheduleNo: number, startDate: Moment, dateCursor: Moment) {
    return scheduleNo == 1
      ? (await this.nextWorkingDay(startDate)).format(defaultDateFormat)
      : await this.getNextScheduleDate(dateCursor, startDate);
  }

  protected nextWeekDay(dayOfWeek: Day): Moment {
    var now = moment(this.disbursementDate);
    const weekDay = now.get("weekday");

    if (dayOfWeek != weekDay) {
      now.add(Math.abs(7 - (weekDay - dayOfWeek)), "day");
    }

    return now;
  }

  protected weekendCheck(date: Moment) {
    const newDate = moment(date);
    if (newDate.get("weekday") == 5) {
      return newDate.add(2, "day");
    }
    if (newDate.get("weekday") == 6) {
      return newDate.add(1, "day");
    }

    return newDate;
  }

  async nextWorkingDay(date: Moment): Promise<moment.Moment> {
    const newDate = moment(date);

    const holidayService = Container.get(HolidayInfoServices);
    if (
      !(await holidayService.isHoliday({
        date: newDate,
        doptorId: this.doptorId,
        officeId: this.officeId,
      }))
    ) {
      return newDate;
    }

    if (this.holidayEffect == "NO") {
      return newDate;
    }

    if (this.holidayEffect == "NMD") {
      if ((this.installmentType = "M")) {
        newDate.add(1, "month");
      }
      if ((this.installmentType = "W")) {
        newDate.add(1, "week");
      }
    }

    if (this.holidayEffect == "NWD") {
      newDate.add(1, "day");
    }

    return await this.nextWorkingDay(newDate);
  }

  getDayNumberOfWeek(day: Days | undefined) {
    if (!day) return 0;
    const days = {
      SUN: 0,
      MON: 1,
      TUE: 2,
      WED: 3,
      THU: 4,
      FRI: 5,
      SAT: 6,
    };

    return days[day] || 0;
  }

  nthDayOfMonth(monthMoment: Moment, weekNumber: number) {
    let m = monthMoment
      .clone()
      .startOf("month") // go to the beginning of the month
      .day(this.getDayNumberOfWeek(this.meetingDay));
    if (m.month() !== monthMoment.month()) m.add(7, "d");
    return m.add(7 * (weekNumber - 1), "d");
  }

  twoDigitFraction(value: number) {
    return parseFloat(value.toFixed(2));
  }
}
