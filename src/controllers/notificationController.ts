import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync.js";
import { paginated, sendSuccess } from "../utils/apiResponse.js";
import {
  buildPaginationMeta,
  parsePagination,
} from "../utils/pagination.js";
import Notification from "../models/Notification.model.js";
import AppError from "../utils/appError.js";

export const listNotifications = catchAsync(async (req, res) => {
  if (!req.authUserId) throw new AppError("Not authenticated", 401);
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const filter = {
    companyId: new mongoose.Types.ObjectId(req.authCompanyId!),
    userId: new mongoose.Types.ObjectId(req.authUserId),
  };

  const [items, total] = await Promise.all([
    Notification.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Notification.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(page, limit, total));
});

export const markRead = catchAsync(async (req, res) => {
  if (!req.authUserId) throw new AppError("Not authenticated", 401);
  await Notification.updateOne(
    {
      _id: req.params.id,
      companyId: new mongoose.Types.ObjectId(req.authCompanyId!),
      userId: new mongoose.Types.ObjectId(req.authUserId),
    },
    { $set: { readAt: new Date() } },
  );
  sendSuccess(res, { message: "Updated" });
});

export const markAllRead = catchAsync(async (req, res) => {
  if (!req.authUserId) throw new AppError("Not authenticated", 401);
  await Notification.updateMany(
    {
      companyId: new mongoose.Types.ObjectId(req.authCompanyId!),
      userId: new mongoose.Types.ObjectId(req.authUserId),
      readAt: { $exists: false },
    },
    { $set: { readAt: new Date() } },
  );
  sendSuccess(res, { message: "All read" });
});
