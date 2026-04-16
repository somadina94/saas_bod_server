import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync.js";
import { paginated, sendSuccess } from "../utils/apiResponse.js";
import {
  buildPaginationMeta,
  parsePagination,
} from "../utils/pagination.js";
import Quotation from "../models/Quotation.model.js";
import * as quotationService from "../services/quotation.service.js";
import { requireCompany } from "../services/company.service.js";
import AppError from "../utils/appError.js";
import { recordAudit } from "../services/auditLog.service.js";
import { notifyQuotationSent } from "../services/emailNotifications.service.js";

export const listQuotations = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = {};
  if (req.query.customerId) {
    filter.customerId = new mongoose.Types.ObjectId(String(req.query.customerId));
  }
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    Quotation.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Quotation.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(page, limit, total));
});

export const createQuotation = catchAsync(async (req, res) => {
  const q = await quotationService.createQuotation({
    customerId: new mongoose.Types.ObjectId(req.body.customerId),
    items: req.body.items,
    validUntil: req.body.validUntil ? new Date(req.body.validUntil) : undefined,
    notes: req.body.notes,
    internalNotes: req.body.internalNotes,
    createdBy: req.authUserId
      ? new mongoose.Types.ObjectId(req.authUserId)
      : undefined,
    actorId: req.authUserId,
  });
  sendSuccess(res, q, 201);
});

export const getQuotation = catchAsync(async (req, res) => {
  const q = await Quotation.findById(req.params.id);
  if (!q) throw new AppError("Quotation not found", 404);
  sendSuccess(res, q);
});

export const updateQuotation = catchAsync(async (req, res) => {
  const q = await Quotation.findById(req.params.id);
  if (!q) throw new AppError("Quotation not found", 404);
  if (q.status === "converted") {
    throw new AppError("Cannot edit converted quotation", 400);
  }

  const prevStatus = q.status;

  if (req.body.items) {
    const r = quotationService.recalcQuotationLines(req.body.items);
    q.items = r.items;
    q.subtotal = r.subtotal;
    q.taxTotal = r.taxTotal;
    q.discountTotal = r.discountTotal;
    q.total = r.total;
  }
  if (req.body.status !== undefined) q.status = req.body.status;
  if (req.body.validUntil !== undefined) {
    q.validUntil = req.body.validUntil ? new Date(req.body.validUntil) : undefined;
  }
  if (req.body.notes !== undefined) q.notes = req.body.notes;
  if (req.body.internalNotes !== undefined) q.internalNotes = req.body.internalNotes;

  await q.save();
  await recordAudit({
    actorId: req.authUserId,
    action: "update",
    entityType: "quotation",
    entityId: String(q._id),
  });

  if (q.status === "sent" && prevStatus !== "sent") {
    const company = await requireCompany();
    void notifyQuotationSent({
      customerId: String(q.customerId),
      quotationNumber: q.quotationNumber,
      total: q.total,
      currency: company.currency,
      validUntil: q.validUntil,
      quotationId: String(q._id),
    });
  }

  sendSuccess(res, q);
});

export const convertToInvoice = catchAsync(async (req, res) => {
  const company = await requireCompany();
  const dueDays =
    typeof req.body.dueDays === "number"
      ? req.body.dueDays
      : company.invoiceSettings.dueDays;

  const inv = await quotationService.convertQuotationToInvoice(
    String(req.params.id),
    dueDays,
    req.authUserId,
  );
  sendSuccess(res, inv, 201);
});
