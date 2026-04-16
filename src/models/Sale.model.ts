import mongoose, { Schema } from "mongoose";
import type { SaleStatus } from "../types/domain.js";
import type { LineTaxMode } from "../types/domain.js";

export interface ISaleLine {
  productId?: mongoose.Types.ObjectId;
  serviceId?: mongoose.Types.ObjectId;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxMode: LineTaxMode;
  discount: number;
  lineTotal: number;
}

export interface ISaleReturnLine {
  saleLineIndex: number;
  quantity: number;
  reason?: string;
}

export interface ISale {
  _id: mongoose.Types.ObjectId;
  saleNumber: string;
  status: SaleStatus;
  customerId?: mongoose.Types.ObjectId;
  walkInCustomerName?: string;
  items: ISaleLine[];
  returns: ISaleReturnLine[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  paymentId?: mongoose.Types.ObjectId;
  invoiceId?: mongoose.Types.ObjectId;
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const saleLineSchema = new Schema<ISaleLine>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service" },
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0 },
    taxMode: {
      type: String,
      enum: ["inclusive", "exclusive", "none"],
      default: "exclusive",
    },
    discount: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const returnLineSchema = new Schema<ISaleReturnLine>(
  {
    saleLineIndex: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0 },
    reason: String,
  },
  { _id: false },
);

const saleSchema = new Schema<ISale>(
  {
    saleNumber: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["draft", "completed", "returned", "cancelled"],
      default: "draft",
    },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    walkInCustomerName: String,
    items: { type: [saleLineSchema], default: [] },
    returns: { type: [returnLineSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

saleSchema.index({ customerId: 1, createdAt: -1 });
saleSchema.index({ status: 1 });

saleSchema.set("toJSON", {
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

const Sale = mongoose.model<ISale>("Sale", saleSchema);
export default Sale;
