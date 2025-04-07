import { NextFunction, Request, Response, Router } from "express";
import Container from "typedi";
import { validates } from "../../../../middlewares/express-validation.middle";
import { wrap } from "../../../../middlewares/wraps.middle";
import { DocMappingServices } from "../services/doc-mapping.service";
import { validateGetDocMapping } from "../validators/doc-mapping.validator";

const router = Router();
const DocMappingService = Container.get(DocMappingServices);

router.get(
  "/:samityTypeId",
  validates(validateGetDocMapping),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params.samityTypeId);
    const data = await DocMappingService.getBySamityTypeId(id);

    res.status(200).send({
      message: "Request successful",
      data,
    });
  })
);

export { router as docMappingRouter };
