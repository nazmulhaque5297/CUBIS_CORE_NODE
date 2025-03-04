import express, { NextFunction, Request, Response, Router } from "express";
import { toCamelKeys } from "keys-transform";
import _ from "lodash";
import { validateRequest } from "rdcd-common";
import Container from "typedi";
import { validates } from "../../../../middlewares/express-validation.middle";
import { wrap } from "../../../../middlewares/wraps.middle";
import { auth } from "../../../../modules/user/middlewares/auth.middle";
import DocMappingServices from "../services/docMapping.service";
import {
  ValidateDeleteDocMapping,
  ValidatePostDocMapping,
  ValidateUpdateDocMapping,
} from "../validators/doc-mapping.validator";

const router: Router = express.Router();

router.post(
  "/",
  auth(["*"]),
  validates(ValidatePostDocMapping, false),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const DocMappingService = Container.get(DocMappingServices);

    const docMappingData = req.body.docMappingInfo;
    const samityTypeData = {
      ..._.omit(req.body.samityTypeInfo, "goal"),
      goal: JSON.stringify(req.body.samityTypeInfo.goal),
    };

    // for (const [element, index] of docMappingData.entries()) {
    //   docMappingData[index] = { ...element, createdBy, createdAt };
    // }

    const result = await DocMappingService.create(
      {
        samityTypeData,
        docMappingData,
      },
      req.user
    );
    return res.status(201).json({
      message: "সফল ভাবে তৈরী হয়েছে",
      data: result,
    });
  })
);

router.get(
  "/",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const DocMappingService = Container.get(DocMappingServices);
    // const page: number = Number(req.query.page);
    // const limit: number = Number(req.query.limit);
    // const allQuery: any = req.query;

    // const isPagination =
    //   req.query.isPagination && req.query.isPagination == "false"
    //     ? false
    //     : true;

    // delete allQuery.page;
    // delete allQuery.limit;
    // delete allQuery.isPagination;
    // const count: number = await DocMappingService.count(allQuery);
    // const pagination = new Paginate(count, limit, page);

    const result = await DocMappingService.get();

    return res.status(200).json({
      message: "সফল ভাবে তৈরি হয়েছে",
      data: result,
    });
  })
);

router.put(
  "/",
  auth(["*"]),
  validates(ValidateUpdateDocMapping),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const DocMappingService = Container.get(DocMappingServices);

    const updatedBy = req.user.username;
    const updatedAt = new Date();
    const docMappingData = req.body.docMappingInfo;
    const samityTypeData = {
      ..._.omit(req.body.samityTypeInfo, "goal"),
      goal: JSON.stringify(req.body.samityTypeInfo.goal),
    };

    const result = await DocMappingService.update({ samityTypeData, docMappingData }, updatedBy, updatedAt);
    return res.status(201).json({
      message: "সফল ভাবে হালনাগাদ হয়েছে",
      data: result,
    });
  })
);

router.delete(
  "/:docMappingId",
  ValidateDeleteDocMapping,
  validateRequest,
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const DocMappingService = Container.get(DocMappingServices);
    const docMappingId = parseInt(req.params.docMappingId);
    const result = await DocMappingService.delete(docMappingId);
    return res.status(200).json({
      message: "সফলভাবে বাতিল করা হয়েছে ",
      data: result ? toCamelKeys(result) : result,
    });
  })
);

export { router as setUpDocMappingRouter };
