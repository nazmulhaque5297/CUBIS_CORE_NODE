import { NextFunction, Request, Response, Router } from "express";
import { validateRequest } from "rdcd-common";
import Container from "typedi";
import { wrap } from "../../../../middlewares/wraps.middle";
import { validateCoopSamityId } from "../../coop/validators/coop/samity-info.validator";
import { PageValueServices } from "../services/page.service";

const router = Router();
const PageValueService = Container.get(PageValueServices);

router.get(
  "/:samityId",
  validateCoopSamityId,
  validateRequest,
  // dynamicAuthorization, not use for frontend
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityId = parseInt(req.params.samityId);
    const result = await PageValueService.get(samityId);
    res.status(200).send({
      message: "Data Serve Successfully",
      data: result ? result : {},
    });
  })
);

export { router as pageRouter };
