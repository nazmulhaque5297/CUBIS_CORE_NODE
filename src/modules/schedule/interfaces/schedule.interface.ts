/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-06-05 16:57:09
 * @modify date 2022-06-05 16:57:09
 * @desc [description]
 */

import { Moment } from "moment-timezone";
export type GracePeriodType = "NO" | "EQUAL" | "NO-CHARGE";
export type InterestType = "F" | "D" | "DOC";
export type Days = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
export type HolidayEffect = "NWD" | "NMD" | "NO";
export type InstallmentType = "M" | "W";
export type RoundingType = "C" | "F";

export interface ScheduleAttrs extends ServiceChargeAttrs {
  interestType?: InterestType;
  installmentType?: InstallmentType;
  installmentNumber?: number;
  meetingDay?: Days;
  weekPosition?: number;
  holidayEffect?: HolidayEffect;
  doptorId?: number;
  officeId?: number;
}

export interface ServiceChargeAttrs {
  principal?: number;
  loanTerm?: number;
  rate?: number;
  type?: InterestType;
  installmentType?: InstallmentType;
  installmentNumber?: number;
  gracePeriodType?: GracePeriodType;
  gracePeriod?: number;
  disbursementDate?: Moment;
  roundingType?: RoundingType;
  roundingValue?: number;
}
