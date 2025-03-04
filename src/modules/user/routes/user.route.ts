import express, { NextFunction, Request, Response, Router } from "express";
import { orderBy } from "lodash";
import { BadRequestError, NotFoundError, Paginate } from "rdcd-common";
import Container from "typedi";
import { getComponentId } from "../../../configs/app.config";
import { ComponentType } from "../../../interfaces/component.interface";
import { wrap } from "../../../middlewares/wraps.middle";
import { dynamicAuthorization } from "../../../modules/coop/coop/middlewares/coop/application/application.middle";
import { getLongLivedToken } from "../../../utils/jwt.util";
import { CitizenRoleFeatureServices } from "../../coop/citizen/services/citizen-role-feature.service";
import { CitizenRoleServices } from "../../coop/citizen/services/citizen-role.service";
import CitizenServices from "../../coop/citizen/services/citizen.service";
import { OfficeDesignationService } from "../../master/services/office-designation.service";
import { OfficeInfoServices } from "../../master/services/office-info.service";
import ProjectService from "../../master/services/project.service";
import { auth } from "../middlewares/auth.middle";
import ssoAuth from "../middlewares/sso-auth.middle";
import { UserSSOServices } from "../services/user-sso.service";
import UserService from "../services/user.service";
const CitizenRoleService = Container.get(CitizenRoleServices);
const router: Router = express.Router();

/**
 * Single sign from dashboard engine
 * Business Logic
 * 1. this route will hit dashboard service and get the user details from there.
 * 2. it will upsert based on the role provided from the dashboard.
 */

router.post(
  "/signon/:component",
  [ssoAuth],
  wrap(async (req: Request<{ component: ComponentType }>, res: Response, next: NextFunction) => {
    const userSSOService = Container.get(UserSSOServices);
    const userServices = Container.get(UserService);
    const isUserExists = await userSSOService.checkUserExistsById(req.user.username);
    const componentId = getComponentId(req.params.component);
    let user: any;
    let menu: any;
    let officeInfo: any = {};
    let designation: any;

    if (req.user.is_beneficiary) {
      //*********************** */ it for beneficiary ***************************
      if (!isUserExists) {
        user = await userSSOService.insertUser(req.user, componentId);
      } else {
        user = await userSSOService.updateUser(req.user, componentId);
      }
      const CitizenRoleFeatureService = Container.get(CitizenRoleFeatureServices);
      const CitizenService = Container.get(CitizenServices);
      const isAuthorizedPerson = await CitizenService.isAuthorizedPerson(
        req?.user?.id,
        req?.user?.nid,
        req?.user?.brn,
        req?.user?.beneficiary?.local_id
      );

      const accessToken = await getLongLivedToken(
        {
          userId: req.user.id,
          name: req.user.name,
          presentAddress: null,
          nameBangla: req.user.nameBangla,
          type: "citizen",
          isAuthorizedPerson,
          nid: "",
          mobile: req.user.mobile,
          dob: req.user.beneficiary.dob,
          email: req.user.email,
          doptorId: req.user.beneficiary.origin_doptor.id,
          componentId: 2,
        },
        "120h",
        "citizen"
      );

      const role = isAuthorizedPerson
        ? await CitizenRoleService.getCitizenRoleByRoleName("AUTHORIZED_PERSON", req.user.beneficiary.origin_doptor.id)
        : await CitizenRoleService.getCitizenRoleByRoleName("ORGANIZER", req.user.beneficiary.origin_doptor.id);

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
          type: "citizen",
        },
      });
    } else {
      //************************* */ it for back office *************************
      if (req?.user?.office?.id) {
        const officeInfoService = Container.get(OfficeInfoServices);

        officeInfo = await officeInfoService.getById(req.user.office.id); //geocode of the office
      }
      if (req?.user?.employee?.designation?.id) {
        const designationService = Container.get(OfficeDesignationService);
        try {
          designation = await designationService.getDesignationById(req.user.employee.designation.id);
        } catch (error) {
          throw new BadRequestError("ব্যবহারকারীর পদবি বিদ্যমান নেই");
        }
      }
      if (!isUserExists) {
        user = await userSSOService.insertUser(req.user, componentId);
      } else {
        user = await userSSOService.updateUser(req.user, componentId);
      }
      if (user) {
        const { menus: m } = await userServices.getFeatureByUser(user.id, componentId, user.doptorId);
        menu = m;
      }

      const projectService: ProjectService = Container.get(ProjectService);
      const projects = await projectService.getUserWiseProject(user.doptorId, user.id);
      const doptorConfigInfo = await userServices.getDoptorConfigInfo(user.doptorId);
      const projectData = projects.map((p: any) => p.projectId);

      const accessToken = await getLongLivedToken(
        {
          userId: user.id,
          name: user.name,
          username: user.username,
          designationNameBn: designation.nameBn,
          designationNameEn: designation.nameEn,
          doptorId: user.doptorId,
          officeId: user.officeId,
          officeNameBn: officeInfo.nameBn,
          officeNameEn: officeInfo.nameEn,
          layerId: user.layerId,
          originId: user.originId,
          employeeId: user.employeeId,
          designationId: user.designationId,
          divisionId: officeInfo.divisionId,
          districtId: officeInfo.districtId,
          upazilaId: officeInfo.upazilaId,
          upaCityType: officeInfo.upaCityType,
          isProjectAllow: doptorConfigInfo.isProjectAllow,
          projects: projectData,
          type: "user",
          componentId,
        },
        "12h",
        "app"
      );

      res.status(200).send({
        message: "Request successful",
        data: {
          accessToken,
          menu,
          geoCode: {
            id: user.officeId,
            divisionId: officeInfo.divisionId,
            districtId: officeInfo.districtId,
            upazilaId: officeInfo.upazilaId,
            upaCityType: officeInfo.upaCityType,
            nameBn: officeInfo.nameBn,
          },
          doptorId: user.doptorId,
          username: user.name,
          isProjectAllow: doptorConfigInfo.isProjectAllow,
          officeId: user.officeId,
          layerId: user.layerId,
        },
      });
    }
  })
);

/**
 * user approval by id
 * authId: 2.1
 */
router.put(
  "/approve/:id",
  // [devAuth],
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const userService: UserService = Container.get(UserService);
    const result: any = await userService.updateUserApproval(parseInt(req.params.id), {
      ...req.body,
      approvedBy: req.user.userId,
      approveDate: new Date(),
    });
    return res.status(200).json({
      message: "Request Successful",
      data: {
        id: result ? result.id : null,
      },
    });
  })
);

/**
 * get user list with pagination and filter
 * authId: 2.2
 */
router.get(
  "/",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const userService: UserService = Container.get(UserService);
    const page: number = Number(req.query.page);
    const limit: number = Number(req.query.limit);
    const allQuery: any = req.query;
    const isPagination = req.query.isPagination && req.query.isPagination == "false" ? false : true;
    delete allQuery.page;
    delete allQuery.limit;
    delete allQuery.isPagination;
    const count: number = await userService.count(allQuery);
    const pagination = new Paginate(count, limit, page);

    const result = await userService.get(
      isPagination,
      pagination.limit,
      pagination.skip,
      allQuery,
      Number(req.user.officeId)
    );
    return res.status(200).json({
      message: "Request Successful",
      ...(isPagination ? pagination : []),
      data: result,
    });
  })
);

// router.get(
//   "/auth/authorization",
//   auth(["*"]),
//   wrap(async (req: Request, res: Response, next: NextFunction) => {
//     const componentId = req.user.componentId
//     const userService: UserService = Container.get(UserService);
//     const result: any = await userService.isAuthorized(req.query.url as string, req.user.userId, componentId);
//     return res.status(200).json({
//       message: "Request Successful",
//       data: result,
//     });
//   })
// );

// ************************ autorization* added by Hasib, Hrithik, Adnan ************************
router.get(
  "/auth/authorization",
  dynamicAuthorization,
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const userService: UserService = Container.get(UserService);

    const componentId = req.user.componentId;
    const doptorId = req.user.doptorId;

    const userOruserId = req?.user?.userId ? req?.user?.userId : req?.user?.userId;
    const result: any = await userService.isAuthorized(
      req.query.url as string,
      userOruserId,
      componentId,
      req?.user?.type,
      req?.user?.isAuthorizedPerson,
      doptorId
    );

    return res.status(200).json({
      message: "Request Successful",
      data: result,
    });
  })
);
/**
 * temporary login api for users
 */
router.post(
  "/login/:component",
  wrap(async (req: Request<{ component: ComponentType }>, res: Response, next: NextFunction) => {
    const { username, password } = req.body;
    const userService = Container.get(UserService);
    const componentId = getComponentId(req.params.component);

    if (!password) {
      throw new BadRequestError("Invalid password");
    }

    // response variables
    let accessToken: string | null = null;
    let features: any = [];
    let geoCode: any = {};
    let designation: any;
    const user = await userService.getByUsername(username);

    if (!user) {
      throw new NotFoundError("User not found");
    } else {
      // check the user is active or not
      if (user.officeId && user.doptorId && user.designationId && user.employeeId && user.isActive) {
        // get the user role
        const { menus } = await userService.getFeatureByUser(user.id, componentId, user.doptorId);

        if (user.officeId) {
          const officeInfoService = Container.get(OfficeInfoServices);

          geoCode = await officeInfoService.getById(user.officeId); //geocode of the office
        }

        if (user.designationId) {
          const designationService = Container.get(OfficeDesignationService);
          designation = await designationService.getDesignationById(user.designationId);
        }

        const projectService: ProjectService = Container.get(ProjectService);
        const projects = await projectService.getUserWiseProject(user.doptorId, user.id);
        const projectData = projects.map((p: any) => p.projectId);
        const doptorConfigInfo = await userService.getDoptorConfigInfo(user.doptorId);
        accessToken = await getLongLivedToken(
          {
            userId: user.id,
            name: user.name,
            username: user.username,
            doptorId: user.doptorId,
            officeId: user.officeId,
            layerId: user.layerId,
            originId: user.originId,
            employeeId: user.employeeId,
            designationId: user.designationId,
            designationNameBn: designation.nameBn,
            designationNameEn: designation.nameEn,
            divisionId: geoCode.divisionId,
            districtId: geoCode.districtId,
            upazilaId: geoCode.upazilaId,
            isProjectAllow: doptorConfigInfo.isProjectAllow,
            projects: projectData,
            type: "user",
            componentId,
          },

          "250h",
          "app"
        );

        // provide response
        return res.status(200).json({
          message: "Request Successful",
          data: {
            accessToken,
            needPermission: false,
            menu: menus,
            geoCode,
            doptorId: user.doptorId,
            username: user.name,
            isProjectAllow: doptorConfigInfo.isProjectAllow,
            officeId: user.officeId,
            layerId: user.layerId,
          },
        });
      }
      // response for inactive users
      return res.status(200).json({
        message: "Request Successful",
        data: {
          accessToken: accessToken,
          needPermission: true,
          features: features,
        },
      });
    }
  })
);

/**
 * get user details by id
 * authId: 2.2
 */
router.get(
  "/:id",
  auth(["*"]),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const userService: UserService = Container.get(UserService);
    const result: any = await userService.getById(parseInt(req.params.id), parseInt(req.user.officeId));
    return res.status(200).json({
      message: "Request Successful",
      data: result ?? null,
    });
  })
);

export default router;
