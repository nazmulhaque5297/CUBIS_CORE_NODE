import { NextFunction, Request, Response } from "express";
import { AuthError } from "rdcd-common";
import Container from "typedi";
import { getComponentId, getDashboardClientCreds } from "../../../configs/app.config";
import { ComponentType } from "../../../interfaces/component.interface";
import { UserSSOServices } from "../services/user-sso.service";

/**
 * middleware to check the user token and get users from dashboard and if the user role is null we send 401 error
 * @param req
 * @param res
 * @param next
 */
export default async function ssoAuth(req: Request<{ component: ComponentType }>, res: Response, next: NextFunction) {
  const token: string | undefined = req.header("Authorization")?.replace("Bearer ", "");

  if (token) {
    try {
      const userSSOService = Container.get(UserSSOServices);
      let payload = await userSSOService.getUser(token);
      if (!payload.is_beneficiary) {
        const dashboardClientId = getDashboardClientCreds(req.params.component).dashboardClientId;
        const componentId = getComponentId(req.params.component);
        payload.roles = payload.roles.hasOwnProperty(dashboardClientId) ? [...payload.roles[dashboardClientId]] : [];

        //we dont want users without roles
        if (payload && payload.roles && !payload.roles.length) {
          next(new AuthError("ব্যবহারকারীর রোল বিদ্যমান নেই"));
        } else {
          const roles = await userSSOService.checkRoleExists(payload.roles, componentId);
          payload.roles = roles;
        }
      }
      req.user = payload;
      next();
    } catch (ex) {
      next(new AuthError("Invalid Token"));
    }
  } else next(new AuthError("No Bearer Token Found"));
}
