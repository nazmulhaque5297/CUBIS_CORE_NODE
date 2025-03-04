import { Router, Request, Response, NextFunction } from "express";
import path from "path";
import Container from "typedi";
import { wrap } from "../../../../middlewares/wraps.middle";
import { SamityReportServices } from "../../services/samity-report/samity-report.service";
import fs from "fs";
import { NotFoundError } from "rdcd-common";

const router = Router();

router.get(
  "/:type",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const SamityReportService = Container.get(SamityReportServices);
    if ((req.params.type = "samity-member-information-report")) {
      const data = await SamityReportService.getCertificate(
        123,
        12,
        "document"
      );
      const rPath = path.join(__dirname, "1.2_SamityMemberInfo.pdf");
      //   res.status(200).sendFile(rPath, (err) => {
      //     if (err) {
      //       console.log(err);
      //     }

      //     if (fs.existsSync(rPath)) {
      //       fs.unlinkSync(rPath);
      //     } else {
      //       throw new NotFoundError("Samity not found");
      //     }
      //   });

      res.status(200).send({
        data: data,
      });
    }
  })
);

export { router as samityReportRouter };
