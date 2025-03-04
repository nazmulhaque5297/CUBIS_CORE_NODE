import { NextFunction, Request, Response } from "express";
import { BadRequestError } from "rdcd-common";
import Container from "typedi";
import { CommitteeRoleInputAttrs } from "../interfaces/committee-role.interface";
import { CommitteeRoleServices } from "../services/committee-role.service";

const CommitteeRoleService = Container.get(CommitteeRoleServices);

export const uniqueCheck = async (
  req: Request<any, unknown, CommitteeRoleInputAttrs>,
  res: Response,
  next: NextFunction
) => {
  const { roleName } = req.body;
  const id = Number(req.params.id);

  const count = id
    ? await CommitteeRoleService.uniqueCheckUpdate(roleName, id)
    : await CommitteeRoleService.uniqueCheck(roleName);
  count ? next(new BadRequestError("roleName exists")) : next();
};

export const idCheck = async (req: Request, res: Response, next: NextFunction) => {
  const id: number = Number(req.params.id);

  const count = await CommitteeRoleService.idCheck(id);
  count ? next() : next(new BadRequestError("id does not exist"));
};
