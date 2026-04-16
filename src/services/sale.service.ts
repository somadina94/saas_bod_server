import mongoose from "mongoose";
import Sale from "../models/Sale.model.js";
import type { ISaleLine } from "../models/Sale.model.js";
import type { LineTaxMode } from "../types/domain.js";
import { computeLineAmounts, sumLines } from "../utils/pricing.js";
import { nextNumberedDocument } from "./company.service.js";
import { applyStockChange } from "./inventory.service.js";
import AppError from "../utils/appError.js";
import { recordAudit } from "./auditLog.service.js";

export const recalcSaleLines = (lines: ISaleLine[]) => {
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
    items: clean as ISaleLine[],
    subtotal: totals.subtotal,
    taxTotal: totals.taxTotal,
    total: totals.total,
    discountTotal: lines.reduce((s, l) => s + l.discount, 0),
  };
};

export const completeSale = async (params: {
  saleId: string;
  companyId: string;
  deductInventory: boolean;
  actorId?: string;
  ip?: string;
  userAgent?: string;
}) => {
  const sale = await Sale.findOne({
    _id: params.saleId,
    companyId: params.companyId,
  });
  if (!sale) throw new AppError("Sale not found", 404);
  if (sale.status !== "draft") {
    throw new AppError("Sale is not in draft status", 400);
  }

  sale.status = "completed";
  await sale.save();

  if (params.deductInventory) {
    for (const line of sale.items) {
      if (line.productId) {
        await applyStockChange({
          companyId: sale.companyId,
          productId: line.productId,
          quantityDelta: -line.quantity,
          type: "sale",
          referenceType: "sale",
          referenceId: String(sale._id),
          createdBy: sale.createdBy,
          actorId: params.actorId,
          ip: params.ip,
          userAgent: params.userAgent,
        });
      }
    }
  }

  await recordAudit({
    actorId: params.actorId,
    action: "update",
    entityType: "sale",
    entityId: String(sale._id),
    metadata: { status: "completed" },
  });

  return sale;
};

export const createSale = async (params: {
  companyId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  walkInCustomerName?: string;
  items: ISaleLine[];
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  actorId?: string;
}) => {
  const { items, subtotal, taxTotal, total, discountTotal } =
    recalcSaleLines(params.items);
  const saleNumber = await nextNumberedDocument(
    params.companyId,
    "saleNumberSettings",
  );

  const sale = await Sale.create({
    companyId: params.companyId,
    saleNumber,
    status: "draft",
    customerId: params.customerId,
    walkInCustomerName: params.walkInCustomerName,
    items,
    returns: [],
    subtotal,
    taxTotal,
    discountTotal,
    total,
    notes: params.notes,
    createdBy: params.createdBy,
  });

  await recordAudit({
    actorId: params.actorId,
    action: "create",
    entityType: "sale",
    entityId: String(sale._id),
    metadata: { saleNumber },
  });

  return sale;
};
