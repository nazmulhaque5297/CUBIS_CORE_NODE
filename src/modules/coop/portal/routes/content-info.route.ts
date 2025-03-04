import { NextFunction, Request, Response, Router } from "express";
import Container from "typedi";
import { dynamicAuthorization } from "../../coop/middlewares/coop/application/application.middle";
import { wrap } from ".././../../../middlewares/wraps.middle";
import { ContentInfoServices } from "../services/content-info.service";

const router = Router();
const ContentInfoService = Container.get(ContentInfoServices);

router.get(
  "/",
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const pageId: any = req.query.pageId;
    const result = await ContentInfoService.getById(pageId);

    res.status(200).send({
      message: "Data Serve Successfully",
      data: result ? result : {},
    });
  })
);

export { router as contentInfoRouter };
