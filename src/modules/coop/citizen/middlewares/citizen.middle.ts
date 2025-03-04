/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-28 10:48:44
 * @modify date 2021-11-28 10:48:44
 * @desc [description]
 */

import { NextFunction, Request, Response } from "express";
import { BadRequestError } from "rdcd-common";
import Container from "typedi";
import CitizenServices from "../services/citizen.service";

const citizenService = Container.get(CitizenServices);

/**
 *  check if citizen id exists by req.params.id
 */
export const checkCitizenExists = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const citizen = await citizenService.userIdExists(parseInt(id));
  citizen ? next() : next(new BadRequestError("Citizen Id does not exist"));
};

/**
 *  check if citizen id exists by req.body.userId
 */
export const citizenExists = async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.body;
  const citizen = await citizenService.userIdExists(parseInt(userId));
  citizen ? next() : next(new BadRequestError("Citizen Id does not exist"));
};
