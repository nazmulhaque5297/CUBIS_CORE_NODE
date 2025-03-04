/**
 * @author Md Raju Ahmed
 * @author Sheikh Md. Tuhin Siddik
 * @email rajucse1705@gmail.com
 * @create date 2022-04-19 14:11:06
 * @modify date 2022-04-19 14:11:06
 * @desc [description]
 */

import { NextFunction, Request, Response, Router, response } from "express";
import { ComponentType } from "../../../interfaces/component.interface";
import { wrap } from "../../../middlewares/wraps.middle";
import { DoptorSyncService } from "../services/doptor.service";
import { auth } from "../../../modules/user/middlewares/auth.middle";

const router = Router();

router.get(
  "/milkvitaSamity/:component",
  auth(["*"]),
  wrap(async (req: Request<{ component: ComponentType }>, res: Response, next: NextFunction) => {
    const doptorService = new DoptorSyncService(req.params.component);
    console.log({ userInfo: req.user });
    const data = await doptorService.getAssociations(req.user.officeId);
    res.status(200).send({
      message: "request successful",
      data,
    });
  })
);

router.get(
  "/milkvitaMember/:component",
  auth(["*"]),
  wrap(async (req: Request<{ component: ComponentType }>, res: Response, next: NextFunction) => {
    const doptorService = new DoptorSyncService(req.params.component);
    const data = await doptorService.getMembersByAssociation(Number(req.query.associationId));
    res.status(200).send({
      message: "request successful",
      data,
    });
  })
);

router.get(
  "/:component",
  wrap(async (req: Request<{ component: ComponentType }>, res: Response, next: NextFunction) => {
    const { doptorId, officeId } = req.query;
    let data: any = {};
    const doptorService = new DoptorSyncService(req.params.component);

    if (doptorId && !officeId) {
      data = await doptorService.syncData(Number(doptorId));
    } else if (doptorId && officeId) {
      data["officeCount"] = await doptorService.syncOfficeInfo(Number(doptorId), Number(officeId));
      data = { ...data, ...(await doptorService.syncByOffice(Number(doptorId), Number(officeId))) };
    } else {
      data = await doptorService.syncData();
    }

    res.status(200).send({
      message: "সফলভাবে দপ্তরের তথ্য হালনাগাদ করা হয়েছে",
      data,
    });
  })
);

// Your route to make API calls in a for loop
router.get("/test/time/make-api-calls", async (req, res) => {
  let timeout = Math.floor(Math.random() * 3) + 1;
  setTimeout(async () => response, timeout * 1000);

  res.json(timeout);
});

router.get(
  "/test/testibg",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const doptorService = new DoptorSyncService("loan");
    const data = doptorService.test();
    res.status(200).send({
      message: "সফল",
      data,
    });
  })
);

export { router as doptorSyncRouter };
