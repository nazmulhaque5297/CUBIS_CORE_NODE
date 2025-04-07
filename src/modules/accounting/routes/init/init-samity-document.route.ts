/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-04 12:42:50
 * @modify date 2021-11-04 12:42:50
 * @desc [description]
 */

import { NextFunction, Request, Response, Router } from "express";
import { toCamelKeys } from "keys-transform";
import { BadRequestError, multerUpload } from "rdcd-common";
import Container from "typedi";
import { getCode } from "../../../../../configs/auth.config";
import { validates } from "../../../../../middlewares/express-validation.middle";
import { wrap } from "../../../../../middlewares/wraps.middle";
import { minioPresignedGet, minioUpload } from "../../../../../utils/minio.util";
import { citizenAuth } from "../../../citizen/middlewares/citizen-auth.middle";
import { SamityDocumentInputAttrs } from "../../interfaces/samity-document.interface";
import { dynamicAuthorization } from "../../middlewares/coop/application/application.middle";
import { isDocumentExistInPayload, samityDocumentExists } from "../../middlewares/init/init-samity-document.middle";
import { SamityDocumentServices } from "../../services/init/init-samity-document.service";
import {
  validateSamityDocument,
  validateSamityDocumentUpdate,
} from "../../validators/init/init-samity-document.validator";
// import { samityExist } from "../../middlewares/init/init-samity-registration.middle";

const router = Router();
const SamityDocumentService = Container.get(SamityDocumentServices);

router.get(
  "/",
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const { samityId } = req.query;

    const committee = await SamityDocumentService.get(Number(samityId));

    res.status(200).send({
      message: "request successful",
      data: await minioPresignedGet(toCamelKeys(committee), ["documentName"]),
    });
  })
);
router.post(
  "/",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  multerUpload.fields([
    {
      name: "documentName",
      maxCount: 1,
    },
  ]),
  validates(validateSamityDocument, true),
  isDocumentExistInPayload,
  minioUpload,
  wrap(async (req: Request<unknown, unknown, SamityDocumentInputAttrs>, res: Response, next: NextFunction) => {
    const createdBy = req.user.userId;
    const createdAt = new Date();
    let { samityId, documentId, expireDate, effectDate, documentNo, documentName, documentNameUrl } = req.body;
    expireDate = expireDate ? expireDate : null;
    effectDate = effectDate ? effectDate : null;

    try {
      const data = await SamityDocumentService.create({
        samityId,
        documentId,
        documentNo,
        documentName,
        expireDate,
        effectDate,
        createdBy,
        createdAt,
      });

      res.status(201).send({
        message: "সফল ভাবে তৈরী হয়েছে ",
        data: toCamelKeys({ ...data, documentNameUrl }),
      });
    } catch (ex) {
      throw new BadRequestError("অনাকাঙ্খিত ত্রুটি হয়েছে।");
    }
  })
);
router.put(
  "/:id",
  multerUpload.fields([
    {
      name: "documentName",
      maxCount: 1,
    },
  ]),
  [citizenAuth([getCode("SAMITY_APPLICATION")]), validates(validateSamityDocumentUpdate)],
  samityDocumentExists,

  minioUpload,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const { documentId, expireDate, effectDate, documentNo, documentName, documentNameUrl } = req.body;

    const data = await SamityDocumentService.update(
      {
        documentId,
        documentNo,
        documentName,
        expireDate,
        effectDate,
        updatedBy: req.user.userId,
      },
      Number(req.params.id)
    );

    res.status(200).send({
      message: "হালনাগাদ সম্পন্ন হয়েছে",
      data: toCamelKeys({ ...data, documentNameUrl }),
    });
  })
);
router.delete(
  "/:id",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  samityDocumentExists,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const data = await SamityDocumentService.delete(Number(id));
    res.status(200).send({
      message: "deleted successfully",
      data,
    });
  })
);

router.get(
  "/doc-mapping-count/:id",
  [citizenAuth([getCode("SAMITY_APPLICATION")])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const data = await SamityDocumentService.docMappingCount(Number(id));
    res.status(200).send({
      message: "deleted successfully",
      data,
    });
  })
);

export { router as initSamityDocumentRouter };
