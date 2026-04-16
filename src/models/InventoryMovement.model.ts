import mongoose, { Schema } from "mongoose";
import type { InventoryMovementType } from "../types/domain.js";

export interface IInventoryMovement {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  type: InventoryMovementType;
  quantity: number;
  unitCost?: number;
  batchNumber?: string;
  expiryDate?: Date;
  fromLocation?: string;
  toLocation?: string;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "stock_in",
        "stock_out",
        "adjustment",
        "transfer",
        "sale",
        "purchase_receipt",
        "return_in",
        "return_out",
      ],
      required: true,
    },
    quantity: { type: Number, required: true },
    unitCost: { type: Number, min: 0 },
    batchNumber: String,
    expiryDate: Date,
    fromLocation: String,
    toLocation: String,
    referenceType: String,
    referenceId: String,
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

inventoryMovementSchema.index({ productId: 1, createdAt: -1 });
inventoryMovementSchema.index({ referenceType: 1, referenceId: 1 });

inventoryMovementSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret: any) => {
    if (ret._id) {
      ret.id = String(ret._id);
      delete ret._id;
    }
    delete ret.__v;
    return ret;
  },
});

const InventoryMovement = mongoose.model<IInventoryMovement>(
  "InventoryMovement",
  inventoryMovementSchema,
);
export default InventoryMovement;
