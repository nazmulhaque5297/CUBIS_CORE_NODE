/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2021-11-24 16:12:29
 * @modify date 2021-11-24 16:12:29
 * @desc [description]
 */

import { NextFunction, Request, Response, Router } from "express";
import { toCamelKeys } from "keys-transform";
import { omit, orderBy } from "lodash";
import { BadRequestError, NotFoundError } from "rdcd-common";
import Container from "typedi";
import { getCode } from "../../../../configs/auth.config";
import { validates } from "../../../../middlewares/express-validation.middle";
import { wrap } from "../../../../middlewares/wraps.middle";
import { auth } from "../../../../modules/user/middlewares/auth.middle";
import { getLongLivedToken } from "../../../../utils/jwt.util";
import { CitizenAttrs } from "../interfaces/citizen.interface";
import { checkCitizenExists } from "../middlewares/citizen.middle";
import { ssoAuthCitizen } from "../middlewares/sso-auth-citizen.middle";
import { CitizenRoleFeatureServices } from "../services/citizen-role-feature.service";
import { CitizenRoleServices } from "../services/citizen-role.service";
import CitizenServices from "../services/citizen.service";
import { extractCitizenInfo, extractDiffCitizen } from "../utils/citizen.util";
import { getCitizenWithFilter } from "../validators/citizen.validator";

const router = Router();
const CitizenService = Container.get(CitizenServices);
const CitizenRoleService = Container.get(CitizenRoleServices);

router.post(
  "/signon",
  [ssoAuthCitizen],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    // this api work only for doptor 3 in serveice.gov.bd
    const tokenData: any = toCamelKeys(req.user);
    const { id } = tokenData;
    const CitizenRoleFeatureService = Container.get(CitizenRoleFeatureServices);
    let accessToken: string | null = null;
    let citizen = id && ((await CitizenService.getCitizenByMyGovId(id)) as CitizenAttrs);

    if (citizen) {
      const diff = extractDiffCitizen(citizen, tokenData);
      citizen = await CitizenService.update(diff);
    } else {
      const extractedCitizenInfo = extractCitizenInfo(tokenData);
      citizen = await CitizenService.create(extractedCitizenInfo);
    }
    const isAuthorizedPerson = await CitizenService.isAuthorizedPerson(
      citizen.id,
      citizen.nid,
      citizen.brn,
      citizen.memberId
    );

    accessToken = await getLongLivedToken(
      {
        userId: citizen.id,
        name: citizen.name,
        presentAddress: citizen.presentAddress,
        nameBangla: citizen.nameBangla,
        type: "citizen",
        isAuthorizedPerson,
        nid: citizen.nid,
        mobile: citizen.mobile,
        dob: citizen.dob,
        email: citizen.email,
        doptorId: 3, //this doptor is fixed for doptor 3 in service.gov.bd
        componentId: 2, //this componentId is fixed for doptor 3 in service.gov.bd
      },
      "120h",
      "citizen"
    );

    const role = isAuthorizedPerson
      ? await CitizenRoleService.getCitizenRoleByRoleName("AUTHORIZED_PERSON", 3)
      : await CitizenRoleService.getCitizenRoleByRoleName("ORGANIZER", 3);

    const menu = role ? await CitizenRoleFeatureService.getRoleFeature(Number(role.id)) : [];

    return res.status(200).json({
      message: "Request Successful",
      data: {
        accessToken: accessToken,
        needPermission: false,
        menu: orderBy(menu, ["id"], ["asc"]),
      },
    });
  })
);

router.get(
  "/",
  [auth([getCode("GET_CITIZEN")]), validates(getCitizenWithFilter)],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const filter = omit(req.query, ["page", "limit"]);
    const result = await CitizenService.get(req.query.page as any, req.query.limit as any, { ...(filter as any) });
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

router.get(
  "/:id",
  auth([getCode("GET_CITIZEN")]),
  checkCitizenExists,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const citizen = await CitizenService.getById(parseInt(req.params.id));
    return res.status(200).json({
      message: "Request Successful",
      data: citizen,
    });
  })
);

router.post(
  "/login",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, doptorId } = req.body;

    if (!password) {
      throw new BadRequestError("Invalid password");
    }

    if (!doptorId) {
      throw new BadRequestError("Select Doptor");
    }

    const CitizenRoleFeatureService = Container.get(CitizenRoleFeatureServices);

    const citizen = await CitizenService.getByUserName(email);

    if (!citizen) {
      throw new NotFoundError("Citizen not found");
    }

    const isAuthorizedPerson = await CitizenService.isAuthorizedPerson(
      citizen.id,
      citizen.nid,
      citizen.brn,
      citizen.memberId
    );
    const accessToken = await getLongLivedToken(
      {
        userId: citizen.id,
        name: citizen.name,
        presentAddress: citizen.presentAddress,
        nameBangla: citizen.nameBangla,
        type: "citizen",
        isAuthorizedPerson,
        nid: citizen.nid,
        mobile: citizen.mobile,
        dob: citizen.dob,
        email: citizen.email,
        doptorId,
        componentId: 2,
      },
      "12h",
      "citizen"
    );
    const role = isAuthorizedPerson
      ? await CitizenRoleService.getCitizenRoleByRoleName("AUTHORIZED_PERSON", doptorId)
      : await CitizenRoleService.getCitizenRoleByRoleName("ORGANIZER", doptorId);

    const menu = role ? await CitizenRoleFeatureService.getRoleFeature(Number(role.id)) : [];

    // const features = isAuthorizedPerson
    //   ? ((await CitizenRoleService.getFeatureByName("AUTHORIZED_PERSON")) as IFeatureAttrs[])
    //   : ((await CitizenRoleService.getFeatureByName("ORGANIZER")) as IFeatureAttrs[]);

    return res.status(200).json({
      message: "Request Successful",
      data: {
        accessToken: accessToken,
        needPermission: false,
        menu: orderBy(menu, ["id"], ["asc"]),
      },
    });
  })
);

router.get(
  "/doptor/info",
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const filter = omit(req.query, ["page", "limit"]);
    const result = await CitizenService.getDoptor();
    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);

export { router as citizenRouter };
