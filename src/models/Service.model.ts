import mongoose, { Schema } from "mongoose";

export type ServiceStatus = "active" | "inactive" | "archived";

export interface IService {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  code?: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes?: number;
  department?: string;
  category?: string;
  taxRate?: number;
  status: ServiceStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const serviceSchema = new Schema<IService>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    code: { type: String, trim: true, sparse: true },
    name: { type: String, required: true, trim: true },
    description: String,
    price: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, min: 0 },
    department: String,
    category: String,
    taxRate: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
    },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

serviceSchema.index({ companyId: 1, name: "text", code: "text" });
serviceSchema.index({ companyId: 1, status: 1 });
serviceSchema.index({ status: 1 });
serviceSchema.index({ deletedAt: 1 });
serviceSchema.index(
  { companyId: 1, code: 1 },
  {
    unique: true,
    partialFilterExpression: { code: { $exists: true, $type: "string", $ne: "" } },
  },
);

serviceSchema.set("toJSON", {
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

const Service = mongoose.model<IService>("Service", serviceSchema);
export default Service;
