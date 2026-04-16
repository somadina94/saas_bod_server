import mongoose, { Schema } from "mongoose";
import type { PaymentStatus } from "../types/domain.js";

export interface IPaymentAllocation {
  invoiceId: mongoose.Types.ObjectId;
  amount: number;
}

export interface IPayment {
  _id: mongoose.Types.ObjectId;
  paymentNumber: string;
  customerId?: mongoose.Types.ObjectId;
  supplierId?: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string;
  reference?: string;
  receiptNumber?: string;
  allocations: IPaymentAllocation[];
  paystackReference?: string;
  paystackAccessCode?: string;
  paystackMetadata?: Record<string, unknown>;
  notes?: string;
  recordedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const allocationSchema = new Schema<IPaymentAllocation>(
  {
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const paymentSchema = new Schema<IPayment>(
  {
    paymentNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier" },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NGN" },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded", "partially_refunded"],
      default: "pending",
    },
    method: { type: String, required: true },
    reference: String,
    receiptNumber: String,
    allocations: { type: [allocationSchema], default: [] },
    paystackReference: { type: String, sparse: true },
    paystackAccessCode: String,
    paystackMetadata: Schema.Types.Mixed,
    notes: String,
    recordedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

paymentSchema.index({ customerId: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });

paymentSchema.set("toJSON", {
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

const Payment = mongoose.model<IPayment>("Payment", paymentSchema);
export default Payment;
