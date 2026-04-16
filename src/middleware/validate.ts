import type { RequestHandler } from "express";
import AppError from "../utils/appError.js";

export const validate: RequestHandler = (_req, _res, next) => {
  next();
};

export const requireFields =
  (...fields: string[]): RequestHandler =>
  (req, _res, next) => {
    for (const f of fields) {
      if (req.body[f] === undefined || req.body[f] === "") {
        next(new AppError(`Missing required field: ${f}`, 400));
        return;
      }
    }
    next();
  };
