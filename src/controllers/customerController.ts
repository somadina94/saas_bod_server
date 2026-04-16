import catchAsync from "../utils/catchAsync.js";
import { paginated, sendSuccess } from "../utils/apiResponse.js";
import {
  buildPaginationMeta,
  parsePagination,
  textSearchFilter,
} from "../utils/pagination.js";
import Customer from "../models/Customer.model.js";
import AppError from "../utils/appError.js";
import { recordAudit } from "../services/auditLog.service.js";

export const listCustomers = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const search = textSearchFilter(req.query.search as string | undefined, [
    "name",
    "email",
    "code",
  ]);
  const filter: Record<string, unknown> = { deletedAt: { $exists: false } };
  if (req.query.status) filter.status = req.query.status;
  if (search) Object.assign(filter, search);

  const [items, total] = await Promise.all([
    Customer.find(filter).skip(skip).limit(limit).sort({ name: 1 }),
    Customer.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(page, limit, total));
});

export const createCustomer = catchAsync(async (req, res) => {
  const c = await Customer.create({
    name: req.body.name,
    code: req.body.code,
    email: req.body.email,
    phone: req.body.phone,
    billingAddress: req.body.billingAddress,
    shippingAddress: req.body.shippingAddress,
    balance: req.body.balance ?? 0,
    creditLimit: req.body.creditLimit,
    status: req.body.status ?? "active",
    notes: req.body.notes,
    documents: req.body.documents ?? [],
  });
  await recordAudit({
    actorId: req.authUserId,
    action: "create",
    entityType: "customer",
    entityId: String(c._id),
  });
  sendSuccess(res, c, 201);
});

export const getCustomer = catchAsync(async (req, res) => {
  const c = await Customer.findOne({
    _id: req.params.id,
    deletedAt: { $exists: false },
  });
  if (!c) throw new AppError("Customer not found", 404);
  sendSuccess(res, c);
});

export const updateCustomer = catchAsync(async (req, res) => {
  const c = await Customer.findOne({
    _id: req.params.id,
    deletedAt: { $exists: false },
  });
  if (!c) throw new AppError("Customer not found", 404);

  const keys = [
    "name",
    "code",
    "email",
    "phone",
    "billingAddress",
    "shippingAddress",
    "creditLimit",
    "status",
    "notes",
    "documents",
  ] as const;
  for (const k of keys) {
    if (req.body[k] !== undefined) (c as unknown as Record<string, unknown>)[k] = req.body[k];
  }
  await c.save();
  await recordAudit({
    actorId: req.authUserId,
    action: "update",
    entityType: "customer",
    entityId: String(c._id),
  });
  sendSuccess(res, c);
});

export const archiveCustomer = catchAsync(async (req, res) => {
  const c = await Customer.findById(req.params.id);
  if (!c) throw new AppError("Customer not found", 404);
  c.status = "archived";
  c.deletedAt = new Date();
  await c.save();
  await recordAudit({
    actorId: req.authUserId,
    action: "delete",
    entityType: "customer",
    entityId: String(c._id),
  });
  sendSuccess(res, { message: "Customer archived" });
});
