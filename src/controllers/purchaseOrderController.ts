import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync.js";
import { paginated, sendSuccess } from "../utils/apiResponse.js";
import {
  buildPaginationMeta,
  parsePagination,
} from "../utils/pagination.js";
import PurchaseOrder from "../models/PurchaseOrder.model.js";
import * as purchaseOrderService from "../services/purchaseOrder.service.js";
import { nextNumberedDocument } from "../services/company.service.js";
import AppError from "../utils/appError.js";
import { recordAudit } from "../services/auditLog.service.js";

export const listPurchaseOrders = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = {};
  if (req.query.supplierId) {
    filter.supplierId = new mongoose.Types.ObjectId(String(req.query.supplierId));
  }
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    PurchaseOrder.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
    PurchaseOrder.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(page, limit, total));
});

export const createPurchaseOrder = catchAsync(async (req, res) => {
  const poNumber = await nextNumberedDocument("purchaseOrderSettings");
  const po = await PurchaseOrder.create({
    poNumber,
    supplierId: new mongoose.Types.ObjectId(req.body.supplierId),
    status: req.body.status ?? "draft",
    orderDate: req.body.orderDate ? new Date(req.body.orderDate) : new Date(),
    expectedDate: req.body.expectedDate
      ? new Date(req.body.expectedDate)
      : undefined,
    items: req.body.items,
    subtotal: req.body.subtotal ?? 0,
    taxTotal: req.body.taxTotal ?? 0,
    total: req.body.total ?? 0,
    notes: req.body.notes,
    createdBy: req.authUserId
      ? new mongoose.Types.ObjectId(req.authUserId)
      : undefined,
  });
  await recordAudit({
    actorId: req.authUserId,
    action: "create",
    entityType: "purchase_order",
    entityId: String(po._id),
  });
  sendSuccess(res, po, 201);
});

export const getPurchaseOrder = catchAsync(async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) throw new AppError("Purchase order not found", 404);
  sendSuccess(res, po);
});

export const updatePurchaseOrder = catchAsync(async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) throw new AppError("Purchase order not found", 404);
  Object.assign(po, req.body);
  await po.save();
  await recordAudit({
    actorId: req.authUserId,
    action: "update",
    entityType: "purchase_order",
    entityId: String(po._id),
  });
  sendSuccess(res, po);
});

export const approvePurchaseOrder = catchAsync(async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) throw new AppError("Purchase order not found", 404);
  po.status = "approved";
  po.approvedBy = req.authUserId
    ? new mongoose.Types.ObjectId(req.authUserId)
    : undefined;
  po.approvedAt = new Date();
  await po.save();
  await recordAudit({
    actorId: req.authUserId,
    action: "approve",
    entityType: "purchase_order",
    entityId: String(po._id),
  });
  sendSuccess(res, po);
});

export const receivePurchaseOrder = catchAsync(async (req, res) => {
  const po = await purchaseOrderService.receivePurchaseOrder({
    poId: String(req.params.id),
    lines: req.body.lines,
    actorId: req.authUserId,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
  sendSuccess(res, po);
});
