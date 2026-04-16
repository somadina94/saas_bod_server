import mongoose, { Schema } from "mongoose";
import type { QuotationStatus } from "../types/domain.js";
import type { LineTaxMode } from "../types/domain.js";

export interface IQuotationLine {
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

export interface IQuotation {
  _id: mongoose.Types.ObjectId;
  quotationNumber: string;
  customerId: mongoose.Types.ObjectId;
  status: QuotationStatus;
  issueDate: Date;
  validUntil?: Date;
  items: IQuotationLine[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  notes?: string;
  internalNotes?: string;
  convertedToInvoiceId?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const lineSchema = new Schema<IQuotationLine>(
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

const quotationSchema = new Schema<IQuotation>(
  {
    quotationNumber: { type: String, required: true, unique: true },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected", "expired", "converted"],
      default: "draft",
    },
    issueDate: { type: Date, default: () => new Date() },
    validUntil: Date,
    items: { type: [lineSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    notes: String,
    internalNotes: String,
    convertedToInvoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

quotationSchema.index({ customerId: 1, createdAt: -1 });
quotationSchema.index({ status: 1 });

quotationSchema.set("toJSON", {
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

const Quotation = mongoose.model<IQuotation>("Quotation", quotationSchema);
export default Quotation;
