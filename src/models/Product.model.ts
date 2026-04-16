import mongoose, { Schema } from "mongoose";

export type ProductStatus = "active" | "inactive" | "archived";

export interface IProduct {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  sku: string;
  name: string;
  description?: string;
  unitPrice: number;
  costPrice?: number;
  taxRate?: number;
  reorderLevel: number;
  stockOnHand: number;
  status: ProductStatus;
  barcode?: string;
  trackBatch: boolean;
  trackExpiry: boolean;
  imageUrls: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const productSchema = new Schema<IProduct>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    sku: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: String,
    unitPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, min: 0 },
    taxRate: { type: Number, min: 0, default: 0 },
    reorderLevel: { type: Number, default: 0, min: 0 },
    stockOnHand: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
    },
    barcode: { type: String, sparse: true },
    trackBatch: { type: Boolean, default: false },
    trackExpiry: { type: Boolean, default: false },
    imageUrls: { type: [String], default: [] },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

productSchema.index({ companyId: 1, sku: 1 }, { unique: true });
productSchema.index({ companyId: 1, name: "text", sku: "text", barcode: "text" });
productSchema.index({ companyId: 1, status: 1 });
productSchema.index({ status: 1 });
productSchema.index({ stockOnHand: 1 });
productSchema.index({ deletedAt: 1 });

productSchema.set("toJSON", {
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

const Product = mongoose.model<IProduct>("Product", productSchema);
export default Product;
