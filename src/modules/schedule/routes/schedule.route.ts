import express, { NextFunction, Request, Response, Router } from "express";
import Container from "typedi";
import { validates } from "../../../middlewares/express-validation.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { auth } from "../../user/middlewares/auth.middle";
import ScheduleService from "../services/schedule.service";
import { createDisburse } from "../validators/schedule.validator";

const router: Router = express.Router();

/**
 * create new Schedule
 * Author: Adnan
 * Updater:
 * authId:
 */
// router.post(
//   "/",
//   [auth(["*"])],
//   validates(createDisburse),
//   wrap(async (req: Request, res: Response, next: NextFunction) => {
//     const scheduleService: ScheduleService = Container.get(ScheduleService);

//     const result = await scheduleService.loanDisbursementApproval(
//       { ...req.body.data },
//       null,
//       req.user.userId,
//       req.user.officeId,
//       req.user.doptorId
//     );

//     res.status(201).json({
//       message: "ঋণ বিতরণ সম্পন্ন হয়েছে",
//       data: result,
//     });
//   })
// );

export default router;
