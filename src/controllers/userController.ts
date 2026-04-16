import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync.js";
import { paginated, sendSuccess } from "../utils/apiResponse.js";
import {
  buildPaginationMeta,
  parsePagination,
  textSearchFilter,
} from "../utils/pagination.js";
import User from "../models/User.model.js";
import * as authService from "../services/auth.service.js";
import { defaultPermissionsForRole, mergePermissionOverrides } from "../constants/permissions.js";
import AppError from "../utils/appError.js";
import { recordAudit } from "../services/auditLog.service.js";
import type { UserRole } from "../types/user.js";

export const listUsers = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const search = textSearchFilter(req.query.search as string | undefined, [
    "firstName",
    "lastName",
    "email",
  ]);
  const filter: Record<string, unknown> = { deletedAt: { $exists: false } };
  if (search) Object.assign(filter, search);

  const [rows, total] = await Promise.all([
    User.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  paginated(
    res,
    rows.map((u) => authService.sanitizeUser(u)),
    buildPaginationMeta(page, limit, total),
  );
});

export const getUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.deletedAt) throw new AppError("User not found", 404);
  sendSuccess(res, authService.sanitizeUser(user));
});

export const createStaff = catchAsync(async (req, res) => {
  if (!req.authUserId) throw new AppError("Not authenticated", 401);
  const result = await authService.createStaffUser({
    invitedBy: new mongoose.Types.ObjectId(req.authUserId),
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    role: req.body.role as UserRole,
    permissionOverrides: req.body.permissionOverrides,
    department: req.body.department,
    jobTitle: req.body.jobTitle,
  });
  sendSuccess(res, result, 201);
});

export const updateUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.deletedAt) throw new AppError("User not found", 404);

  if (req.body.firstName !== undefined) user.firstName = req.body.firstName;
  if (req.body.lastName !== undefined) user.lastName = req.body.lastName;
  if (req.body.phone !== undefined) user.phone = req.body.phone;
  if (req.body.department !== undefined) user.department = req.body.department;
  if (req.body.jobTitle !== undefined) user.jobTitle = req.body.jobTitle;
  if (req.body.notificationPreferences !== undefined) {
    user.notificationPreferences = req.body.notificationPreferences;
  }

  await user.save();

  await recordAudit({
    actorId: req.authUserId,
    action: "update",
    entityType: "user",
    entityId: String(user._id),
  });

  sendSuccess(res, authService.sanitizeUser(user));
});

export const assignRole = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.deletedAt) throw new AppError("User not found", 404);
  if (user.isOwner) throw new AppError("Cannot change owner role", 400);

  const role = req.body.role as UserRole;
  const base = defaultPermissionsForRole(role);
  user.role = role;
  user.permissions = mergePermissionOverrides(base, req.body.permissionOverrides);
  await user.save();

  await recordAudit({
    actorId: req.authUserId,
    action: "update",
    entityType: "user",
    entityId: String(user._id),
    metadata: { role },
  });

  sendSuccess(res, authService.sanitizeUser(user));
});

export const setStatus = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.deletedAt) throw new AppError("User not found", 404);
  if (user.isOwner) throw new AppError("Cannot change owner status", 400);

  user.status = req.body.status;
  await user.save();

  await recordAudit({
    actorId: req.authUserId,
    action: "update",
    entityType: "user",
    entityId: String(user._id),
    metadata: { status: user.status },
  });

  sendSuccess(res, authService.sanitizeUser(user));
});

export const softDeleteUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.deletedAt) throw new AppError("User not found", 404);
  if (user.isOwner) {
    const owners = await User.countDocuments({
      isOwner: true,
      deletedAt: { $exists: false },
    });
    if (owners <= 1) throw new AppError("Cannot remove the only owner", 400);
  }

  user.status = "deleted";
  user.deletedAt = new Date();
  await user.save();

  await recordAudit({
    actorId: req.authUserId,
    action: "delete",
    entityType: "user",
    entityId: String(user._id),
  });

  sendSuccess(res, { message: "User removed" });
});
