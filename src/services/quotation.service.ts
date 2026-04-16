import mongoose from "mongoose";
import Quotation from "../models/Quotation.model.js";
import type { IQuotationLine } from "../models/Quotation.model.js";
import type { LineTaxMode } from "../types/domain.js";
import { computeLineAmounts, sumLines } from "../utils/pricing.js";
import { nextNumberedDocument } from "./company.service.js";
import { createInvoice, recalcInvoiceLines } from "./invoice.service.js";
import AppError from "../utils/appError.js";
import { recordAudit } from "./auditLog.service.js";

export const recalcQuotationLines = (lines: IQuotationLine[]) => {
  const enriched = lines.map((line) => {
    const { lineTotal, taxAmount, netBeforeTax } = computeLineAmounts({
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discount: line.discount,
      taxRate: line.taxRate,
      taxMode: line.taxMode as LineTaxMode,
    });
    return { ...line, lineTotal, _tax: taxAmount, _net: netBeforeTax };
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
    items: clean as IQuotationLine[],
    subtotal: totals.subtotal,
    taxTotal: totals.taxTotal,
    total: totals.total,
    discountTotal: lines.reduce((s, l) => s + l.discount, 0),
  };
};

export const createQuotation = async (params: {
  companyId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  items: IQuotationLine[];
  validUntil?: Date;
  notes?: string;
  internalNotes?: string;
  createdBy?: mongoose.Types.ObjectId;
  actorId?: string;
}) => {
  const { items, subtotal, taxTotal, total, discountTotal } =
    recalcQuotationLines(params.items);
  const quotationNumber = await nextNumberedDocument(
    params.companyId,
    "quotationSettings",
  );

  const q = await Quotation.create({
    companyId: params.companyId,
    quotationNumber,
    customerId: params.customerId,
    status: "draft",
    issueDate: new Date(),
    validUntil: params.validUntil,
    items,
    subtotal,
    taxTotal,
    discountTotal,
    total,
    notes: params.notes,
    internalNotes: params.internalNotes,
    createdBy: params.createdBy,
  });

  await recordAudit({
    actorId: params.actorId,
    action: "create",
    entityType: "quotation",
    entityId: String(q._id),
    metadata: { quotationNumber },
  });

  return q;
};

export const convertQuotationToInvoice = async (
  quotationId: string,
  companyId: string,
  dueDays: number,
  actorId?: string,
) => {
  const q = await Quotation.findOne({ _id: quotationId, companyId });
  if (!q) throw new AppError("Quotation not found", 404);
  if (q.status === "converted") {
    throw new AppError("Quotation already converted", 400);
  }

  const lines = q.items.map((l) => ({
    productId: l.productId,
    serviceId: l.serviceId,
    description: l.description,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    taxRate: l.taxRate,
    taxMode: l.taxMode,
    discount: l.discount,
    lineTotal: l.lineTotal,
  }));

  const { items } = recalcInvoiceLines(lines);

  const inv = await createInvoice({
    companyId: q.companyId,
    customerId: q.customerId,
    quotationId: q._id,
    items,
    dueDays,
    createdBy: q.createdBy,
    actorId,
  });

  q.status = "converted";
  q.convertedToInvoiceId = inv._id as mongoose.Types.ObjectId;
  await q.save();

  await recordAudit({
    actorId,
    action: "convert",
    entityType: "quotation",
    entityId: String(q._id),
    metadata: { invoiceId: String(inv._id) },
  });

  return inv;
};
