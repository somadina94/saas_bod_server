import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync.js";
import { paginated, sendSuccess } from "../utils/apiResponse.js";
import {
  buildPaginationMeta,
  parsePagination,
} from "../utils/pagination.js";
import Sale from "../models/Sale.model.js";
import * as saleService from "../services/sale.service.js";
import AppError from "../utils/appError.js";

export const listSales = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.customerId) {
    filter.customerId = new mongoose.Types.ObjectId(String(req.query.customerId));
  }

  const [items, total] = await Promise.all([
    Sale.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Sale.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(page, limit, total));
});

export const createSale = catchAsync(async (req, res) => {
  const sale = await saleService.createSale({
    customerId: req.body.customerId
      ? new mongoose.Types.ObjectId(req.body.customerId)
      : undefined,
    walkInCustomerName: req.body.walkInCustomerName,
    items: req.body.items,
    notes: req.body.notes,
    createdBy: req.authUserId
      ? new mongoose.Types.ObjectId(req.authUserId)
      : undefined,
    actorId: req.authUserId,
  });
  sendSuccess(res, sale, 201);
});

export const getSale = catchAsync(async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) throw new AppError("Sale not found", 404);
  sendSuccess(res, sale);
});

export const updateSale = catchAsync(async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) throw new AppError("Sale not found", 404);
  if (sale.status !== "draft") {
    throw new AppError("Only draft sales can be edited", 400);
  }
  if (req.body.items) {
    const r = saleService.recalcSaleLines(req.body.items);
    sale.items = r.items;
    sale.subtotal = r.subtotal;
    sale.taxTotal = r.taxTotal;
    sale.discountTotal = r.discountTotal;
    sale.total = r.total;
  }
  if (req.body.customerId !== undefined) {
    sale.customerId = req.body.customerId
      ? new mongoose.Types.ObjectId(req.body.customerId)
      : undefined;
  }
  if (req.body.walkInCustomerName !== undefined) {
    sale.walkInCustomerName = req.body.walkInCustomerName;
  }
  if (req.body.notes !== undefined) sale.notes = req.body.notes;
  await sale.save();
  sendSuccess(res, sale);
});

export const completeSale = catchAsync(async (req, res) => {
  const sale = await saleService.completeSale({
    saleId: String(req.params.id),
    deductInventory: req.body.deductInventory !== false,
    actorId: req.authUserId,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
  sendSuccess(res, sale);
});

export const linkPayment = catchAsync(async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) throw new AppError("Sale not found", 404);
  sale.paymentId = new mongoose.Types.ObjectId(req.body.paymentId);
  await sale.save();
  sendSuccess(res, sale);
});
