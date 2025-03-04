import { NextFunction, Request, Response, Router } from "express";
import { validateRequest } from "rdcd-common";
import Container from "typedi";
import { validates } from "../../../../middlewares/express-validation.middle";
import { wrap } from "../../../../middlewares/wraps.middle";
import { auth } from "../../../user/middlewares/auth.middle";
import { officeHeadSelects } from "../services/officeHeadSelect.service";
import { validateOfficeHead } from "../validators/office-head-select.validator";

const router = Router();

const officeHeadSelect = Container.get(officeHeadSelects);


router.post(
  "/",
  auth(["*"]),
  validates(validateOfficeHead),
  wrap(async (req: Request, res: Response, next: NextFunction) => {
    const result = await officeHeadSelect.update(req.body, req.user);

    res.status(201).send({
      message: "সফল ভাবে তৈরী হয়েছে ",
      data: result,
    });
  })
);
export { router as officeHeadRouter };
