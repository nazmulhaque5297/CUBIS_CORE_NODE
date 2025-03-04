/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-17 14:31:37
 * @modify date 2021-11-17 14:31:37
 * @desc [description]
 */

import { NextFunction, Request, Response } from "express";
import { BadRequestError } from "rdcd-common";
import Container from "typedi";
import { InitialCommitteeRegistrationServices } from "../../services/init/init-committee-registration.service";

const InitCommitteeRegistrationService = Container.get(InitialCommitteeRegistrationServices);

export const initCommitteeTypeCheck = async (req: Request, res: Response, next: NextFunction) => {
  const samityId = parseInt(req.body.samityId);
  const isExist = await InitCommitteeRegistrationService.committeeTypeCheck(samityId);

  isExist ? next(new BadRequestError("সমিতিটির জন্য কমিটি রয়েছে ")) : next();
};

export const initCommitteeCheck = async (req: Request, res: Response, next: NextFunction) => {
  const samityId = parseInt(req.params.id);
  const isExist = await InitCommitteeRegistrationService.committeeTypeCheck(samityId);
  isExist
    ? next()
    : res.status(200).send({
        message: "request successful",
        data: [],
      });
};
