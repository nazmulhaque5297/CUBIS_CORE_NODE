import { param } from "express-validator";
import { validateBalance } from "../../../modules/migration/validators/balance.validate";
import {
  validateLoanScheduleApplication,
  validateProductApplication,
  validateProductCharge,
  validateProductDocuments,
  validateProductSanctionPolicy,
  validateProductServiceCharge,
  validateProductServiceChargeSegregation,
  validateprojectAssignApplication,
  validateSanctionApplication,
  validateSubGlApplication,
  validateUpdateFieldOfficer,
  validateUpdateMainProduct,
} from "./all-application.validator";
import { loanInfoMigrationValidator } from "../../../modules/migration/validators/samity-migration.validate";
import { validateAssignFieldOfficerApplication } from "./field-officer.validator";
import { validateMemberCreate } from "./member-application.validator";
import { validateMemberUpdate } from "./member-update.validator";
import { validateSamityCreate } from "./samity-application.validator";
import { validateSamityUpdate } from "./samity-update-application.validator";
import { validateProductUpdate } from "./product-update.validator";
import { dpsApplicationValidator } from "./dps-application.validator";
import { savingsProductValidator } from "./savings-product.validator";
import { storeInMigrationValidator } from "./store-in-migration.validator";
import { inventoryItemRequisitionValidator } from "../../inventory/validators/inventory-item-requisition.validator";
import { purchaseOrderValidator } from "../../inventory/validators/purchase-order.validator";
import { validateCashWithdraw } from "./cash-withdraw.validator";
import { validateReverseTran } from "./reverse-transaction.validator";
import { dpsCloseValidator } from "./dps-close.validator";
import { validateLoanSettlementApplication } from "./loan-settlement.validator";
import { validateLoanAdjustment } from "./loan-adjustment.validator";
export const applicationTypes: any = {
  sanction: validateSanctionApplication,
  projectAssign: validateprojectAssignApplication,
  fieldOfficer: validateAssignFieldOfficerApplication,
  loanSchedule: validateLoanScheduleApplication,
  subGl: validateSubGlApplication,
  product: validateProductApplication,
  productServiceCharge: validateProductServiceCharge,
  productServiceChargeSegregation: validateProductServiceChargeSegregation,
  productCharge: validateProductCharge,
  productSanctionPolicy: validateProductSanctionPolicy,
  productDocuments: validateProductDocuments,
  updateProduct: validateProductUpdate,
  updateFieldOfficer: validateUpdateFieldOfficer,
  // samityCreate: validateSamityCreate,
  samityCreate: [],
  memberCreate: validateMemberCreate,
  loanMigrationCreate: loanInfoMigrationValidator,
  loanMigrationUpdate: loanInfoMigrationValidator,
  balanceMigration: validateBalance,
  memberUpdate: validateMemberUpdate,
  samityUpdate: validateSamityUpdate,
  dpsApplication: dpsApplicationValidator,
  savingsProduct: savingsProductValidator,
  savingsProductUpdate: [],
  storeInMigration: storeInMigrationValidator,
  inventoryItemRequisition: inventoryItemRequisitionValidator,
  purchaseOrder: purchaseOrderValidator,
  cashWithdraw: validateCashWithdraw,
  reverseTransaction: validateReverseTran,
  dpsClose: dpsCloseValidator,
  fdrApplication: [],
  loanSettlement: validateLoanSettlementApplication,
  fdrClose: [],
  productInterest: [],
  productInstallment: [],
  neccessaryDocument: [],
  inventoryItemReturn: [],
  loanAdjustment: validateLoanAdjustment
};

export const validateApplication = [
  param("type").isIn(Object.keys(applicationTypes)).withMessage("সেবার নাম সঠিকভাবে উল্লেখ করুন"),
];
export const validateUpdateApplication = [
  param("type").isIn(Object.keys(applicationTypes)).withMessage("সেবার নাম সঠিকভাবে উল্লেখ করুন"),
  param("appId").exists().withMessage("আবেদনের আইডি দেওয়া আবশ্যক"),
];
