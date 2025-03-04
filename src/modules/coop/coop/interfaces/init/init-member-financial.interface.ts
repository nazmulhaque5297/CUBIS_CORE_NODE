export interface memberFinancialInputAttrs {
  memberId: string;
  samityId: string;
  doptorId?: number;
  noOfShare?: string;
  shareAmount?: string;
  savingsAmount?: string;
  loanOutstanding?: string;
}
export interface memberFinancialAttrs extends memberFinancialInputAttrs {
  id?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}
