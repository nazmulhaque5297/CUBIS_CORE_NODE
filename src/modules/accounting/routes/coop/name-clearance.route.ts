import { NextFunction, Request, Response, Router } from "express";
import Container from "typedi";
import { wrap } from "../../../../../middlewares/wraps.middle";
import { auth } from "../../../../../modules/user/middlewares/auth.middle";
import { NameClearanceServices } from "../../services/coop/name-clearance.service";

const NameClearanceService = Container.get(NameClearanceServices);
const router = Router();

router.post(
  "/",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user ? req.user.userId : "admin";
    const result = await NameClearanceService.post({
      ...req.body,
      userId,
      createdBy: userId,
      createdAt: new Date(),
    });
    res.status(201).send({
      message: "Create Successfuly",
      data: result,
    });
  })
);

router.get(
  "/",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    if (req.query) {
      const result = await NameClearanceService.getByIds(req.query);
      res.status(200).send({
        message: "Data Serve successfully",
        data: result,
      });
    } else {
      const userId = req.user ? req.user.userId : "admin";
      const result = await NameClearanceService.getByuserId(userId);
      res.status(200).send({
        message: "Data Serve successfully",
        data: result,
      });
    }
  })
);

export { router as nameClearanceRouter };
