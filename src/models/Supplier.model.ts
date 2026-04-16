import mongoose, { Schema } from "mongoose";
import type { DocumentRef } from "../types/domain.js";

export type SupplierStatus = "active" | "inactive" | "archived";

export interface ISupplier {
  _id: mongoose.Types.ObjectId;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: Record<string, string>;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankSortCode?: string;
  balance: number;
  status: SupplierStatus;
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

const supplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, sparse: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: Schema.Types.Mixed },
    bankName: String,
    bankAccountName: String,
    bankAccountNumber: String,
    bankSortCode: String,
    balance: { type: Number, default: 0 },
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

supplierSchema.index({ name: "text", code: "text", email: "text" });
supplierSchema.index({ status: 1 });
supplierSchema.index({ deletedAt: 1 });

supplierSchema.set("toJSON", {
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

const Supplier = mongoose.model<ISupplier>("Supplier", supplierSchema);
export default Supplier;
