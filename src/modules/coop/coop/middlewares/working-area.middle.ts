import { NextFunction, Request, Response } from "express";
import { NotFoundError } from "rdcd-common";
import Container from "typedi";
import { WorkingAreaServices } from "../services/working-area.service";

const WorkingAreaService = Container.get(WorkingAreaServices);

export const idCheckValidation = async (req: Request, res: Response, next: NextFunction) => {
  const id: string = req.params.id;
  const count = await WorkingAreaService.checkExistingId(id);
  if (!count) {
    next(new NotFoundError("WorkingAreaId does not found"));
  } else {
    next();
  }
};
