import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync.js";
import { paginated, sendSuccess } from "../utils/apiResponse.js";
import {
  buildPaginationMeta,
  parsePagination,
  textSearchFilter,
} from "../utils/pagination.js";
import Service from "../models/Service.model.js";
import AppError from "../utils/appError.js";
import { recordAudit } from "../services/auditLog.service.js";

export const listServices = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const search = textSearchFilter(req.query.search as string | undefined, [
    "name",
    "code",
  ]);
  const filter: Record<string, unknown> = {
    companyId: new mongoose.Types.ObjectId(req.authCompanyId!),
    deletedAt: { $exists: false },
  };
  if (req.query.status) filter.status = req.query.status;
  if (search) Object.assign(filter, search);

  const [items, total] = await Promise.all([
    Service.find(filter).skip(skip).limit(limit).sort({ name: 1 }),
    Service.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(page, limit, total));
});

export const createService = catchAsync(async (req, res) => {
  const s = await Service.create({
    ...req.body,
    companyId: new mongoose.Types.ObjectId(req.authCompanyId!),
  });
  await recordAudit({
    actorId: req.authUserId,
    action: "create",
    entityType: "service",
    entityId: String(s._id),
  });
  sendSuccess(res, s, 201);
});

export const getService = catchAsync(async (req, res) => {
  const s = await Service.findOne({
    _id: req.params.id,
    companyId: req.authCompanyId,
    deletedAt: { $exists: false },
  });
  if (!s) throw new AppError("Service not found", 404);
  sendSuccess(res, s);
});

export const updateService = catchAsync(async (req, res) => {
  const s = await Service.findOne({
    _id: req.params.id,
    companyId: req.authCompanyId,
    deletedAt: { $exists: false },
  });
  if (!s) throw new AppError("Service not found", 404);
  Object.assign(s, req.body);
  await s.save();
  await recordAudit({
    actorId: req.authUserId,
    action: "update",
    entityType: "service",
    entityId: String(s._id),
  });
  sendSuccess(res, s);
});

export const archiveService = catchAsync(async (req, res) => {
  const s = await Service.findOne({
    _id: req.params.id,
    companyId: req.authCompanyId,
  });
  if (!s) throw new AppError("Service not found", 404);
  s.status = "archived";
  s.deletedAt = new Date();
  await s.save();
  sendSuccess(res, { message: "Service archived" });
});
