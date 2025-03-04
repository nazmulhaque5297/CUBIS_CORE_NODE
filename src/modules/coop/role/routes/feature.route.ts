import express, { NextFunction, Request, Response, Router } from "express";
import lo from "lodash";
import { BadRequestError, Paginate } from "rdcd-common";
import Container from "typedi";
import { authConf, getCode } from "../../../../configs/auth.config";
import { validates } from "../../../../middlewares/express-validation.middle";
import { validateRequest } from "rdcd-common";
import { wrap } from "../../../../middlewares/wraps.middle";
import { auth } from "../../../../modules/user/middlewares/auth.middle";
import { IPaginationResponse } from "../../../../types/interfaces/pagination.interface";
import { IFeatureAttrs } from "../interfaces/feature.interface";
import FeatureService from "../services/feature.service";
import {
  createFeature,
  deleteFeatrue,
  updateFeature,
} from "../validators/feature.validator";

const router: Router = express.Router();

/**
 * Author: Nahid
 * Updater: Adnan
 */

/**
 * Create Feature
 */
router.post(
  "/",
  [auth([getCode("FEATURE_CREATE")]), validates(createFeature)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const featureService: FeatureService = Container.get(FeatureService);
    const result: IFeatureAttrs | undefined = await featureService.create({
      ...req.body,
      createdBy: req.user.username,
    });

    res.status(201).json({
      message: "Request Successful",
      data: {
        id: result?.id ?? null,
      },
    });
  })
);

/**
 * Get Feature with filter
 */
router.get(
  "/",
  [auth(["*"])], // need update after auth
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const featureService: FeatureService = Container.get(FeatureService);
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    const allQuery: any = req.query;
    const isPagination =
      req.query.isPagination && req.query.isPagination == "false"
        ? false
        : true;
    delete allQuery.page;
    delete allQuery.limit;
    delete allQuery.isPagination;
    const count: number = await featureService.count(allQuery);
    const pagination = new Paginate(count, limit, page);

    //console.log({ pagination });

    const result = await featureService.getAll(
      isPagination,
      pagination.limit,
      pagination.skip,
      allQuery,
      req.user.componentId
    );
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

/**
 * Update feature attributes by id
 */
router.put(
  "/:id",
  auth(["*"]),
  updateFeature,
  validateRequest,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const featureService: FeatureService = Container.get(FeatureService);
    if (lo.size(req.body) > 0) {
      const result: IFeatureAttrs = await featureService.update(
        parseInt(req.params.id),
        { ...req.body, updatedBy: req.user.username, updateDate: new Date() }
      );
      return res.status(200).json({
        message: "Request Successful",
        data: {
          id: result.id ?? null,
        },
      });
    }
    next(new BadRequestError("No update field provided"));
  })
);

/**
 * Delete feature by id
 */
router.delete(
  "/:id",
  [auth(["*"]), validates(deleteFeatrue)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const featureService: FeatureService = Container.get(FeatureService);
    const result: IFeatureAttrs = await featureService.delete(
      parseInt(req.params.id)
    );
    return res.status(200).json({
      message: "Request Successful",
      data: result.id ?? null,
    });
  })
);

/**
 * Init features
 */
router.post(
  "/init",
  [auth(["*"])],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const features: IFeatureAttrs[] = authConf.features;
    const featureService: FeatureService = Container.get(FeatureService);
    for (let f of features) {
      // inserting the roots
      if (f.parentId === null) {
        const result: IFeatureAttrs | undefined = await featureService.create({
          ...f,
          createdBy: req.user.username,
        });
      }
      // inserting the childrens
      else {
        const parentRes: IPaginationResponse = await featureService.get(1, 1, {
          featureName: f.parentId?.toString(),
        });
        const parent: IFeatureAttrs = parentRes.data[0];
        const result: IFeatureAttrs | undefined = await featureService.create({
          ...f,
          parentId: parent.id,
          createdBy: req.user.username,
        });
      }
    }

    return res.status(200).json({
      message: "Request Successful",
      data: null,
    });
  })
);

export default router;
