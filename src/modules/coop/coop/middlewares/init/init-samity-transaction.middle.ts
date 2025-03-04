import { NextFunction, Request, Response } from "express";
import { BadRequestError } from "rdcd-common";
import Container from "typedi";
import { SamityTransactionServices } from "../../services/init/init-samity-transaction.service";

const samityTransactionService = Container.get(SamityTransactionServices);

export const checkSamityIdForArrayObj = async (req: Request, res: Response, next: NextFunction) => {
  const dataArray = req.body;
  const erroArray: any = [];
  var isSameIds;

  isSameIds = await samityTransactionService.sameNameIdCheck(dataArray, "samityId");
  if (!isSameIds[1]) {
    next(new BadRequestError(`samity ids are not same`));
  } else {
    for await (const element of dataArray) {
      const id = Number(element.samityId);
      const isExist = id ? await samityTransactionService.samityIdExist(id) : false;

      if (!isExist) {
        erroArray.push(id);
      }
    }
    if (erroArray.length > 0) {
      next(new BadRequestError(`${erroArray} samity ids are not found`));
    } else {
      next();
    }
  }
};

function isPairDuplicate(arrOfObj: any[], key1: string, key2: string): [boolean, number, number] {
  for (let [index1, obj1] of arrOfObj.entries()) {
    for (let [index2, obj2] of arrOfObj.entries()) {
      if (index1 !== index2) {
        if (obj1[key1] === obj2[key1] && obj1[key2] === obj2[key2]) return [true, index1, index2];
      }
    }
  }
  return [false, 0, 0];
}

export const checkGlacId = async (req: Request, res: Response, next: NextFunction) => {
  const dataArray = req.body;
  const erroArray: any = [];
  const isDuplicateExist = isPairDuplicate(dataArray, "financialYear", "glacId");
  if (isDuplicateExist[0]) {
    const findDuplicateGlacIdName = await samityTransactionService.findGlacNameByGlacId(
      parseInt(dataArray[isDuplicateExist[1]].glacId)
    );

    const expenseOrIncomeMessage = await samityTransactionService.expenseOrIncomeMessage(
      dataArray[isDuplicateExist[1]].budgetRole,
      dataArray[isDuplicateExist[1]].orpCode
    );
    next(
      new BadRequestError(
        ` নির্বাচিত ${findDuplicateGlacIdName}  জিএল নামটি ${expenseOrIncomeMessage} একাধিকবার রয়েছে। জি.এল নাম একাধিকবার হতে পারবে না।  `
      )
    );
  } else {
  }

  for await (const element of dataArray) {
    const id = Number(element.glacId);
    const samityId = parseInt(element.samityId);
    const financialYear = element.financialYear;
    const isIeBudget = element.isIeBudget;

    const isExist = id ? await samityTransactionService.glacIdExist(id) : false;
    if (isExist) {
      const isExistWithSamityId: boolean = await samityTransactionService.glacIdExistWithSamityId(
        id,
        samityId,
        financialYear,
        isIeBudget
      );
      if (isExistWithSamityId) {
        const findDuplicateGlacIdName = await samityTransactionService.findGlacNameByGlacId(id);
        next(
          new BadRequestError(
            `${findDuplicateGlacIdName} , আপনার নির্বাচিত জিএল নম্বরটি ডেটাবেসে রয়েছে। নতুন  একটি সিলেক্ট করুন `
          )
        );
      }
    }

    if (!isExist) {
      erroArray.push(id);
    }
  }
  if (erroArray.length > 0) {
    next(new BadRequestError(`${erroArray} আপনার জিএল নম্বরটি ডেটাবেসে পাওয়া যায় নি`));
  } else {
    next();
  }
};

export const checkTranId = async (req: Request, res: Response, next: NextFunction) => {
  const dataArray = req.body;
  const erroArray: any = [];
  const isDuplicateExistTranId = isPairDuplicate(dataArray, "financialYear", "id");

  if (isDuplicateExistTranId[0]) {
    next(
      new BadRequestError(
        `tranId of index ${isDuplicateExistTranId[1]} & ${isDuplicateExistTranId[2]} are same. Tran Id can not be same`
      )
    );
  }

  for await (const element of dataArray) {
    const id = Number(element.id);
    const isExist = id ? await samityTransactionService.tranIdExist(id) : false;

    if (!isExist) {
      erroArray.push(id);
    }
  }
  if (erroArray.length > 0) {
    next(new BadRequestError(`${erroArray} Tran ids are not found`));
  } else {
    next();
  }

  // var rValue = false;
  // var ischeckTranIdDb = true;
  // var i = 0;

  // for (i = 0; i < dataArray.length - 1; i++) {
  //   const financialyear = dataArray[i].financialYear;
  //   const tranId = dataArray[i].tranId;
  //   if (!tranId) {
  //     ischeckTranIdDb = false;
  //     next(new BadRequestError(`tranId is not Exist`));
  //     break;
  //   } else if (!rValue) {
  //     for (var j = i + 1; j < dataArray.length; j++) {
  //       if (
  //         financialyear == dataArray[j].financialYear &&
  //         tranId == dataArray[j].tranId
  //       ) {
  //         rValue = true;
  //         next(
  //           new BadRequestError(
  //             `tranId of index ${i} & ${j} are same. TranId Id can not be same`
  //           )
  //         );
  //         break;
  //       }
  //     }
  //   } else if (rValue) {
  //     break;
  //   }
  // }

  // if (ischeckTranIdDb) {
  //   for await (const element of dataArray) {
  //     const id = Number(element.tranId);
  //     const isExist = id
  //       ? await samityTransactionService.tranIdExist(id)
  //       : false;

  //     if (!isExist) {
  //       erroArray.push(id);
  //     }
  //   }
  //   if (erroArray.length > 0) {
  //     next(new BadRequestError(`${erroArray} Tran ids are not found`));
  //   } else {
  //     next();
  //   }
  // }

  // for await (const [index = 1, element] of dataArray) {
  //   const financialYear = element.financialYear;
  //   const tranId = element.tranId;
  //   if (!tranId) {
  //     next(new BadRequestError(`tranId is not Exist`));
  //   } else {
  //     for await (const [index = 1, element] of dataArray) {
  //     }
  //   }
  // }
};
export const checkGlacIdUpdate = async (req: Request, res: Response, next: NextFunction) => {
  const dataArray = req.body;
  const erroArray: any = [];
  const isDuplicateExist = isPairDuplicate(dataArray, "financialYear", "glacId");

  if (isDuplicateExist[0]) {
    const findDuplicateGlacIdName = await samityTransactionService.findGlacNameByGlacId(
      parseInt(dataArray[isDuplicateExist[1]].glacId)
    );

    const expenseOrIncomeMessage = await samityTransactionService.expenseOrIncomeMessage(
      dataArray[isDuplicateExist[1]].budgetRole,
      dataArray[isDuplicateExist[1]].orpCode
    );
    next(
      new BadRequestError(
        ` নির্বাচিত ${findDuplicateGlacIdName}  জিএল নামটি ${expenseOrIncomeMessage} একাধিকবার রয়েছে। জি.এল নাম একাধিকবার হতে পারবে না।  `
      )
    );
  } else {
  }

  for await (const element of dataArray) {
    const id = Number(element.glacId);
    const tranId = Number(element.id);
    const samityId = parseInt(element.samityId);
    const financialYear = element.financialYear;
    const isIeBudget = element.isIeBudget;

    const isExist = id ? await samityTransactionService.glacIdExist(id) : false;
    if (isExist) {
      const isExistWithSamityId: boolean = await samityTransactionService.glacIdExistWithSamityIdUpdate(
        id,
        samityId,
        financialYear,
        isIeBudget,
        tranId
      );
      if (isExistWithSamityId) {
        const findDuplicateGlacIdName = await samityTransactionService.findGlacNameByGlacId(id);
        next(
          new BadRequestError(
            `${findDuplicateGlacIdName} , আপনার নির্বাচিত জিএল নম্বরটি ডেটাবেসে রয়েছে। নতুন  একটি সিলেক্ট করুন `
          )
        );
      }
    }

    if (!isExist) {
      erroArray.push(id);
    }
  }
  if (erroArray.length > 0) {
    next(new BadRequestError(`${erroArray} আপনার জিএল নম্বরটি ডেটাবেসে পাওয়া যায় নি  `));
  } else {
    next();
  }
};
export const checkTranIdDelete = async (req: Request, res: Response, next: NextFunction) => {
  const id = parseInt(req.params.samityTranId);
  const isExist = id ? await samityTransactionService.tranIdExist(id) : false;
  if (!isExist) {
    next(new BadRequestError(` ${id} Tran ids are not found`));
  } else {
    next();
  }
};

export const checkFinancialYear = async (req: Request, res: Response, next: NextFunction) => {
  const allEqual = (arr: any) => arr.every((val: any) => val === arr[0]);
  const presentFinancialYear = [];
  const futureFinancialYear = [];
  for (const element of req.body) {
    if (element.isIeBudget === "B" && element.budgetRole === "N") {
      futureFinancialYear.push(element.financialYear);
    } else if (element.isIeBudget === "B" && element.budgetRole === "P") {
      presentFinancialYear.push(element.financialYear);
    }
  }

  if (presentFinancialYear.length > 0 && futureFinancialYear.length == 0) {
    if (allEqual(presentFinancialYear)) {
      next();
    } else {
      next(new BadRequestError("বর্তমান সমিতি বাজেট বছর ভিন্ন হতে পারবে না। "));
    }
  } else if (presentFinancialYear.length == 0 && futureFinancialYear.length > 0) {
    if (allEqual(futureFinancialYear)) {
      next();
    } else {
      next(new BadRequestError(" পরবর্তী সমিতি বাজেট বছর ভিন্ন হতে পারবে না। "));
    }
  } else if (presentFinancialYear.length > 0 && futureFinancialYear.length > 0) {
    if (allEqual(presentFinancialYear)) {
      if (allEqual(futureFinancialYear)) {
        if (presentFinancialYear[0] === futureFinancialYear[0]) {
          next(new BadRequestError("বর্তমান সমিতি বাজেট বছর এবং পরবর্তী সমিতি বাজেট বছর একই হতে পারবে না। "));
        } else {
          next();
        }
      } else {
        next(new BadRequestError(" পরবর্তী সমিতি বাজেট বছর ভিন্ন হতে পারবে না। "));
      }
    } else {
      next(new BadRequestError("বর্তমান সমিতি বাজেট বছর ভিন্ন হতে পারবে না। "));
    }
  } else next();
};
