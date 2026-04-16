import type { RequestHandler } from "express";
import type { UserPermissions } from "../types/user.js";
import AppError from "../utils/appError.js";

export const requirePermission = (
  key: keyof UserPermissions,
): RequestHandler => {
  return (req, _res, next) => {
    if (req.authPermissions?.[key] !== true) {
      next(new AppError("You do not have permission for this action", 403));
      return;
    }
    next();
  };
};

export const requireAnyPermission = (
  ...keys: (keyof UserPermissions)[]
): RequestHandler => {
  return (req, _res, next) => {
    const allowed = keys.some((key) => req.authPermissions?.[key] === true);
    if (!allowed) {
      next(new AppError("You do not have permission for this action", 403));
      return;
    }
    next();
  };
};

export const requireAnyRole = (...roles: string[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.authRole || !roles.includes(req.authRole)) {
      next(new AppError("You do not have permission for this action", 403));
      return;
    }
    next();
  };
};
