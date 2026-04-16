import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync.js";
import { paginated, sendSuccess } from "../utils/apiResponse.js";
import {
  buildPaginationMeta,
  parsePagination,
  textSearchFilter,
} from "../utils/pagination.js";
import Product from "../models/Product.model.js";
import AppError from "../utils/appError.js";
import { recordAudit } from "../services/auditLog.service.js";

export const listProducts = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const search = textSearchFilter(req.query.search as string | undefined, [
    "name",
    "sku",
    "barcode",
  ]);
  const filter: Record<string, unknown> = {
    companyId: new mongoose.Types.ObjectId(req.authCompanyId!),
    deletedAt: { $exists: false },
  };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.lowStock === "true") {
    filter.$expr = { $lte: ["$stockOnHand", "$reorderLevel"] };
  }
  if (search) Object.assign(filter, search);

  const [items, total] = await Promise.all([
    Product.find(filter).skip(skip).limit(limit).sort({ name: 1 }),
    Product.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(page, limit, total));
});

export const createProduct = catchAsync(async (req, res) => {
  const p = await Product.create({
    ...req.body,
    companyId: new mongoose.Types.ObjectId(req.authCompanyId!),
  });
  await recordAudit({
    actorId: req.authUserId,
    action: "create",
    entityType: "product",
    entityId: String(p._id),
  });
  sendSuccess(res, p, 201);
});

export const getProduct = catchAsync(async (req, res) => {
  const p = await Product.findOne({
    _id: req.params.id,
    companyId: req.authCompanyId,
    deletedAt: { $exists: false },
  });
  if (!p) throw new AppError("Product not found", 404);
  sendSuccess(res, p);
});

export const updateProduct = catchAsync(async (req, res) => {
  const p = await Product.findOne({
    _id: req.params.id,
    companyId: req.authCompanyId,
    deletedAt: { $exists: false },
  });
  if (!p) throw new AppError("Product not found", 404);
  Object.assign(p, req.body);
  await p.save();
  await recordAudit({
    actorId: req.authUserId,
    action: "update",
    entityType: "product",
    entityId: String(p._id),
  });
  sendSuccess(res, p);
});

export const archiveProduct = catchAsync(async (req, res) => {
  const p = await Product.findOne({
    _id: req.params.id,
    companyId: req.authCompanyId,
  });
  if (!p) throw new AppError("Product not found", 404);
  p.status = "archived";
  p.deletedAt = new Date();
  await p.save();
  await recordAudit({
    actorId: req.authUserId,
    action: "delete",
    entityType: "product",
    entityId: String(p._id),
  });
  sendSuccess(res, { message: "Product archived" });
});
