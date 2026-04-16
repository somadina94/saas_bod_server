import mongoose from "mongoose";
import Payment from "../models/Payment.model.js";
import Invoice from "../models/Invoice.model.js";
import Customer from "../models/Customer.model.js";
import { nextCounter } from "../models/Counter.model.js";
import AppError from "../utils/appError.js";
import { recordAudit } from "./auditLog.service.js";
import {
  recomputeInvoiceStatus,
  syncInvoiceBalances,
} from "./invoice.service.js";
import { padDocNumber } from "./company.service.js";
import { notifyPaymentReceived } from "./emailNotifications.service.js";

export const recordPayment = async (params: {
  customerId?: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  method: string;
  reference?: string;
  receiptNumber?: string;
  allocations: { invoiceId: mongoose.Types.ObjectId; amount: number }[];
  notes?: string;
  recordedBy?: mongoose.Types.ObjectId;
  status?: "pending" | "completed";
  paystackReference?: string;
  actorId?: string;
}) => {
  const seq = await nextCounter("payment");
  const paymentNumber = `PMT-${padDocNumber(seq, 6)}`;

  const payment = await Payment.create({
    paymentNumber,
    customerId: params.customerId,
    amount: params.amount,
    currency: params.currency,
    status: params.status ?? "completed",
    method: params.method,
    reference: params.reference,
    receiptNumber: params.receiptNumber,
    allocations: params.allocations,
    notes: params.notes,
    recordedBy: params.recordedBy,
    paystackReference: params.paystackReference,
  });

  const invoiceNumbers: string[] = [];

  if ((params.status ?? "completed") === "completed") {
    for (const a of params.allocations) {
      const inv = await Invoice.findById(a.invoiceId);
      if (!inv) continue;
      invoiceNumbers.push(inv.invoiceNumber);
      inv.paidAmount += a.amount;
      inv.balance = syncInvoiceBalances({
        total: inv.total,
        paidAmount: inv.paidAmount,
      });
      inv.status = recomputeInvoiceStatus({
        status: inv.status,
        dueDate: inv.dueDate,
        total: inv.total,
        paidAmount: inv.paidAmount,
      });
      await inv.save();
    }

    if (params.customerId) {
      await Customer.updateOne(
        { _id: params.customerId },
        { $inc: { balance: -params.amount } },
      );

      if (invoiceNumbers.length > 0) {
        void notifyPaymentReceived({
          customerId: String(params.customerId),
          amount: params.amount,
          currency: params.currency,
          paymentNumber,
          reference: params.reference,
          receiptNumber: params.receiptNumber,
          invoiceNumbers,
        });
      }
    }
  }

  await recordAudit({
    actorId: params.actorId,
    action: "create",
    entityType: "payment",
    entityId: String(payment._id),
    metadata: { paymentNumber },
  });

  return payment;
};

export const applyPaystackPaymentToInvoice = async (params: {
  invoiceId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  reference: string;
  customerId?: mongoose.Types.ObjectId;
  recordedBy?: mongoose.Types.ObjectId;
}) => {
  const inv = await Invoice.findById(params.invoiceId);
  if (!inv) throw new AppError("Invoice not found", 404);

  const payment = await recordPayment({
    customerId: params.customerId ?? inv.customerId,
    amount: params.amount,
    currency: params.currency,
    method: "paystack",
    allocations: [{ invoiceId: inv._id, amount: params.amount }],
    status: "completed",
    paystackReference: params.reference,
    recordedBy: params.recordedBy,
    actorId: params.recordedBy ? String(params.recordedBy) : undefined,
  });

  return payment;
};
