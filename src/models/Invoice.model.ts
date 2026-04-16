import mongoose, { Schema } from "mongoose";
import type { InvoiceStatus } from "../types/domain.js";
import type { LineTaxMode } from "../types/domain.js";

export interface IInvoiceLine {
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

export interface IInvoice {
  _id: mongoose.Types.ObjectId;
  invoiceNumber: string;
  customerId: mongoose.Types.ObjectId;
  quotationId?: mongoose.Types.ObjectId;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  items: IInvoiceLine[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  paidAmount: number;
  balance: number;
  notes?: string;
  internalNotes?: string;
  paymentLinkUrl?: string;
  paystackPaymentUrl?: string;
  lastPaystackReference?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const lineSchema = new Schema<IInvoiceLine>(
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

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    quotationId: { type: Schema.Types.ObjectId, ref: "Quotation" },
    status: {
      type: String,
      enum: [
        "draft",
        "sent",
        "partially_paid",
        "paid",
        "overdue",
        "void",
        "cancelled",
      ],
      default: "draft",
    },
    issueDate: { type: Date, default: () => new Date() },
    dueDate: { type: Date, required: true },
    items: { type: [lineSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    notes: String,
    internalNotes: String,
    paymentLinkUrl: String,
    paystackPaymentUrl: String,
    lastPaystackReference: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

invoiceSchema.index({ customerId: 1, createdAt: -1 });
invoiceSchema.index({ status: 1, dueDate: 1 });

invoiceSchema.set("toJSON", {
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

const Invoice = mongoose.model<IInvoice>("Invoice", invoiceSchema);
export default Invoice;
