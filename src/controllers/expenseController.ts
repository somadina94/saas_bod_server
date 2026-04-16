import catchAsync from "../utils/catchAsync.js";
import { paginated, sendSuccess } from "../utils/apiResponse.js";
import {
  buildPaginationMeta,
  parsePagination,
} from "../utils/pagination.js";
import Expense from "../models/Expense.model.js";
import mongoose from "mongoose";
import AppError from "../utils/appError.js";
import { recordAudit } from "../services/auditLog.service.js";
import { notifyExpenseStatus } from "../services/emailNotifications.service.js";

export const listExpenses = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;

  const [items, total] = await Promise.all([
    Expense.find(filter).skip(skip).limit(limit).sort({ expenseDate: -1 }),
    Expense.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(page, limit, total));
});

export const createExpense = catchAsync(async (req, res) => {
  const e = await Expense.create({
    ...req.body,
    submittedBy: req.authUserId
      ? new mongoose.Types.ObjectId(req.authUserId)
      : undefined,
  });
  await recordAudit({
    actorId: req.authUserId,
    action: "create",
    entityType: "expense",
    entityId: String(e._id),
  });
  sendSuccess(res, e, 201);
});

export const getExpense = catchAsync(async (req, res) => {
  const e = await Expense.findById(req.params.id);
  if (!e) throw new AppError("Expense not found", 404);
  sendSuccess(res, e);
});

export const updateExpense = catchAsync(async (req, res) => {
  const e = await Expense.findById(req.params.id);
  if (!e) throw new AppError("Expense not found", 404);
  Object.assign(e, req.body);
  await e.save();
  await recordAudit({
    actorId: req.authUserId,
    action: "update",
    entityType: "expense",
    entityId: String(e._id),
  });
  sendSuccess(res, e);
});

export const approveExpense = catchAsync(async (req, res) => {
  const e = await Expense.findById(req.params.id);
  if (!e) throw new AppError("Expense not found", 404);
  if (e.submittedBy && req.authUserId && String(e.submittedBy) === req.authUserId) {
    throw new AppError("You cannot approve your own expense", 403);
  }
  e.status = "approved";
  e.approvedBy = req.authUserId
    ? new mongoose.Types.ObjectId(req.authUserId)
    : undefined;
  e.approvedAt = new Date();
  await e.save();
  await recordAudit({
    actorId: req.authUserId,
    action: "approve",
    entityType: "expense",
    entityId: String(e._id),
  });
  if (e.submittedBy) {
    void notifyExpenseStatus({
      submittedByUserId: String(e.submittedBy),
      title: e.title,
      amount: e.amount,
      currency: e.currency,
      status: "approved",
      expenseDate: e.expenseDate,
    });
  }
  sendSuccess(res, e);
});

export const rejectExpense = catchAsync(async (req, res) => {
  const e = await Expense.findById(req.params.id);
  if (!e) throw new AppError("Expense not found", 404);
  if (e.submittedBy && req.authUserId && String(e.submittedBy) === req.authUserId) {
    throw new AppError("You cannot reject your own expense", 403);
  }
  e.status = "rejected";
  e.rejectionReason = req.body.reason;
  await e.save();
  await recordAudit({
    actorId: req.authUserId,
    action: "reject",
    entityType: "expense",
    entityId: String(e._id),
  });
  if (e.submittedBy) {
    void notifyExpenseStatus({
      submittedByUserId: String(e.submittedBy),
      title: e.title,
      amount: e.amount,
      currency: e.currency,
      status: "rejected",
      reason: req.body.reason,
      expenseDate: e.expenseDate,
    });
  }
  sendSuccess(res, e);
});
