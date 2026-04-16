import mongoose, { Schema } from "mongoose";
import type { PurchaseOrderStatus } from "../types/domain.js";
import type { LineTaxMode } from "../types/domain.js";

export interface IPurchaseOrderLine {
  productId: mongoose.Types.ObjectId;
  description: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  taxRate: number;
  taxMode: LineTaxMode;
  lineTotal: number;
}

export interface IPurchaseOrder {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  poNumber: string;
  supplierId: mongoose.Types.ObjectId;
  status: PurchaseOrderStatus;
  orderDate: Date;
  expectedDate?: Date;
  items: IPurchaseOrderLine[];
  subtotal: number;
  taxTotal: number;
  total: number;
  notes?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  receivedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const poLineSchema = new Schema<IPurchaseOrderLine>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    description: { type: String, required: true },
    quantityOrdered: { type: Number, required: true, min: 0 },
    quantityReceived: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0 },
    taxMode: {
      type: String,
      enum: ["inclusive", "exclusive", "none"],
      default: "exclusive",
    },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    poNumber: { type: String, required: true },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "draft",
        "pending_approval",
        "approved",
        "partially_received",
        "received",
        "cancelled",
      ],
      default: "draft",
    },
    orderDate: { type: Date, default: () => new Date() },
    expectedDate: Date,
    items: { type: [poLineSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    notes: String,
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    receivedAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

purchaseOrderSchema.index({ companyId: 1, poNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ companyId: 1, supplierId: 1, createdAt: -1 });
purchaseOrderSchema.index({ supplierId: 1, createdAt: -1 });
purchaseOrderSchema.index({ companyId: 1, status: 1 });
purchaseOrderSchema.index({ status: 1 });

purchaseOrderSchema.set("toJSON", {
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

const PurchaseOrder = mongoose.model<IPurchaseOrder>(
  "PurchaseOrder",
  purchaseOrderSchema,
);
export default PurchaseOrder;
