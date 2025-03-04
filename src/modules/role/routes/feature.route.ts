import express, { NextFunction, Request, Response, Router } from "express";
import { default as lo, default as lodash } from "lodash";
import { Paginate } from "rdcd-common";
import Container from "typedi";
import BadRequestError from "../../../errors/bad-request.error";
import { validates } from "../../../middlewares/express-validation.middle";
import { pageCheck } from "../../../middlewares/page-check.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { auth } from "../../../modules/user/middlewares/auth.middle";
import { IFeatureAttrs } from "../interfaces/feature.interface";
import FeatureService from "../services/feature.service";
import { createFeature, deleteFeatrue, updateFeature } from "../validators/feature.validator";

const router: Router = express.Router();

/**
 * Author: Nahid
 * Updater: Adnan
 * Update: Hasibuzzman
 */

/**
 * Create Feature
 */
router.post(
  "/",
  auth(["*"]),
  validates(createFeature),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const featureService: FeatureService = Container.get(FeatureService);
    const result: IFeatureAttrs | undefined = await featureService.create(
      {
        ...req.body,
        createdBy: req.user.userId,
        createDate: new Date(),
      },
      req.user.componentId
    );

    res.status(201).json({
      message: "সফল ভাবে তৈরী হয়েছে",
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
  auth(["*"]),
  pageCheck,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    console.log("work")
    const featureService: FeatureService = Container.get(FeatureService);
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    let allQuery: any = req.query;

    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
    allQuery;
    allQuery = lodash.omit(allQuery, ["isPagination", "page", "limit"]);

    const count: number = await featureService.count(allQuery);
    const pagination = new Paginate(count, limit, page);
    const data = await featureService.get(
      isPagination,
      pagination.limit,
      pagination.skip,
      allQuery,
      req.user.componentId
    );

    res.status(200).send({
      message: "request successful",
      ...(isPagination ? pagination : []),
      data: data,
    });
  })
);

/**
 * Update feature attributes by id
 */
router.put(
  "/:id",
  [auth(["*"]), validates(updateFeature)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const featureService: FeatureService = Container.get(FeatureService);
    if (lo.size(req.body) > 0) {
      const result: IFeatureAttrs = await featureService.update(parseInt(req.params.id), {
        ...req.body,
        updatedBy: req.user.username,
        updateDate: new Date(),
      });
      return res.status(200).json({
        message: "সফলভাবে হালনাগাদ করা হয়েছে",
        data: {
          id: result.id ?? null,
        },
      });
    }
    next(new BadRequestError("No update field provided"));
  })
);

/**
 * Get Feature based on role
 */
// router.get(
//   "/roleFeature",
//   [auth(["*"]) /*, validates(getFeatureWithFilter)*/], // need update after auth
//   wrap(async (req: Request, res: Response, next: NextFunction) => {
//     const featureService: FeatureService = Container.get(FeatureService);
//     let result;
//     if (req.query.allFeatures) result = await featureService.getRoleFeature();
//     else result = await featureService.getRoleFeature(req.user.roleId);
//     return res.status(200).json({
//       message: "Request Successful",
//       data: result,
//     });
//   })
// );
/**
 * Delete feature by id
 */
router.delete(
  "/:id",
  [auth(["*"]), validates(deleteFeatrue)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const featureService: FeatureService = Container.get(FeatureService);
    const result: IFeatureAttrs = await featureService.delete(parseInt(req.params.id));
    return res.status(200).json({
      message: "Request Successful",
      data: result.id ?? null,
    });
  })
);

/**
 * Init features
 */
// router.post(
//   "/init",
//   [devAuth],
//   wrap(async (req: Request, res: Response, next: NextFunction) => {
//     const features: IFeatureAttrs[] = authConf.features;
//     const featureService: FeatureService = Container.get(FeatureService);
//     for (let f of features) {
//       // inserting the roots
//       if (f.parentId === null) {
//         const result: IFeatureAttrs | undefined = await featureService.create({
//           ...f,
//           createdBy: req.user.username,
//         });
//       }
//       // inserting the childrens
//       else {
//         const parentRes: IPaginationResponse = await featureService.get(1, 1, {
//           featureName: f.parentId?.toString(),
//         });
//         const parent: IFeatureAttrs = parentRes.data[0];
//         const result: IFeatureAttrs | undefined = await featureService.create({
//           ...f,
//           parentId: parent.id,
//           createdBy: req.user.username,
//         });
//       }
//     }

//     return res.status(200).json({
//       message: "Request Successful",
//       data: null,
//     });
//   })
// );

export default router;
