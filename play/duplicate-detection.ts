let arr = [
  {
    tranId: 165,
    isIeBudget: "E",
    samityId: 119,
    glacId: 14,
    orpCode: "INC",
    financialYear: "2021-2022",
    tranDate: "2021-11-15T18:00:00.000Z",
    incAmt: 2000,
    expAmt: 0,
    remarks: "hi this is new update",
  },

  {
    isIeBudget: "E",
    samityId: 119,
    glacId: 13,
    orpCode: "INC",
    financialYear: "2021-2022",
    tranDate: "2021-11-15T18:00:00.000Z",
    incAmt: 2000,
    expAmt: 0,
    remarks: "",
  },

  {
    tranId: 160,
    isIeBudget: "E",
    samityId: 119,
    glacId: 14,
    orpCode: "INC",
    financialYear: "2021-2023",
    tranDate: "2021-11-15T18:00:00.000Z",
    incAmt: 2000,
    expAmt: 0,
    remarks: "hi this is new update",
  },

  {
    tranId: 161,
    isIeBudget: "E",
    samityId: 119,
    glacId: 15,
    orpCode: "INC",
    financialYear: "",
    tranDate: "2021-11-15T18:00:00.000Z",
    incAmt: 2000,
    expAmt: 0,
    remarks: "",
  },

  {
    tranId: 162,
    isIeBudget: "E",
    samityId: 119,
    glacId: 14,
    orpCode: "INC",
    financialYear: "",
    tranDate: "2021-11-15T18:00:00.000Z",
    incAmt: 2000,
    expAmt: 0,
    remarks: "hi this is new update",
  },

  {
    tranId: 163,
    isIeBudget: "E",
    samityId: 119,
    glacId: 13,
    orpCode: "INC",
    financialYear: "",
    tranDate: "2021-11-15T18:00:00.000Z",
    incAmt: 2000,
    expAmt: 0,
    remarks: "",
  },
];

function isPairDuplicate(arrOfObj: any[], key1: string, key2: string): boolean {
  for (let [index1, obj1] of arrOfObj.entries()) {
    for (let [index2, obj2] of arrOfObj.entries()) {
      if (index1 !== index2) {
        if (obj1[key1] === obj2[key1] && obj1[key2] === obj2[key2]) return true;
      }
    }
  }
  return false;
}
