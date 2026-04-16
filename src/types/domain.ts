import type mongoose from "mongoose";

export type SoftDelete = {
  deletedAt?: Date;
  isArchived?: boolean;
};

export type Money = {
  amount: number;
  currency: string;
};

export type LineTaxMode = "inclusive" | "exclusive" | "none";

export type DocumentStatus =
  | "draft"
  | "sent"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled"
  | "completed";

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "void"
  | "cancelled";

export type QuotationStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired"
  | "converted";

export type PaymentStatus =
  | "pending"
  | "completed"
  | "failed"
  | "refunded"
  | "partially_refunded";

export type PurchaseOrderStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "partially_received"
  | "received"
  | "cancelled";

export type ExpenseStatus = "draft" | "pending" | "approved" | "rejected" | "paid";

export type SaleStatus = "draft" | "completed" | "returned" | "cancelled";

export type InventoryMovementType =
  | "stock_in"
  | "stock_out"
  | "adjustment"
  | "transfer"
  | "sale"
  | "purchase_receipt"
  | "return_in"
  | "return_out";

export interface DocumentRef {
  url: string;
  label?: string;
  uploadedAt: Date;
  uploadedBy?: mongoose.Types.ObjectId;
}
