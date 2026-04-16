import mongoose from "mongoose";
import Product from "../models/Product.model.js";
import InventoryMovement from "../models/InventoryMovement.model.js";
import Company from "../models/Company.model.js";
import type { InventoryMovementType } from "../types/domain.js";
import AppError from "../utils/appError.js";
import { recordAudit } from "./auditLog.service.js";

export interface StockChangeInput {
  productId: mongoose.Types.ObjectId;
  quantityDelta: number;
  type: InventoryMovementType;
  unitCost?: number;
  batchNumber?: string;
  expiryDate?: Date;
  fromLocation?: string;
  toLocation?: string;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  actorId?: string;
  ip?: string;
  userAgent?: string;
}

export const applyStockChange = async (
  input: StockChangeInput,
): Promise<void> => {
  if (input.quantityDelta === 0) return;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const product = await Product.findById(input.productId).session(session);
    if (!product) throw new AppError("Product not found", 404);

    const company = await Company.findOne().session(session);
    const allowNegative = company?.operationalSettings.allowNegativeStock ?? false;

    const newStock = product.stockOnHand + input.quantityDelta;
    if (!allowNegative && newStock < 0) {
      throw new AppError("Insufficient stock for this operation", 400);
    }

    await Product.updateOne(
      { _id: product._id },
      { $set: { stockOnHand: newStock } },
      { session },
    );

    await InventoryMovement.create(
      [
        {
          productId: input.productId,
          type: input.type,
          quantity: input.quantityDelta,
          unitCost: input.unitCost,
          batchNumber: input.batchNumber,
          expiryDate: input.expiryDate,
          fromLocation: input.fromLocation,
          toLocation: input.toLocation,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          notes: input.notes,
          createdBy: input.createdBy,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    await recordAudit({
      actorId: input.actorId,
      action: "adjust",
      entityType: "inventory",
      entityId: String(product._id),
      metadata: {
        type: input.type,
        quantityDelta: input.quantityDelta,
        newStock,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
