import { NextFunction, Request, Response } from "express";
import { BadRequestError, NotFoundError } from "rdcd-common";
import Container from "typedi";
import { MemberAreaServices } from "../services/member-area.service";

const MemberAreaService = Container.get(MemberAreaServices);

export const idCheckValidation = async (req: Request, res: Response, next: NextFunction) => {
  const id: string = req.params.id;
  const count = await MemberAreaService.checkExistingId(id);
  if (!count) {
    next(new NotFoundError("MemberAreaId does not found"));
  } else {
    next();
  }
};

export const checkSamityId = async (req: Request, res: Response, next: NextFunction) => {
  const dataArray = req.body;
  const isSameIdsMemberArea = await MemberAreaService.sameNameIdCheck(dataArray, "samityId");
  if (!isSameIdsMemberArea[1]) {
    next(new BadRequestError("Samity Id is not same for member Area data"));
  } else {
    for (const element of dataArray) {
      const samityId = parseInt(element.samityId);
      const isExistSamityId = await MemberAreaService.isExistSamityId(samityId);
      if (!isExistSamityId) {
        next(new BadRequestError(` ${samityId} is not found in database`));
      }
    }
    next();
  }
};
