/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-10-25 10:59:10
 * @modify date 2021-10-25 10:59:10
 * @desc samity reg middleware
 */

import { NextFunction, Request, Response } from "express";
import { BadRequestError } from "rdcd-common";
import Container from "typedi";
import { pgConnect } from "../../../../../db-coop/factory/connection.db";
import { isExistsByColumn } from "../../../../../utils/service.utils";
import { SamityInputAttrs } from "../../interfaces/init/init-samity-info.interface";
import { SamityRegistrationServices } from "../../services/init/init-samity-info.service";

const SamityRegistrationService = Container.get(SamityRegistrationServices);

export const uniqueCheck = async (req: Request<any, unknown, SamityInputAttrs>, res: Response, next: NextFunction) => {
  const { samityCode } = req.body;
  const id = Number(req.params.id);

  const count = id
    ? await SamityRegistrationService.uniqueCheckUpdate(samityCode, id)
    : await SamityRegistrationService.uniqueCheck(samityCode);
  count ? next(new BadRequestError("Samity Code exists")) : next();
};

export const samityExist = async (req: Request, res: Response, next: NextFunction) => {
  if (req.body.samityId) {
    const id = Number(req.body.samityId);
    // const pool = (await pgConnect.getConnection("master")).connect();

    const isExist = id
      ? await isExistsByColumn("id", "temps.samity_info", await pgConnect.getConnection("slave"), { id })
      : false;
    isExist ? next() : next(new BadRequestError("Samity id does not exist"));
  } else {
    const id = Number(req.params.id);
    const isExist = id ? await SamityRegistrationService.samityIdExist(id) : false;
    isExist ? next() : next(new BadRequestError("Samity id does not exist"));
  }
};

export const samityExistUpdate = async (req: Request, res: Response, next: NextFunction) => {
  const isSamityIdExist: Boolean = await SamityRegistrationService.samityIdExist(parseInt(req.params.id));

  if (isSamityIdExist) {
    next();
  } else {
    next(new BadRequestError("Samity ID is not Exist"));
  }
};

export const isSamityIdSame = async (req: Request, res: Response, next: NextFunction) => {
  const samityId = parseInt(req.params.id);

  if (!samityId) throw new BadRequestError("Samity ID invalid");
  const memberAreaData = req.body.memberArea;
  const samityIdForMemberArea = parseInt(req.body.memberArea[0].samityId);

  const isSameIdsMemberArea = await SamityRegistrationService.sameNameIdCheck(memberAreaData, "samityId");

  const workingAreaData = req.body.workingArea;
  const isSameIdsWorkingArea = await SamityRegistrationService.sameNameIdCheck(workingAreaData, "samityId");

  if (isSameIdsMemberArea[1] && isSameIdsWorkingArea[1]) {
    if (samityId === samityIdForMemberArea) {
      next();
    } else {
      next(new BadRequestError("Samity Id is not same for Samity,member Area data & working Area Data"));
    }
  } else {
    next(new BadRequestError("Samity Id is not same for Member Area and Working Area"));
  }
};

export const isExistUserId = async (req: Request, res: Response, next: NextFunction) => {
  const existUserId = await SamityRegistrationService.existuserId(req.user.id);
  if (!existUserId) {
    next(new BadRequestError(" Citizen id is not Exist in Citizen database"));
  } else {
    next();
  }
};

export const isWorkingAreaIdExist = async (req: Request, res: Response, next: NextFunction) => {
  const workingAreaData = req.body.workingArea;
  const samityId = parseInt(req.params.id);
  const isWorkingAreaIdExist = await SamityRegistrationService.workingAreaIdCheck(samityId, workingAreaData);
  if (!isWorkingAreaIdExist) {
    next(new BadRequestError("Working Area ID is not Exist in database"));
  } else {
    next();
  }
};

export const isMemberAreaIdExist = async (req: Request, res: Response, next: NextFunction) => {
  const memberAreaData = req.body.memberArea;
  const samityId = parseInt(req.params.id);
  const isMemberAreaIdExist = await SamityRegistrationService.memberAreaIdCheck(samityId, memberAreaData);
  if (!isMemberAreaIdExist) {
    next(new BadRequestError("Member Area ID is not Exist in database"));
  } else {
    next();
  }
};
