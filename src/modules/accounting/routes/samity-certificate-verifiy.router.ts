/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-05-23 09:57:33
 * @modify date 2022-05-23 09:57:33
 * @desc [description]
 */

import { NextFunction, Request, Response, Router } from "express";
import fs from "fs";
import path from "path";
import { NotFoundError } from "rdcd-common";
import Container from "typedi";
import { minioBucketName } from "../../../../configs/app.config";
import { minioClient } from "../../../../db/minio.db";
import { validates } from "../../../../middlewares/express-validation.middle";
import { wrap } from "../../../../middlewares/wraps.middle";
import { SamityCertificateVerifyService } from "../services/samity-certificate-verify.service";
import { validateSamityCertificate } from "../validators/samity-certificate-verify.validate";

const router = Router();

router.get(
  "/",
  validates(validateSamityCertificate),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const { samityId } = req.query;
    const samityCertificate = Container.get(SamityCertificateVerifyService);
    const documentName = await samityCertificate.get(samityId as unknown as number);

    if (!documentName) {
      throw new NotFoundError("Samity not found");
    }

    const rPath = path.join(__dirname, "../../../../temp", documentName);

    await minioClient.fGetObject(minioBucketName, documentName, rPath);

    res.status(200).sendFile(rPath, (err) => {
      if (fs.existsSync(rPath)) {
        fs.unlinkSync(rPath);
      } else {
        throw new NotFoundError("Samity not found");
      }
    });
  })
);

export { router as samityVerifyRouter };
