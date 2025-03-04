/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-04 12:41:41
 * @modify date 2021-11-04 12:41:41
 * @desc [description]
 */

import { NextFunction, Request, Response } from "express";
import { BadRequestError } from "rdcd-common";
import Container from "typedi";
import { SamityDocumentServices } from "../../services/init/init-samity-document.service";

const SamityDocumentService = Container.get(SamityDocumentServices);

export const samityDocumentExists = async (req: Request, res: Response, next: NextFunction) => {
  const id: number = Number(req.params.id);

  const count = await SamityDocumentService.idCheck(id);
  count ? next() : next(new BadRequestError("Samity Document Not Found"));
};

export const isDocumentExistInPayload = async (req: Request, res: Response, next: NextFunction) => {
  const nameOfTheFields = Object.keys(req.files as any);
  if (nameOfTheFields.length <= 1 && nameOfTheFields[0] == "documentName") {
    next();
  } else {
    next(new BadRequestError("ডকুমেন্ট সংযুক্ত করুন"));
  }
};
