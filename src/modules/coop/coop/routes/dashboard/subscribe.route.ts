/**
 * @author Md Hasibuzzaman
 * @email hasib.9437.hu@gmail.com
 * @create date 2022-07-3 10.50.00
 * @modify date 2022-07-3 10.50.00
 * @desc [description]
 */

import { NextFunction, Request, Response, Router } from "express";
import Container from "typedi";
import { wrap } from "../../../../../middlewares/wraps.middle";
import { citizenAuth } from "../../../citizen/middlewares/citizen-auth.middle";
import { SubscribeService } from "../../services/dashboard/subscribe.service";

const router = Router();

router.get(
  "/:samityId",
  citizenAuth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityId = parseInt(req.params.samityId);
    const masterDataService = Container.get(SubscribeService);
    const data = await masterDataService.getSubscribe(samityId);

    res.status(200).send({
      message: "request successful",
      data,
    });
  })
);

router.put(
  "/",
  citizenAuth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityId = parseInt(req.body.samityId);
    const updatedBy = req.user.username;
    const updatedAt = new Date();
    const subscribe = req.body.subscribe;
    const masterDataService = Container.get(SubscribeService);
    const newData = await masterDataService.putSubscribe({ id: samityId, subscribe });
    const data = newData.subscribe;

    res.status(200).send({
      message: data ? "সাবস্ক্রাইব সফল হয়েছে" : "সাবস্ক্রাইব বাতিল হয়েছে",
      data,
    });
  })
);

export { router as subscribeRoute };
