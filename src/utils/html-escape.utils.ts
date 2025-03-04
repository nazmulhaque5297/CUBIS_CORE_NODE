import { NextFunction, Request, Response } from "express";
import _ from "underscore";

export function requestBodyHTMLEscape(
  req: Request,
  res: Response,
  next: NextFunction
) {
  for (const [key, value] of Object.entries(req.body)) {
    if (typeof value === "string" && key !== "password")
      req.body[key] = _.escape(_.unescape(value.trim()));
  }

  for (const [key, value] of Object.entries(req.params)) {
    if (typeof value === "string")
      req.params[key] = _.escape(_.unescape(value.trim()));
  }

  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === "string")
      req.query[key] = _.escape(_.unescape(value.trim()));
  }

  next();
}
