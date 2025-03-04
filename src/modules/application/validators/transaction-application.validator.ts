import { body } from "express-validator";
import { BadRequestError } from "rdcd-common";
import Container from "typedi";
import db from "../../../db/connection.db";
import { TransactionApplicationService } from "../services/transaction-application.service";

export const transactionValidate = [
  body("transactionSets").custom(async (values, { req }) => {
    const transactionService: TransactionApplicationService = Container.get(TransactionApplicationService);
    req.body.doptorId = Number(req.user?.doptorId);
    const officeId = Number(req.user?.officeId);

    const transactionSets = req.body.data.transactionSets;

    for (const element of transactionSets) {
      const checkResult = await transactionService.checkIsGlBalanceNegative(
        Number(element.glacId),
        element.drcrCode,
        Number(element.tranAmt),
        officeId,
        await db.getConnection("slave"),
        Number(req.body.projectId)
      );
      if (!checkResult?.status) {
        throw new BadRequestError(checkResult?.message);
      }
    }
  }),
];
