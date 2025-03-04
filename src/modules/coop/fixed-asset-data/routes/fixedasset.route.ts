import { NextFunction, Request, Response, Router } from "express";
import Container from "typedi";
import { wrap } from "../../../..//middlewares/wraps.middle";
import { validates } from "../../../../middlewares/express-validation.middle";
import { dynamicAuthorization } from "../../coop/middlewares/coop/application/application.middle";
import { FixedAssetService } from "../services/fixedasset.service";
import { fixedAssetData, purchaseFixedAssetData } from "../validators/fixed_asset.validator";

const router = Router();

router.get(
  "/fixed-asset",
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const fixedasset: FixedAssetService = Container.get(FixedAssetService);
    const result = await fixedasset.getFixedAssetData();

    res.status(200).send({
      message: "সফলভাবে তৈরি হয়েছে",
      data: result,
    });
  })
);

router.post(
  "/fixed-asset",
  dynamicAuthorization,
  validates(fixedAssetData),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const fixedasset: FixedAssetService = Container.get(FixedAssetService);
    const response = await fixedasset.postFixedAssetData({
      ...req.body,
      userId: req.user.userId ? req.user.userId : req.user.userId,
      userType: req.user.type,
    });
    res.status(201).send({
      message: response?.message,
      data: response?.result,
    });
  })
);

router.post(
  "/purchase-fixed-asset",
  dynamicAuthorization,
  validates(purchaseFixedAssetData),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const fixedasset: FixedAssetService = Container.get(FixedAssetService);
    const response = await fixedasset.purchaseFixedAssetData({
      ...req.body,
      userId: req.user.userId ? req.user.userId : req.user.userId,
      userType: req.user.type,
    });
    res.status(201).send({
      message: response?.message,
      data: response?.result,
    });
  })
);

router.post(
  "/update-purchase-fixed-asset",
  dynamicAuthorization,
  validates(purchaseFixedAssetData),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const fixedasset: FixedAssetService = Container.get(FixedAssetService);
    const response = await fixedasset.updatepurchaseFixedAssetData({
      ...req.body,
      userId: req.user.userId ? req.user.userId : req.user.userId,
      userType: req.user.type,
    });
    res.status(201).send({
      message: response?.message,
      data: response?.result,
    });
  })
);

router.get(
  "/purchase-fixed-asset/:samityId",
  dynamicAuthorization,

  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const fixedasset: FixedAssetService = Container.get(FixedAssetService);
    let samityId = Number(req.params.samityId);
    const result = await fixedasset.getPurchaseFixedAssetData(samityId);

    res.status(200).send({
      message: "সফলভাবে তৈরি হয়েছে",
      data: result,
    });
  })
);

router.get(
  "/asset-data/:purchaseid/:samityid",
  dynamicAuthorization,

  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const fixedasset: FixedAssetService = Container.get(FixedAssetService);
    let purchaseid = Number(req.params.purchaseid);
    let samityid = Number(req.params.samityid);
    const result = await fixedasset.getAssetData(purchaseid, samityid);

    res.status(200).send({
      message: "সফলভাবে তৈরি হয়েছে",
      data: result,
    });
  })
);

router.get(
  "/listassetdata/:itemId/:samityId",
  dynamicAuthorization,

  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const fixedasset: FixedAssetService = Container.get(FixedAssetService);
    let itemId = Number(req.params.itemId);
    let samityId = Number(req.params.samityId);

    const result = await fixedasset.getListofAsset(itemId, samityId);

    res.status(200).send({
      message: "সফলভাবে তৈরি হয়েছে",
      data: result,
    });
  })
);

router.post(
  "/update-asset-info/:id/:samityid",
  dynamicAuthorization,
  // validates(assetinfo),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);
    const samityid = Number(req.params.samityid);
    const fixedasset: FixedAssetService = Container.get(FixedAssetService);
    const response = await fixedasset.updateAssetinfo(id, samityid, {
      status: req.body.status,
      userId: req.user.userId ? req.user.userId : req.user.userId,
      userType: req.user.type,
    });
    res.status(201).send({
      message: response?.message,
      data: response?.result,
    });
  })
);

export { router as coopRouter };
