import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync.js";
import { paginated, sendSuccess } from "../utils/apiResponse.js";
import {
  buildPaginationMeta,
  parsePagination,
} from "../utils/pagination.js";
import Payment from "../models/Payment.model.js";
import Customer from "../models/Customer.model.js";
import Invoice from "../models/Invoice.model.js";
import * as paymentService from "../services/payment.service.js";
import * as paystackService from "../services/paystack.service.js";
import { env } from "../config/env.js";
import AppError from "../utils/appError.js";

export const listPayments = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = {};
  if (req.query.customerId) {
    filter.customerId = new mongoose.Types.ObjectId(String(req.query.customerId));
  }
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    Payment.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Payment.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(page, limit, total));
});

export const recordPayment = catchAsync(async (req, res) => {
  const allocations = (req.body.allocations ?? []).map(
    (a: { invoiceId: string; amount: number }) => ({
      invoiceId: new mongoose.Types.ObjectId(a.invoiceId),
      amount: a.amount,
    }),
  );

  const p = await paymentService.recordPayment({
    customerId: req.body.customerId
      ? new mongoose.Types.ObjectId(req.body.customerId)
      : undefined,
    amount: req.body.amount,
    currency: req.body.currency ?? "NGN",
    method: req.body.method,
    reference: req.body.reference,
    receiptNumber: req.body.receiptNumber,
    allocations,
    notes: req.body.notes,
    recordedBy: req.authUserId
      ? new mongoose.Types.ObjectId(req.authUserId)
      : undefined,
    actorId: req.authUserId,
  });
  sendSuccess(res, p, 201);
});

export const initializePaymentForInvoice = catchAsync(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw new AppError("Invoice not found", 404);

  const customer = await Customer.findById(invoice.customerId);
  const email =
    customer?.email ?? req.body.email ?? env.emailAddress ?? "customer@example.com";

  const reference = `INV_${invoice._id}_${Date.now()}`;
  const amount = invoice.balance;

  const init = await paystackService.initializeTransaction({
    email,
    amount,
    reference,
    callbackUrl: req.body.callbackUrl ?? `${env.frontendUrl}/payments/callback`,
    metadata: {
      invoiceId: String(invoice._id),
      invoice_id: String(invoice._id),
      invoiceNumber: invoice.invoiceNumber,
    },
  });

  invoice.lastPaystackReference = reference;
  invoice.paystackPaymentUrl = init.authorizationUrl;
  await invoice.save();

  sendSuccess(res, {
    authorizationUrl: init.authorizationUrl,
    accessCode: init.accessCode,
    reference: init.reference,
  });
});

export const verifyPaystackPayment = catchAsync(async (req, res) => {
  const data = await paystackService.verifyTransaction(
    String(req.params.reference),
  );
  sendSuccess(res, data);
});
