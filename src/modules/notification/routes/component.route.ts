/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-06-19 14:55:43
 * @modify date 2022-06-19 14:55:43
 * @desc [description]
 */

import { Request, Response, Router } from "express";
import nodemailer from "nodemailer";
import Container from "typedi";
import { validates } from "../../../middlewares/express-validation.middle";
import { wrap } from "../../../middlewares/wraps.middle";
import { dynamicAuthorization } from "../../../modules/coop/coop/middlewares/coop/application/application.middle";
import { ComponentNotificationService } from "../services/component.service";
import { componentValidation, componentValidationRead } from "../validators/component.validation";

const router = Router();

// notification
router.get(
  "/component",
  [dynamicAuthorization, validates(componentValidation)],
  wrap(async (req: Request, res: Response) => {
    const userId = req.user.userId || req.user.userId;
    const componentId = req.user.componentId;
    const userType = req.user.type;
    const readStatus = req.query.readStatus as unknown as boolean;

    const componentNotification = Container.get(ComponentNotificationService);
    const data = await componentNotification.getNotificationById(userId, userType, componentId, readStatus);

    res.status(200).send({
      message: "request successful",
      data,
    });
  })
);

//notification read
router.get(
  "/component/read/:id",
  [dynamicAuthorization, validates(componentValidationRead)],
  wrap(async (req: Request, res: Response) => {
    const userId = req.user.userId || req.user.userId;
    const userType = req.user.type;
    const componentNotification = Container.get(ComponentNotificationService);
    const data = await componentNotification.read(req.params.id as unknown as number, userType, userId);

    res.status(200).send({
      message: "request successful",
      data,
    });
  })
);

router.get(
  "/send-email",
  wrap(async (req: Request, res: Response) => {
    let transporter = nodemailer.createTransport({
      host: "smtp.mail.rdcd.gov.bd",
      port: 587,
      secure: false,
      auth: {
        user: "info@rdcd.gov.bd",
        pass: "Rdcd@2023",
      },
    });

    transporter.verify(function (error, success) {
      if (error) {
        console.log(error);
      } else {
        console.log("Server is ready to take our messages");
      }
    });

    res.status(200).send({
      message: "request successful",
    });
  })
);

export { router as componentNotificationRouter };
