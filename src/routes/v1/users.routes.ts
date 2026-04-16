import { Router } from "express";
import * as ctrl from "../../controllers/userController.js";
import { protect } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permission.js";
import { validate } from "../../middleware/validate.js";
import { requireFields } from "../../middleware/validate.js";
import AppError from "../../utils/appError.js";
import type { RequestHandler } from "express";

const validRole: RequestHandler = (req, _res, next) => {
  const allowed = [
    "admin",
    "manager",
    "sales",
    "inventory",
    "accountant",
    "support",
    "viewer",
  ];
  if (!allowed.includes(req.body.role)) {
    next(new AppError("Invalid role", 400));
    return;
  }
  next();
};

const r = Router();
r.use(protect);

r.get("/", requirePermission("canManageUsers"), ctrl.listUsers);
r.post(
  "/",
  requirePermission("canManageUsers"),
  requireFields("firstName", "lastName", "email", "role"),
  validRole,
  validate,
  ctrl.createStaff,
);
r.get("/:id", requirePermission("canManageUsers"), ctrl.getUser);
r.patch("/:id", requirePermission("canManageUsers"), ctrl.updateUser);
r.patch(
  "/:id/role",
  requirePermission("canManageUsers"),
  requireFields("role"),
  validRole,
  validate,
  ctrl.assignRole,
);
r.patch(
  "/:id/status",
  requirePermission("canManageUsers"),
  requireFields("status"),
  validate,
  ctrl.setStatus,
);
r.delete("/:id", requirePermission("canManageUsers"), ctrl.softDeleteUser);

export default r;
