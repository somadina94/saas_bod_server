import mongoose from "mongoose";
import PurchaseOrder from "../models/PurchaseOrder.model.js";
import { applyStockChange } from "./inventory.service.js";
import AppError from "../utils/appError.js";
import { recordAudit } from "./auditLog.service.js";

export const receivePurchaseOrder = async (params: {
  poId: string;
  lines?: { lineIndex: number; quantity: number }[];
  actorId?: string;
  ip?: string;
  userAgent?: string;
}) => {
  const po = await PurchaseOrder.findById(params.poId);
  if (!po) throw new AppError("Purchase order not found", 404);
  if (po.status === "cancelled") {
    throw new AppError("Cannot receive a cancelled PO", 400);
  }

  const updates =
    params.lines && params.lines.length > 0
      ? params.lines
      : po.items.map((_, idx) => ({ lineIndex: idx, quantity: 0 }));

  for (const u of updates) {
    const line = po.items[u.lineIndex];
    if (!line) continue;
    const qty = u.quantity > 0 ? u.quantity : line.quantityOrdered - line.quantityReceived;
    if (qty <= 0) continue;

    const nextReceived = line.quantityReceived + qty;
    if (nextReceived > line.quantityOrdered) {
      throw new AppError("Receive quantity exceeds ordered quantity", 400);
    }
    line.quantityReceived = nextReceived;

    await applyStockChange({
      productId: line.productId,
      quantityDelta: qty,
      type: "purchase_receipt",
      unitCost: line.unitCost,
      referenceType: "purchase_order",
      referenceId: String(po._id),
      createdBy: po.createdBy,
      actorId: params.actorId,
      ip: params.ip,
      userAgent: params.userAgent,
    });
  }

  const fullyReceived = po.items.every(
    (l) => l.quantityReceived >= l.quantityOrdered,
  );
  const partially = po.items.some((l) => l.quantityReceived > 0);

  po.status = fullyReceived
    ? "received"
    : partially
      ? "partially_received"
      : po.status;
  if (fullyReceived) po.receivedAt = new Date();

  await po.save();

  await recordAudit({
    actorId: params.actorId,
    action: "receive",
    entityType: "purchase_order",
    entityId: String(po._id),
  });

  return po;
};
