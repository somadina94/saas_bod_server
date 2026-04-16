import mongoose, { Schema } from "mongoose";
import type { ExpenseStatus } from "../types/domain.js";

export interface IExpense {
  _id: mongoose.Types.ObjectId;
  title: string;
  category: string;
  amount: number;
  currency: string;
  status: ExpenseStatus;
  expenseDate: Date;
  dueDate?: Date;
  paidAt?: Date;
  attachmentUrl?: string;
  notes?: string;
  submittedBy?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NGN" },
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected", "paid"],
      default: "draft",
    },
    expenseDate: { type: Date, default: () => new Date() },
    dueDate: Date,
    paidAt: Date,
    attachmentUrl: String,
    notes: String,
    submittedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    rejectionReason: String,
  },
  { timestamps: true },
);

expenseSchema.index({ category: 1, expenseDate: -1 });
expenseSchema.index({ status: 1 });

expenseSchema.set("toJSON", {
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

const Expense = mongoose.model<IExpense>("Expense", expenseSchema);
export default Expense;
