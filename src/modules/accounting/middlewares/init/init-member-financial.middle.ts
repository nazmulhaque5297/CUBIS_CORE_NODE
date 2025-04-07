import { NextFunction, Request, Response } from "express";
import { BadRequestError } from "rdcd-common";
import Container from "typedi";
import { MemberFinancialServices } from "../../services/init/init-member-financial.service";

const MemberFinancialService = Container.get(MemberFinancialServices);

// check that is samityId is same or not for all object
// and check that is samityId is present on database
// need to implement is samityId can access by user

export const checkSamityIdForArrayObj = async (req: Request, res: Response, next: NextFunction) => {
  const dataArray = req.body;
  const erroArray: any = [];
  var isSameIds;

  isSameIds = await MemberFinancialService.sameNameIdCheck(dataArray, "samityId");
  if (!isSameIds[1]) {
    next(new BadRequestError(`samity ids are not same`));
  } else {
    for await (const element of dataArray) {
      const id = Number(element.samityId);
      const isExist = id ? await MemberFinancialService.samityIdExist(id) : false;

      if (!isExist) {
        erroArray.push(id);
      }
    }
    if (erroArray.length > 0) {
      next(new BadRequestError(`${erroArray} samity ids are not found`));
    } else {
      next();
    }
  }
};

// export const checkMemberId = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const dataArray = req.body;
//   const erroArray: any = [];
//   var isSameIds;
//   isSameIds = await MemberFinancialService.sameNameIdCheck(
//     dataArray,
//     "memberId"
//   );
//   if (isSameIds[0]) {
//     next(new BadRequestError(` Member ids can not be same`));
//   } else {
//     for await (const element of dataArray) {
//       const memberId = parseInt(element.memberId);
//       const samityId = parseInt(element.samityId);
//       const isExist = await MemberFinancialService.memberIdExist(
//         memberId,
//         samityId
//       );
//       if (isExist) {
//         erroArray.push(element.memberId);
//       }
//     }
//     if (erroArray.length > 0) {
//       next(
//         new BadRequestError(
//           `${erroArray}  1. memberIds ids are not found Or Samity Id is Not align With Member Id
//           2. Member Id is already present on Member Financial Database`
//         )
//       );
//     } else {
//       next();
//     }
//   }
// };

export const checkSamityId = async (req: Request, res: Response, next: NextFunction) => {
  if (req.body.samityId) {
    const id = Number(req.body.samityId);
    const isExist = id ? await MemberFinancialService.samityIdExist(id) : false;
    isExist ? next() : next(new BadRequestError("Samity id does not exist"));
  } else {
    const id = parseInt(req.params.samityId);
    const isExist = id ? await MemberFinancialService.samityIdExist(id) : false;
    isExist ? next() : next(new BadRequestError("Samity id does not exist"));
  }
};

export const checkMemberIdUpdate = async (req: Request, res: Response, next: NextFunction) => {
  const dataArray = req.body;
  const erroArray: any = [];
  var isSameIds;
  isSameIds = await MemberFinancialService.sameNameIdCheck(dataArray, "memberId");

  if (isSameIds[0]) {
    next(new BadRequestError(` Member ids can not be same`));
  } else {
    for await (const element of dataArray) {
      const memberId = parseInt(element.memberId);
      const samityId = parseInt(element.samityId);
      const isExist = await MemberFinancialService.memberIdExistUpdate(memberId, samityId);
      if (!isExist) {
        erroArray.push(element.memberId);
      }
    }
    if (erroArray.length > 0) {
      next(
        new BadRequestError(`${erroArray} member id is not found either member database or member financial database `)
      );
    } else {
      next();
    }
  }
};

export const checkMemberFinancialId = async (req: Request, res: Response, next: NextFunction) => {
  const dataArray = req.body;
  const erroArray: any = [];
  var isSameIds;
  isSameIds = await MemberFinancialService.sameNameIdCheck(dataArray, "id");
  if (isSameIds[0]) {
    next(new BadRequestError(` Member Financial Id can not be same`));
  } else {
    for await (const element of dataArray) {
      const memberFinancialId = parseInt(element.id);
      const isExist = await MemberFinancialService.memberFinancialIdExist(memberFinancialId);
      if (!isExist) {
        erroArray.push(element.memberFinancialId);
      }
    }
    if (erroArray.length > 0) {
      next(new BadRequestError(`${erroArray} member financial Id is not found `));
    } else {
      next();
    }
  }
};
