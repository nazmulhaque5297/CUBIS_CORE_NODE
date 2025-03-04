/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-10-06 11:26:32
 * @modify date 2022-10-06 11:26:32
 * @desc [description]
 */

import { NextFunction, Request, Response, Router } from "express";
import { NotFoundError } from "rdcd-common";
import stream from "stream";
import Container from "typedi";
import { ComponentType } from "../../../interfaces/component.interface";
import { validates } from "../../../middlewares/express-validation.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { decodeQuery } from "../middlewares/jasper-documents.middle";
import { JasperDocService } from "../services/jasper-documents.service";
import { validateJasper } from "../validators/jasper-documents.validate";
const router = Router();

router.get(
  "/:component/:name",
  [validates(validateJasper, true), decodeQuery],
  wrap(async (req: Request<{ component: ComponentType; name: any }>, res: Response, next: NextFunction) => {
    const componentName = req.params.component;
    const jasperDocService = Container.get(JasperDocService);
    const data = await jasperDocService.getDoc({ ...req.query }, req.params.name, componentName);

    if (data && data.status == 200) {
      var readStream = new stream.PassThrough();
      readStream.end(data.data);

      res.set("Content-disposition", "inline; filename=" + req.params.name);
      res.set("Content-Type", "application/pdf");

      readStream.pipe(res);
    } else {
      throw new NotFoundError();
    }
  })
);

export { router as jasperRouter };
