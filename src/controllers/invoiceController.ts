import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync.js";
import { paginated, sendSuccess } from "../utils/apiResponse.js";
import {
  buildPaginationMeta,
  parsePagination,
} from "../utils/pagination.js";
import Invoice from "../models/Invoice.model.js";
import * as invoiceService from "../services/invoice.service.js";
import { requireCompanyById } from "../services/company.service.js";
import AppError from "../utils/appError.js";

export const listInvoices = catchAsync(async (req, res) => {
  await invoiceService.markInvoicesOverdue(req.authCompanyId!);
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = {
    companyId: new mongoose.Types.ObjectId(req.authCompanyId!),
  };
  if (req.query.customerId) {
    filter.customerId = new mongoose.Types.ObjectId(String(req.query.customerId));
  }
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    Invoice.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Invoice.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(page, limit, total));
});

export const createInvoice = catchAsync(async (req, res) => {
  const company = await requireCompanyById(req.authCompanyId!);
  const dueDays =
    typeof req.body.dueDays === "number"
      ? req.body.dueDays
      : company.invoiceSettings.dueDays;

  const inv = await invoiceService.createInvoice({
    companyId: new mongoose.Types.ObjectId(req.authCompanyId!),
    customerId: new mongoose.Types.ObjectId(req.body.customerId),
    quotationId: req.body.quotationId
      ? new mongoose.Types.ObjectId(req.body.quotationId)
      : undefined,
    items: req.body.items,
    dueDays,
    notes: req.body.notes,
    internalNotes: req.body.internalNotes,
    createdBy: req.authUserId
      ? new mongoose.Types.ObjectId(req.authUserId)
      : undefined,
    actorId: req.authUserId,
  });
  sendSuccess(res, inv, 201);
});

export const getInvoice = catchAsync(async (req, res) => {
  const inv = await Invoice.findOne({
    _id: req.params.id,
    companyId: req.authCompanyId,
  });
  if (!inv) throw new AppError("Invoice not found", 404);
  sendSuccess(res, inv);
});

export const updateDraftInvoice = catchAsync(async (req, res) => {
  const id = String(req.params.id);
  const inv = await invoiceService.updateDraftInvoice(
    id,
    req.authCompanyId!,
    {
      items: req.body.items,
      notes: req.body.notes,
      internalNotes: req.body.internalNotes,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
    },
    req.authUserId,
  );
  sendSuccess(res, inv);
});

export const sendInvoice = catchAsync(async (req, res) => {
  const inv = await invoiceService.sendInvoice(
    req.params.id as string,
    req.authCompanyId!,
    req.authUserId,
  );
  sendSuccess(res, inv);
});

export const updateInvoiceStatus = catchAsync(async (req, res) => {
  const inv = await Invoice.findOne({
    _id: req.params.id,
    companyId: req.authCompanyId,
  });
  if (!inv) throw new AppError("Invoice not found", 404);
  inv.status = req.body.status;
  await inv.save();
  sendSuccess(res, inv);
});
