/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-01 13:42:21
 * @modify date 2021-11-01 13:42:21
 * @desc [description]
 */

import { NextFunction, Request, Response } from "express";
import { BadRequestError } from "rdcd-common";
import Container from "typedi";
import { MemberAddress, UpdateMemberDesignationAttrs } from "../../interfaces/init/init-member-info-interface";
import { InitialMemberInfoServices } from "../../services/init/init-member-info.service";

const InitalMemberInfoService = Container.get(InitialMemberInfoServices);

export const isMemberExistsCommitteeDesignation = async (
  req: Request<unknown, unknown, UpdateMemberDesignationAttrs>,
  res: Response,
  next: NextFunction
) => {
  const keys = Object.keys(req.body);
  for await (const key of keys) {
    const count = await InitalMemberInfoService.idCheck(req.body[key as keyof UpdateMemberDesignationAttrs]);
    count || next(new BadRequestError(`${key} is not exists in Member table`));
  }
  next();
};

export const memberExists = async (req: Request, res: Response, next: NextFunction) => {
  const id = parseInt(req.params.id);
  const count = await InitalMemberInfoService.idCheck(id);
  count || next(new BadRequestError("Member does not exist"));
  next();
};

// export const nidExist = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const pool = (await pgConnect.getConnection("master")).connect();

//   const nid = parseInt(req.body.nid);
//   const samityId = parseInt(req.body.samityId);
//   const isExist = nid
//     ? await isExistsByColumn(
//         "id",
//         "temps.member_info",
//         [
//           { name: "nid", value: nid },
//           { name: "samity_id", value: samityId },
//         ],
//         await pool
//       )
//     : false;
//   isExist
//     ? next(new BadRequestError("এন আইডি নম্বরটি ব্যবহৃত হচ্ছে "))
//     : next();
// };

// export const nidExistUpdate = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const id = parseInt(req.body.nid);
//   const memberId = parseInt(req.params.id);
//   const isOtherNidExists = await InitalMemberInfoService.nidExistUpdate(
//     id,
//     memberId
//   );
//   isOtherNidExists
//     ? next(new BadRequestError("New NID Is Exist in Database"))
//     : next();
// };

export const addressIdExists = async (req: Request, res: Response, next: NextFunction) => {
  const jsonPermanentAddress = JSON.parse(req.body.permanentAddress);
  const jsonPresentAddress = JSON.parse(req.body.presentAddress);
  const checkPermanentAddressId = await InitalMemberInfoService.checkAddressId(jsonPermanentAddress, "permanent");
  const checkPresentAddressId = await InitalMemberInfoService.checkAddressId(jsonPresentAddress, "present");

  if (!checkPermanentAddressId) {
    next(new BadRequestError("Permanent Address Id is not found in the database"));
  } else if (!checkPresentAddressId) {
    next(new BadRequestError("Present Address Id is not found in the database"));
  }

  next();
};

export const nullCheckOfAddress = async (req: Request, res: Response, next: NextFunction) => {
  const jsonpPrmanentAddress: MemberAddress = JSON.parse(req.body.permanentAddress);
  const jsonPresentAddress: MemberAddress = JSON.parse(req.body.presentAddress);
  if (jsonpPrmanentAddress.districtId == null || jsonpPrmanentAddress.districtId == undefined) {
    next(new BadRequestError("স্থায়ী ঠিকানা- জেলা নির্বাচন করুন"));
  } else {
    if (jsonPresentAddress.districtId == null || jsonPresentAddress.districtId == undefined) {
      next(new BadRequestError("স্থায়ী ঠিকানা- জেলা নির্বাচন করুন"));
    } else {
      next();
    }
  }
};

// export const memberIdExistsOnAdressType = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const id = Number(req.body.nid);
//   const isExist = id ? await InitalMemberInfoService.nidExist(id) : false;
//   isExist ? next(new BadRequestError("NID Already Exist in Database")) : next();
// };
