import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync.js";
import { paginated, sendSuccess } from "../utils/apiResponse.js";
import {
  buildPaginationMeta,
  parsePagination,
} from "../utils/pagination.js";
import InventoryMovement from "../models/InventoryMovement.model.js";
import Product from "../models/Product.model.js";
import { applyStockChange } from "../services/inventory.service.js";
import type { InventoryMovementType } from "../types/domain.js";

const companyOid = (req: { authCompanyId?: string }) =>
  new mongoose.Types.ObjectId(req.authCompanyId!);

export const stockIn = catchAsync(async (req, res) => {
  await applyStockChange({
    companyId: companyOid(req),
    productId: new mongoose.Types.ObjectId(req.body.productId),
    quantityDelta: Math.abs(req.body.quantity),
    type: "stock_in",
    unitCost: req.body.unitCost,
    batchNumber: req.body.batchNumber,
    expiryDate: req.body.expiryDate
      ? new Date(req.body.expiryDate)
      : undefined,
    referenceType: req.body.referenceType,
    referenceId: req.body.referenceId,
    notes: req.body.notes,
    createdBy: req.authUserId
      ? new mongoose.Types.ObjectId(req.authUserId)
      : undefined,
    actorId: req.authUserId,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
  sendSuccess(res, { message: "Stock updated" }, 201);
});

export const stockOut = catchAsync(async (req, res) => {
  await applyStockChange({
    companyId: companyOid(req),
    productId: new mongoose.Types.ObjectId(req.body.productId),
    quantityDelta: -Math.abs(req.body.quantity),
    type: "stock_out",
    referenceType: req.body.referenceType,
    referenceId: req.body.referenceId,
    notes: req.body.notes,
    createdBy: req.authUserId
      ? new mongoose.Types.ObjectId(req.authUserId)
      : undefined,
    actorId: req.authUserId,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
  sendSuccess(res, { message: "Stock updated" }, 201);
});

export const adjustStock = catchAsync(async (req, res) => {
  await applyStockChange({
    companyId: companyOid(req),
    productId: new mongoose.Types.ObjectId(req.body.productId),
    quantityDelta: req.body.quantityDelta,
    type: "adjustment",
    notes: req.body.notes,
    createdBy: req.authUserId
      ? new mongoose.Types.ObjectId(req.authUserId)
      : undefined,
    actorId: req.authUserId,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
  sendSuccess(res, { message: "Stock adjusted" }, 201);
});

export const transferStock = catchAsync(async (req, res) => {
  const qty = Math.abs(req.body.quantity);
  const cid = companyOid(req);
  await applyStockChange({
    companyId: cid,
    productId: new mongoose.Types.ObjectId(req.body.productId),
    quantityDelta: -qty,
    type: "transfer",
    fromLocation: req.body.fromLocation,
    toLocation: req.body.toLocation,
    notes: req.body.notes,
    createdBy: req.authUserId
      ? new mongoose.Types.ObjectId(req.authUserId)
      : undefined,
    actorId: req.authUserId,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
  await applyStockChange({
    companyId: cid,
    productId: new mongoose.Types.ObjectId(req.body.productId),
    quantityDelta: qty,
    type: "transfer",
    fromLocation: req.body.fromLocation,
    toLocation: req.body.toLocation,
    notes: req.body.notes,
    createdBy: req.authUserId
      ? new mongoose.Types.ObjectId(req.authUserId)
      : undefined,
    actorId: req.authUserId,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
  sendSuccess(res, { message: "Transfer recorded" }, 201);
});

export const listMovements = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = {
    companyId: new mongoose.Types.ObjectId(req.authCompanyId!),
  };
  if (req.query.productId) {
    filter.productId = new mongoose.Types.ObjectId(
      String(req.query.productId),
    );
  }
  if (req.query.type) filter.type = req.query.type as InventoryMovementType;

  const [items, total] = await Promise.all([
    InventoryMovement.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    InventoryMovement.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(page, limit, total));
});

export const lowStock = catchAsync(async (req, res) => {
  const items = await Product.find({
    companyId: new mongoose.Types.ObjectId(req.authCompanyId!),
    status: "active",
    deletedAt: { $exists: false },
    $expr: { $lte: ["$stockOnHand", "$reorderLevel"] },
  }).sort({ stockOnHand: 1 });
  sendSuccess(res, items);
});
