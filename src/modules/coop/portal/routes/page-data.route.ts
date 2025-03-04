import { NextFunction, Request, Response, Router } from "express";
import { toCamelKeys } from "keys-transform";
import _ from "lodash";
import { validateRequest } from "rdcd-common";
import { Container } from "typedi";
import { wrap } from "../../../../middlewares/wraps.middle";
import {
  pageDataValidates,
  pageDetailsDeleteValidator,
  validationPathCommonData,
} from "../../../../modules/coop/portal/validators/page-details-data.validator";
import { minioPresignedGet } from "../../../../utils/minio.util";
import { dynamicAuthorization } from "../../coop/middlewares/coop/application/application.middle";
import { pageDataAttrs } from "../interfaces/page-data.interface";
import { searchType } from "../services/page-data.query";
import { PageDataServices } from "../services/page-data.service";
import { pageValidatorDataSearch } from "../validators/page-data.validator";

const router: Router = Router();
const PageDataService = Container.get(PageDataServices);

router.get(
  "/data-search",
  // dynamicAuthorization, not use for frontend
  pageValidatorDataSearch,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    //@ts-ignore
    const searchKey = searchType[req.query.searchType].name;
    const result = await PageDataService.getDataSearch(searchKey, _.omit(req.query, "searchType"));
    res.status(200).send({
      message: "Data server",
      result: result,
    });
  })
);

router.post(
  "/",
  dynamicAuthorization,
  pageDataValidates,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.type == "user" ? req.user.userId : req.user.userId;
    const doptorId = req.user.doptorId;
    const { samityId, pageId, contentId, content, documents } = req.body;

    const pageDataInformation = await PageDataService.create(
      samityId,
      doptorId,
      userId,
      pageId,
      contentId,
      content,
      documents
    );

    res.status(200).send({
      message: "সফলভাবে তথ্য প্রেরণ করা হয়েছে",
      data: pageDataInformation,
    });
  })
);

router.get(
  "/:samityId",
  //dynamicAuthorization, not use for frontend
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const samityId = parseInt(req.params.samityId);

    const docTypes = await PageDataService.get(samityId);

    let returnValue = [];

    for (const element of docTypes) {
      const d = await minioPresignedGet(toCamelKeys(element.attachment), ["fileName"]);

      const valueWithOutAttachment = toCamelKeys(_.omit(element, "attachment"));
      returnValue.push({ ...valueWithOutAttachment, attachment: d });
    }

    res.status(200).send({
      message: "request successful",
      data: returnValue,
    });
  })
);

router.put(
  "/:id",
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const updatedBy = req.user.type == "user" ? req.user.userId : req.user.userId;
    // const updatedBy = req.user.userId ? req.user.userId : "Admin";
    const { samityId, pageId, contentId, content, documents } = req.body;
    const pageDataId = parseInt(req.params.id);
    const result = await PageDataService.update(
      {
        samityId,
        pageId,
        contentId,
        content,
        documents,
        updatedBy,
      },
      pageDataId
    );

    res.status(201).send({
      message: "হালনাগাদ সম্পন্ন হয়েছে",
      data: result,
    });
  })
);

router.delete(
  "/:id",
  dynamicAuthorization,
  pageDetailsDeleteValidator,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const result: pageDataAttrs | null = await PageDataService.delete(parseInt(req.params.id));

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

router.patch(
  "/:samityId",
  dynamicAuthorization,
  validationPathCommonData,
  // validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const samityId = parseInt(req.params.samityId);
    const data = req.body;
    const result = await PageDataService.patchCommonData(samityId, user, data);
    res.status(200).send({ message: "সফলভাবে তথ্য প্রেরণ করা হয়েছে", data: result });
  })
);

export { router as pageDataRouter };
