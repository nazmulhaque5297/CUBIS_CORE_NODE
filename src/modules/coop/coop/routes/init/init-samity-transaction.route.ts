import { NextFunction, Request, Response, Router } from "express";
import { toCamelKeys } from "keys-transform";
import { BadRequestError, validateRequest } from "rdcd-common";
import Container from "typedi";
import { getCode } from "../../../../../configs/auth.config";
import { wrap } from "../../../../../middlewares/wraps.middle";
import { Paginate } from "../../../../../utils/pagination-coop.utils";
import { citizenAuth } from "../../../citizen/middlewares/citizen-auth.middle";
import { samityTransactionAttrs } from "../../interfaces/init/init-samity-transaction.interface";
import {
  checkFinancialYear,
  checkGlacId,
  checkGlacIdUpdate,
  checkSamityIdForArrayObj,
  checkTranId,
  checkTranIdDelete,
} from "../../middlewares/init/init-samity-transaction.middle";
import { SamityTransactionServices } from "../../services/init/init-samity-transaction.service";
import {
  validateSamityTransactionQuery,
  validatesamityTransaction,
  validatesamityTransactionUpdate,
} from "../../validators/init/init-samity-transaction.validator";

const router = Router();
const samityTransactionService = Container.get(SamityTransactionServices);

router.post(
  "/:type",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  validatesamityTransaction,
  validateRequest,
  checkSamityIdForArrayObj,
  checkFinancialYear,
  checkGlacId,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    let dataArray = req.body;
    const totalResult = [];
    const createdBy = (req.user.type = "citizen" ? req.user.userId : req.user.userId);

    if (req.params.type == "budget") {
      dataArray = dataArray
        .filter((e: any) => e.isIeBudget == "B")
        .map((el: any) => {
          return {
            samityId: el.samityId,
            orpCode: el.orpCode,
            glacId: el.glacId,
            incAmt: el.incAmt,
            expAmt: el.expAmt,
            isIeBudget: el.isIeBudget,
            tranDate: new Date(),
            financialYear: el.financialYear,
            budgetRole: el.budgetRole,
            createdBy,
            createdAt: new Date(),
          };
        });
    } else if (req.params.type == "expense") {
      dataArray = dataArray
        .filter((e: any) => e.isIeBudget == "E")
        .map((el: any) => {
          return {
            samityId: el.samityId,
            orpCode: el.orpCode,
            glacId: el.glacId,
            incAmt: el.incAmt,
            expAmt: el.expAmt,
            isIeBudget: el.isIeBudget,
            tranDate: new Date(),
            financialYear: "",
            budgetRole: "",
            createdBy,
            createdAt: new Date(),
          };
        });
    }
    // for await (const [index, element] of dataArray.entries()) {
    //   if (element.isIeBudget === "E") {
    //     const result: samityTransactionAttrs | undefined =
    //       await samityTransactionService.create({
    //         ...element,
    //         tranDate: new Date(),
    //         financialYear: "",
    //         budgetRole: "",
    //         createdBy,
    //         createdAt: new Date(),
    //       });
    //     totalResult.push(result);
    //   }

    //   if (element.isIeBudget === "B") {
    //     if (element.financialYear && element.budgetRole) {
    //       const result: samityTransactionAttrs | undefined =
    //         await samityTransactionService.create({
    //           ...element,
    //           tranDate: new Date(),
    //           createdBy,
    //           createdAt: new Date(),
    //         });
    //       totalResult.push(result);
    //     } else {
    //       throw new BadRequestError(
    //         `সমিতির বাজেট বছর বা বাজেট রোল নির্বাচন করুন `
    //       );
    //     }
    //   }
    // }

    const result = await samityTransactionService.create(dataArray, req.user, req.params.type);
    res.status(201).json({
      message: "সফল ভাবে তৈরী হয়েছে",
      data: result,
    });
  })
);

router.get(
  "/",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  validateSamityTransactionQuery,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    const allQuery: any = req.query;
    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
    delete allQuery.isPagination;
    delete allQuery.page;
    delete allQuery.limit;
    const count: number = await samityTransactionService.count(allQuery);
    const pagination = new Paginate(count, limit, page);

    const docTypes = await samityTransactionService.get(isPagination, pagination.limit, pagination.skip, allQuery);

    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data: toCamelKeys(docTypes),
    });
  })
);

// router.get(
//   "/:id",
//   [citizenAuth([getCode("GET_SAMITY_TRANSACTION")])],
//   validateSamityTransactionQuery,
//   validateRequest,
//   wrap(async (req: Request, res: Response, next: NextFunction) => {
//     const samityId = req.params.id;
//     const getTransactionData
//     // const page: number = Number(req.query.page);
//     // const limit: number = Number(req.query.limit);
//     // const allQuery: any = req.query;
//     // const isPagination =
//     //   req.query.isPagination && req.query.isPagination == "false"
//     //     ? false
//     //     : true;
//     // delete allQuery.isPagination;
//     // delete allQuery.page;
//     // delete allQuery.limit;
//     // const count: number = await samityTransactionService.count(allQuery);
//     // const pagination = new Paginate(count, limit, page);

//     // const docTypes = await samityTransactionService.get(
//     //   isPagination,
//     //   pagination.limit,
//     //   pagination.skip,
//     //   allQuery
//     // );

//     res.status(200).send({
//       message: "request successful",
//       ...(isPagination ? pagination : []),
//       data: toCamelKeys(docTypes),
//     });
//   })
// );

router.put(
  "/",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  validatesamityTransactionUpdate,
  validateRequest,
  checkTranId,
  checkSamityIdForArrayObj,
  checkFinancialYear,
  checkGlacIdUpdate,

  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const dataArray = req.body;
    const totalResult = [];
    const updatedBy = req.user.userId ? req.user.userId : "Admin";
    for await (const [index, element] of dataArray.entries()) {
      if (element.isIeBudget === "E") {
        const id = element.id;
        const result: samityTransactionAttrs | undefined = await samityTransactionService.update(id, {
          ...element,
          financialYear: "",
          budgetRole: "",
          updatedBy,
          updatedAt: new Date(),
        });
        totalResult.push(result);
      }

      if (element.isIeBudget === "B") {
        if (element.financialYear) {
          const id = element.id;
          const result: samityTransactionAttrs | undefined = await samityTransactionService.update(id, {
            ...element,
            updatedBy,
            updatedAt: new Date(),
          });
          totalResult.push(result);
        } else {
          throw new BadRequestError(`Financial Year Can not be null For Budget ${index}`);
        }
      }
    }
    res.status(201).json({
      message: "হালনাগাদ সম্পন্ন হয়েছে",
      data: totalResult,
    });
  })
);

/**
 * Delete feature by id
 */
router.delete(
  "/:samityTranId",
  checkTranIdDelete,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const result: samityTransactionAttrs = await samityTransactionService.delete(parseInt(req.params.samityTranId));
    return res.status(200).json({
      message: "Delete Successful",
      data: result.id ?? null,
    });
  })
);

export default router;
