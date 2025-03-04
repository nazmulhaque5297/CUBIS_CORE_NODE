import express, { Request, Response, NextFunction, Router } from "express";
import Container from "typedi";
import { wrap } from "../../../middlewares/wraps.middle";
import { auth } from "../../../modules/user/middlewares/auth.middle";
import { dynamicValidates } from "../middlewares/dynamic-validation.middle";
import { TransactionApplicationService } from "../../application/services/transaction-application.service";
// import { glHeadNegativeBalanceCheck } from "../middlewares/transaction-application-approval.middle";
import { transactionValidate } from "../validators/transaction-application.validator";
import { validates } from "../../../middlewares/express-validation.middle";
import lodash from "lodash";
import moment from "moment";
const router: Router = express.Router();
const transactionService: TransactionApplicationService = Container.get(TransactionApplicationService);
router.post(
  "/",

  [auth(["*"])],
  validates(transactionValidate, true),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    req.body.doptorId = Number(req.user?.doptorId);
    req.body.officeId = Number(req.user?.officeId);
    req.body.createdBy = req.user.userId;
    req.body.createdAt = new Date();
    req.body.authorizeStatus = "P";
    req.body.data = JSON.stringify(req.body.data);
    const result = await transactionService.createTransactionApplication(req.body);
    return res.status(200).json({
      message: "সফলভাবে সংরক্ষণ হয়েছে",
      data: result,
    });
  })
);
router.put(
  "/reject-transaction-application/:id",

  [auth(["*"])],

  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const applicationInfo = await transactionService.getPendingAppliactionById(Number(req.params.id));
    const result = await transactionService.rejectTransactionApplication(
      {
        ...lodash.omit(applicationInfo, ["id"]),
        doptorId: Number(req?.user?.doptorId),
        officeId: Number(req?.user?.officeId),
        updatedAt: new Date(),
        updatedBy: req?.user?.userId,
        authorizedBy: req?.user?.userId,
        authorizedAt: moment(new Date()).format("YYYY-MM-DD"),
      },
      Number(req.params.id)
    );
    return res.status(200).json({
      message: "আবেদনটি বাতিল হয়েছে",
      data: result,
    });
  })
);

router.get(
  "/",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const doptorId = Number(req.user.doptorId);
    const userId = parseInt(req.user.userId);
    const result = await transactionService.getPendingApplications(doptorId, userId, parseInt(req?.user?.officeId));
    return res.status(200).json({
      message: "সফল হয়েছে",
      data: result,
    });
  })
);
export default router;
