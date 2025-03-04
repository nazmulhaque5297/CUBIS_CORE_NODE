import { IRoleAttrs } from "../../role/interfaces/role.interface";

export function isRoleActive(role: IRoleAttrs | null): boolean {
  if (!role) return false;
  if (role.approveStatus !== "A") return false;
  if (!role.isActive) return false;
  return true;
}

// export function extractUserFromSSOToken(tokenData: any): ICreateUserAttrs {
//   const user: ICreateUserAttrs = {
//     username: tokenData.username,
//     employeeId: tokenData.employeeId,
//     isCadre: tokenData.isCadre,
//     employeeGrade: tokenData.employeeGrade,
//     joiningDate: tokenData.joiningDate,
//     officeUnitId: tokenData.officeUnitId,
//     officeUnitOrganogramId: tokenData.officeUnitOrganogramId,
//     designationBn: tokenData.designationBn,
//     designationEn: tokenData.designationEn ? tokenData.designationEn : "N/A",
//     designationLevel: tokenData.designationLevel,
//     designationSequence: tokenData.designationSequence,
//     officeHead: tokenData.officeHead,
//     inchargeLabel: tokenData.inchargeLabel,
//     lastOfficeDate: tokenData.lastOfficeDate,
//     unitNameBn: tokenData.unitNameBn,
//     unitNameEn: tokenData.unitNameEn,
//     officeNameBn: tokenData.officeNameBn,
//     officeNameEn: tokenData.officeNameEn,

//     officeId: -1,
//     personId: -1,
//     approveStatus: "P",
//     isActive: false,
//     createdBy: "", // dummy
//     doptorId: null, // doptor id null is not provided in SSO token
//   };

//   return user;
// }

// export function extractPersonFromSSOToken(tokenData: any): ICreatePersonAttrs {
//   const person: ICreatePersonAttrs = {
//     nid: tokenData.nid,
//     photoUrl: tokenData.photo,
//     nameEn: tokenData.nameEn,
//     nameBn: tokenData.nameBn,
//     fatherNameEn: tokenData.fatherNameEn,
//     fatherNameBn: tokenData.fatherNameBn,
//     motherNameEn: tokenData.motherNameEn,
//     motherNameBn: tokenData.motherNameBn,
//     dob: tokenData.dateOfBirth,
//     brn: tokenData.brn,
//     passport: tokenData.passport,
//     email: tokenData.personalEmail,
//     mobile: tokenData.personalMobile,
//     createdBy: "",
//   };

//   return person;
// }

// export function dataDifference(
//   user: IUserAttrs,
//   tokenData: any
// ): IUpdateUserAttrs {
//   const diff: IUpdateUserAttrs = {
//     id: user.id,
//     updatedBy: getSSOCreatedBy(),
//     updateDate: new Date(),
//   };

//   if (user.username !== tokenData.username) diff.username = tokenData.username;
//   if (user.designationBn !== tokenData.designationBn)
//     diff.designationBn = tokenData.designationBn;
//   if (tokenData.designationEn && user.designationEn !== tokenData.designationEn)
//     diff.designationEn = tokenData.designationEn;
//   if (user.employeeId !== tokenData.employeeId)
//     diff.employeeId = tokenData.employeeId;
//   if (user.officeUnitId !== tokenData.officeUnitId)
//     diff.officeUnitId = tokenData.officeUnitId;
//   if (user.inchargeLabel !== tokenData.inchargeLabel)
//     diff.inchargeLabel = tokenData.inchargeLabel;
//   if (user.designationId !== tokenData.officeUnitOrganogramId)
//     diff.officeUnitOrganogramId = tokenData.officeUnitOrganogramId;
//   if (user.officeNameEn !== tokenData.officeNameEn)
//     diff.officeNameEn = tokenData.officeNameEn;
//   if (user.officeNameBn !== tokenData.officeNameBn)
//     diff.officeNameBn = tokenData.officeNameBn;
//   if (user.unitNameEn !== tokenData.unitNameEn)
//     diff.unitNameEn = tokenData.unitNameEn;
//   if (user.unitNameBn !== tokenData.unitNameBn)
//     diff.unitNameBn = tokenData.unitNameBn;
//   if (user.isCadre !== tokenData.isCadre) diff.isCadre = tokenData.isCadre;
//   if (user.employeeGrade !== tokenData.employeeGrade)
//     diff.employeeGrade = tokenData.employeeGrade;
//   if (user.joiningDate !== tokenData.joiningDate)
//     diff.joiningDate = tokenData.joiningDate;
//   if (user.designationLevel !== tokenData.designationLevel)
//     diff.designationLevel = tokenData.designationLevel;
//   if (user.designationSequence !== tokenData.designationSequence)
//     diff.designationSequence = tokenData.designationSequence;
//   if (user.officeHead !== tokenData.officeHead)
//     diff.officeHead = tokenData.officeHead;
//   if (user.lastOfficeDate !== tokenData.lastOfficeDate)
//     diff.lastOfficeDate = tokenData.lastOfficeDate;

//   return diff;
// }
