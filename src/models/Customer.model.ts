import mongoose, { Schema } from "mongoose";
import type { DocumentRef } from "../types/domain.js";

export type CustomerStatus = "active" | "inactive" | "archived";

export interface ICustomer {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  billingAddress?: Record<string, string>;
  shippingAddress?: Record<string, string>;
  balance: number;
  creditLimit?: number;
  status: CustomerStatus;
  notes?: string;
  documents: DocumentRef[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const documentRefSchema = new Schema<DocumentRef>(
  {
    url: { type: String, required: true },
    label: String,
    uploadedAt: { type: Date, default: () => new Date() },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false },
);

const customerSchema = new Schema<ICustomer>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, sparse: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    billingAddress: { type: Schema.Types.Mixed },
    shippingAddress: { type: Schema.Types.Mixed },
    balance: { type: Number, default: 0 },
    creditLimit: { type: Number },
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
    },
    notes: { type: String },
    documents: { type: [documentRefSchema], default: [] },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

customerSchema.index({ companyId: 1, name: "text", code: "text", email: "text" });
customerSchema.index({ companyId: 1, status: 1 });
customerSchema.index({ status: 1 });
customerSchema.index({ deletedAt: 1 });
customerSchema.index(
  { companyId: 1, code: 1 },
  {
    unique: true,
    partialFilterExpression: { code: { $exists: true, $type: "string", $ne: "" } },
  },
);

customerSchema.set("toJSON", {
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

const Customer = mongoose.model<ICustomer>("Customer", customerSchema);
export default Customer;
