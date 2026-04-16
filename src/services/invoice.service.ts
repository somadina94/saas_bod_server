import mongoose from "mongoose";
import Invoice from "../models/Invoice.model.js";
import Customer from "../models/Customer.model.js";
import Company from "../models/Company.model.js";
import type { IInvoiceLine } from "../models/Invoice.model.js";
import type { InvoiceStatus } from "../types/domain.js";
import type { LineTaxMode } from "../types/domain.js";
import { computeLineAmounts, sumLines } from "../utils/pricing.js";
import { nextNumberedDocument } from "./company.service.js";
import AppError from "../utils/appError.js";
import { recordAudit } from "./auditLog.service.js";
import { notifyInvoiceSent } from "./emailNotifications.service.js";
import * as paystackService from "./paystack.service.js";
import * as tenantPaystack from "./tenantPaystack.service.js";
import { env } from "../config/env.js";

export const recalcInvoiceLines = (lines: IInvoiceLine[]) => {
  const enriched = lines.map((line) => {
    const { lineTotal, taxAmount, netBeforeTax } = computeLineAmounts({
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discount: line.discount,
      taxRate: line.taxRate,
      taxMode: line.taxMode as LineTaxMode,
    });
    return {
      ...line,
      lineTotal,
      _tax: taxAmount,
      _net: netBeforeTax,
    };
  });
  const totals = sumLines(
    enriched.map((l) => ({
      lineTotal: l.lineTotal,
      taxAmount: l._tax,
      netBeforeTax: l._net,
    })),
  );
  const clean = enriched.map(({ _tax, _net, ...rest }) => rest);
  return {
    items: clean as IInvoiceLine[],
    subtotal: totals.subtotal,
    taxTotal: totals.taxTotal,
    total: totals.total,
    discountTotal: lines.reduce((s, l) => s + l.discount, 0),
  };
};

export const syncInvoiceBalances = (invoice: {
  total: number;
  paidAmount: number;
}) => {
  const balance = Math.max(0, invoice.total - invoice.paidAmount);
  return balance;
};

export const recomputeInvoiceStatus = (params: {
  status: InvoiceStatus;
  dueDate: Date;
  total: number;
  paidAmount: number;
}): InvoiceStatus => {
  const balance = syncInvoiceBalances({
    total: params.total,
    paidAmount: params.paidAmount,
  });
  if (params.status === "void" || params.status === "cancelled") {
    return params.status;
  }
  if (balance <= 0 && params.total > 0) return "paid";
  if (params.paidAmount > 0 && balance > 0) return "partially_paid";
  if (
    params.status !== "draft" &&
    balance > 0 &&
    params.dueDate < new Date()
  ) {
    return "overdue";
  }
  return params.status;
};

export const adjustCustomerBalanceForInvoice = async (params: {
  customerId: mongoose.Types.ObjectId;
  delta: number;
}) => {
  await Customer.updateOne(
    { _id: params.customerId },
    { $inc: { balance: params.delta } },
  );
};

export const createInvoice = async (params: {
  companyId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  quotationId?: mongoose.Types.ObjectId;
  items: IInvoiceLine[];
  dueDays: number;
  notes?: string;
  internalNotes?: string;
  createdBy?: mongoose.Types.ObjectId;
  actorId?: string;
}) => {
  const { items, subtotal, taxTotal, total, discountTotal } =
    recalcInvoiceLines(params.items);
  const invoiceNumber = await nextNumberedDocument(
    params.companyId,
    "invoiceSettings",
  );
  const issueDate = new Date();
  const due = new Date(issueDate);
  due.setDate(due.getDate() + params.dueDays);

  const inv = await Invoice.create({
    companyId: params.companyId,
    invoiceNumber,
    customerId: params.customerId,
    quotationId: params.quotationId,
    status: "draft",
    issueDate,
    dueDate: due,
    items,
    subtotal,
    taxTotal,
    discountTotal,
    total,
    paidAmount: 0,
    balance: total,
    notes: params.notes,
    internalNotes: params.internalNotes,
    createdBy: params.createdBy,
  });

  await recordAudit({
    actorId: params.actorId,
    action: "create",
    entityType: "invoice",
    entityId: String(inv._id),
    metadata: { invoiceNumber },
  });

  return inv;
};

export const updateDraftInvoice = async (
  id: string,
  companyId: string,
  patch: Partial<{
    items: IInvoiceLine[];
    notes: string;
    internalNotes: string;
    dueDate: Date;
  }>,
  actorId?: string,
) => {
  const existing = await Invoice.findOne({
    _id: id,
    companyId,
  });
  if (!existing) throw new AppError("Invoice not found", 404);
  if (existing.status !== "draft") {
    throw new AppError("Only draft invoices can be edited", 400);
  }

  let items = existing.items;
  if (patch.items) {
    const r = recalcInvoiceLines(patch.items);
    items = r.items;
    Object.assign(existing, {
      items,
      subtotal: r.subtotal,
      taxTotal: r.taxTotal,
      discountTotal: r.discountTotal,
      total: r.total,
      balance: syncInvoiceBalances({
        total: r.total,
        paidAmount: existing.paidAmount,
      }),
    });
  }
  if (patch.notes !== undefined) existing.notes = patch.notes;
  if (patch.internalNotes !== undefined) {
    existing.internalNotes = patch.internalNotes;
  }
  if (patch.dueDate !== undefined) existing.dueDate = patch.dueDate;

  const status = recomputeInvoiceStatus({
    status: existing.status,
    dueDate: existing.dueDate,
    total: existing.total,
    paidAmount: existing.paidAmount,
  });
  existing.status = status;

  await existing.save();

  await recordAudit({
    actorId,
    action: "update",
    entityType: "invoice",
    entityId: String(existing._id),
  });

  return existing;
};

export const sendInvoice = async (
  id: string,
  companyId: string,
  actorId?: string,
) => {
  const inv = await Invoice.findOne({ _id: id, companyId });
  if (!inv) throw new AppError("Invoice not found", 404);
  if (inv.status === "void" || inv.status === "cancelled") {
    throw new AppError("Cannot send this invoice", 400);
  }

  const balanceDue = syncInvoiceBalances({
    total: inv.total,
    paidAmount: inv.paidAmount,
  });
  if (balanceDue > 0) {
    const secret = await tenantPaystack.getTenantPaystackSecret(companyId);
    if (!secret) {
      throw new AppError(
        "Configure Paystack keys in Settings → Payments before sending invoices with an amount due.",
        400,
      );
    }
  }

  const prevStatus = inv.status;
  inv.status = "sent";
  inv.balance = syncInvoiceBalances({
    total: inv.total,
    paidAmount: inv.paidAmount,
  });
  await inv.save();

  if (prevStatus === "draft") {
    await adjustCustomerBalanceForInvoice({
      customerId: inv.customerId,
      delta: inv.balance,
    });
  }

  await recordAudit({
    actorId,
    action: "send",
    entityType: "invoice",
    entityId: String(inv._id),
  });

  // Generate a hosted payment link automatically when missing so emailed invoices
  // include a "Pay now" action by default.
  if (!inv.paystackPaymentUrl && !inv.paymentLinkUrl && inv.balance > 0) {
    try {
      const secret = await tenantPaystack.getTenantPaystackSecret(companyId);
      if (!secret) throw new Error("missing tenant paystack");
      const customer = await Customer.findById(inv.customerId);
      const payerEmail =
        customer?.email?.trim() || env.emailAddress || "customer@example.com";
      const reference = `INV_${inv._id}_${Date.now()}`;
      const callbackUrl = `${env.frontendUrl.replace(/\/$/, "")}/payments/callback?companyId=${encodeURIComponent(companyId)}`;
      const init = await paystackService.initializeTransaction({
        secretKey: secret,
        email: payerEmail,
        amount: inv.balance,
        reference,
        callbackUrl,
        metadata: {
          invoiceId: String(inv._id),
          invoice_id: String(inv._id),
          invoiceNumber: inv.invoiceNumber,
        },
      });
      inv.lastPaystackReference = reference;
      inv.paystackPaymentUrl = init.authorizationUrl;
      await inv.save();
    } catch (err) {
      console.error(
        `[invoice] failed to auto-generate payment link for ${inv.invoiceNumber}`,
        err,
      );
    }
  }

  const company = await Company.findById(companyId);
  const currency = company?.currency ?? "NGN";
  void notifyInvoiceSent({
    customerId: String(inv.customerId),
    invoiceNumber: inv.invoiceNumber,
    total: inv.total,
    currency,
    dueDate: inv.dueDate,
    notes: inv.notes,
    invoiceId: String(inv._id),
  });

  return inv;
};

export const markInvoicesOverdue = async (companyId: string) => {
  const now = new Date();
  await Invoice.updateMany(
    {
      companyId,
      status: { $in: ["sent", "partially_paid"] },
      dueDate: { $lt: now },
      $expr: { $gt: [{ $subtract: ["$total", "$paidAmount"] }, 0] },
    },
    { $set: { status: "overdue" } },
  );
};
