/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-12-05 16:25:58
 * @modify date 2021-12-05 16:25:58
 * @desc [description]
 */
import { Request, Response, NextFunction } from "express";
import { BadRequestError } from "rdcd-common";
import Container from "typedi";
import { CitizenRoleServices } from "../services/citizen-role.service";

const CitizenRoleService = Container.get(CitizenRoleServices);

export const checkCitizenRoleExists = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const citizen = await CitizenRoleService.citizenRoleExists(parseInt(id));
  citizen
    ? next()
    : next(new BadRequestError("Citizen Role Id does not exist"));
};

export const checkCitizenRoleExistsInBody = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { citizenRoleId } = req.body;
  const citizen = citizenRoleId
    ? await CitizenRoleService.citizenRoleExists(parseInt(citizenRoleId))
    : false;
  citizen
    ? next()
    : next(new BadRequestError("Citizen Role Id does not exist"));
};
