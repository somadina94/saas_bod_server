import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { verifyPublicLinkToken } from "../utils/publicLink.js";
import Quotation from "../models/Quotation.model.js";
import Invoice from "../models/Invoice.model.js";
import Customer from "../models/Customer.model.js";

export const getPublicQuotation = catchAsync(async (req, res) => {
  let payload;
  try {
    payload = verifyPublicLinkToken(String(req.params.token));
  } catch {
    throw new AppError("Public link is invalid or expired", 400);
  }
  if (payload.res !== "quotation") {
    throw new AppError("Public link is invalid", 400);
  }

  const [quotation, customer] = await Promise.all([
    Quotation.findById(payload.docId),
    Customer.findById(payload.customerId),
  ]);
  if (!quotation || !customer) throw new AppError("Document not found", 404);
  if (String(quotation.customerId) !== payload.customerId) {
    throw new AppError("Public link is invalid", 400);
  }

  sendSuccess(res, {
    kind: "quotation",
    customer: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    },
    quotation: {
      id: quotation.id,
      quotationNumber: quotation.quotationNumber,
      status: quotation.status,
      issueDate: quotation.issueDate,
      validUntil: quotation.validUntil,
      items: quotation.items,
      subtotal: quotation.subtotal,
      taxTotal: quotation.taxTotal,
      discountTotal: quotation.discountTotal,
      total: quotation.total,
      notes: quotation.notes,
    },
  });
});

export const getPublicInvoice = catchAsync(async (req, res) => {
  let payload;
  try {
    payload = verifyPublicLinkToken(String(req.params.token));
  } catch {
    throw new AppError("Public link is invalid or expired", 400);
  }
  if (payload.res !== "invoice") {
    throw new AppError("Public link is invalid", 400);
  }

  const [invoice, customer] = await Promise.all([
    Invoice.findById(payload.docId),
    Customer.findById(payload.customerId),
  ]);
  if (!invoice || !customer) throw new AppError("Document not found", 404);
  if (String(invoice.customerId) !== payload.customerId) {
    throw new AppError("Public link is invalid", 400);
  }

  sendSuccess(res, {
    kind: "invoice",
    customer: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    },
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      items: invoice.items,
      subtotal: invoice.subtotal,
      taxTotal: invoice.taxTotal,
      discountTotal: invoice.discountTotal,
      total: invoice.total,
      paidAmount: invoice.paidAmount,
      balance: invoice.balance,
      notes: invoice.notes,
    },
  });
});
