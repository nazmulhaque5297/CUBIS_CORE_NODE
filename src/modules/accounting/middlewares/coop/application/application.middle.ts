import { NextFunction, Request, Response } from "express";
import { AuthError, BadRequestError } from "rdcd-common";
import Container from "typedi";
import { citizenAuth } from "../../../../../../modules/coop/citizen/middlewares/citizen-auth.middle";
import { ApplicationServices } from "../../../../../../modules/coop/coop/services/application.service";
import { auth, tokenVerification } from "../../../../../../modules/user/middlewares/auth.middle";

const ApplicationService = Container.get(ApplicationServices);

export const isDesignationHeadExist = async (req: Request, res: Response, next: NextFunction) => {
  const count = await ApplicationService.countHeadDesingnation(parseInt(req.params.id));

  if (count > 1) {
    next(new BadRequestError("More than one Designation Head exist"));
  } else if (count == 0) {
    next(new BadRequestError("No Designation Head is exist"));
  } else {
    next();
  }
};

export async function dynamicAuthorization(req: Request, res: Response, next: NextFunction) {
  const token: string | undefined = req.header("Authorization")?.replace("Bearer ", "");
  const type: string = req.params.type as string;

  if (await tokenVerification(token, "citizen")) {
    return citizenAuth(["*"])(req, res, next);
  } else if (await tokenVerification(token, "auth")) {
    return auth(["*"])(req, res, next);
  } else {
    return next(new AuthError("Token is not valid"));
  }
}

export async function dynamicAuthorizationOrNoAuth(req: Request, res: Response, next: NextFunction) {
  const token: string | undefined = req.header("Authorization")?.replace("Bearer ", "");
  const type: string = req.params.type as string;

  if (await tokenVerification(token, "citizen")) {
    return citizenAuth(["*"])(req, res, next);
  } else if (await tokenVerification(token, "auth")) {
    return auth(["*"])(req, res, next);
  } else {
    req.user = {
      userId: null,
      type: "anonymous",
    };
    return next();
  }
}
