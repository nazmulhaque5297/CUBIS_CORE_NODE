export interface samityTransactionAttrs {
  id?: String;
  samityId: number;
  glacId?: number;
  orpCode?: String;
  tranDate?: Date;
  incAmt?: number;
  expAmt?: number;
  financialYear?: String;
  isIEBudget?: string;
  remark?: string;
  status?: string;
  budgetRole?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}
