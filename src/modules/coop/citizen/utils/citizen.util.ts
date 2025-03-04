/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-25 10:07:35
 * @modify date 2021-11-25 10:07:35
 * @desc [description]
 */

import { getSSOCreatedBy } from "../../../../configs/app.config";
import { CitizenAttrs, CitizenInputAttrs, CitizenUpdateAttrs } from "../interfaces/citizen.interface";

export const extractCitizenInfo = (data: any): CitizenInputAttrs => {
  return {
    myGovId: data.id,
    mobile: data.mobile,
    email: data.email,
    nid: data.nid,
    name: data.nameEn,
    nameBangla: data.name,
    motherName: data.motherNameEn,
    motherNameBangla: data.motherName,
    fatherName: data.fatherNameEn,
    fatherNameBangla: data.fatherName,
    spouseName: data.spouseNameEn,
    spouseNameBangla: data.spouseName,
    gender: extractGender(data.gender),
    dob: data.dateOfBirth,
    occupation: data.occupation,
    religion: data.religion,
    presentAddress: data.presentAddress,
    permanentAddress: data.permanentAddress,
    type: data.type,
    brn: data.brn,
    passport: data.passport,
    tin: data.tin,
    bin: data.bin,
    emailVerify: data.emailVerify,
    nidVerify: data.nidVerify,
    brnVerify: data.brnVerify,
    passportVerify: data.passportVerify,
    tinVerify: data.tinVerify,
    binVerify: data.binVerify,
  } as CitizenInputAttrs;
};

const extractGender = (gender: string): string => {
  if (gender) {
    if (gender.toLowerCase() === "male") return "M";
    if (gender.toLowerCase() === "female") return "F";
  }
  return "O";
};

export const extractDiffCitizen = (citizen: CitizenAttrs, data: any) => {
  const diff: CitizenUpdateAttrs = {
    id: citizen.id,
    updatedBy: getSSOCreatedBy(),
    updatedAt: new Date(),
  };

  if (citizen.mobile !== data.mobile) diff.mobile = data.mobile;
  if (citizen.email !== data.email) diff.email = data.email;
  if (citizen.nid != data.nid) diff.nid = data.nid;
  if (citizen.name != data.nameEn) diff.name = data.nameEn;
  if (citizen.nameBangla != data.name) diff.nameBangla = data.name;
  if (citizen.motherName != data.motherNameEn) diff.motherName = data.motherNameEn;
  if (citizen.motherNameBangla !== data.motherName) diff.motherNameBangla = data.motherName;
  if (citizen.fatherName !== data.fatherNameEn) diff.fatherName = data.fatherNameEn;
  if (citizen.fatherNameBangla !== data.fatherName) diff.fatherNameBangla = data.fatherName;
  if (citizen.spouseName !== data.spouseNameEn) diff.spouseName = data.spouseNameEn;
  if (citizen.spouseNameBangla !== data.spouseName) diff.spouseNameBangla = data.spouseName;
  if (citizen.gender != extractGender(data.gender)) diff.gender = extractGender(data.gender);
  if (citizen.dob != data.dateOfBirth) diff.dob = data.dateOfBirth;
  if (citizen.occupation != data.occupation) diff.occupation = data.occupation;
  if (citizen.religion != data.religion) diff.religion = data.religion;
  if (citizen.presentAddress != data.presentAddress) diff.presentAddress = data.presentAddress;
  if (citizen.permanentAddress != data.permanentAddress) diff.permanentAddress = data.permanentAddress;
  if (citizen.type != data.type) diff.type = data.type;
  if (citizen.brn != data.brn) diff.brn = data.brn;
  if (citizen.passport != data.passport) diff.passport = data.passport;
  if (citizen.tin != data.tin) diff.tin = data.tin;
  if (citizen.bin != data.bin) diff.bin = data.bin;
  if (citizen.emailVerify != data.emailVerify) diff.emailVerify = data.emailVerify;
  if (citizen.nidVerify != data.nidVerify) diff.nidVerify = data.nidVerify;
  if (citizen.brnVerify != data.brnVerify) diff.brnVerify = data.brnVerify;
  if (citizen.passportVerify != data.passportVerify) diff.passportVerify = data.passportVerify;
  if (citizen.tinVerify != data.tinVerify) diff.tinVerify = data.tinVerify;
  if (citizen.binVerify != data.binVerify) diff.binVerify = data.binVerify;

  return diff;
};
