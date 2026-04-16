import mongoose from "mongoose";

export type IndustryType =
  | "manufacturing"
  | "wholesale"
  | "retail"
  | "pharmacy"
  | "logistics"
  | "services"
  | "other";

export type PaymentMethodType =
  | "cash"
  | "bank_transfer"
  | "card"
  | "pos"
  | "online";

export interface CompanyAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface CompanyBankAccount {
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode?: string;
  isDefault?: boolean;
}

export interface CompanyPaymentMethod {
  type: PaymentMethodType;
  provider?: string; // e.g. Paystack, Stripe
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  details?: Record<string, unknown>;
  isActive: boolean;
}

export interface InvoiceSettings {
  prefix: string;
  nextNumber: number;
  dueDays: number;
  termsAndConditions?: string;
  footerNote?: string;
  showLogo: boolean;
  showBankDetails: boolean;
}

export interface QuotationSettings {
  prefix: string;
  nextNumber: number;
}

export interface PurchaseOrderSettings {
  prefix: string;
  nextNumber: number;
}

export interface SaleNumberSettings {
  prefix: string;
  nextNumber: number;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  sendInvoiceReminders: boolean;
  sendPaymentConfirmations: boolean;
  sendLowStockAlerts: boolean;
}

export interface OperationalSettings {
  allowNegativeStock: boolean;
  requireExpenseApproval: boolean;
  requireDiscountApproval: boolean;
  enableInventoryTracking: boolean;
  enableLowStockAlerts: boolean;
  enableBatchTracking: boolean;
  enableExpiryTracking: boolean;
}

export interface Company {
  id: mongoose.Types.ObjectId;

  name: string;
  legalName?: string;
  registrationNumber?: string;
  taxId?: string;

  logoUrl?: string;
  website?: string;
  email?: string;
  phone?: string;

  address: CompanyAddress;

  industry: IndustryType;
  businessType?: string;
  description?: string;

  currency: string;
  taxRate?: number;

  bankAccounts: CompanyBankAccount[];
  paymentMethods: CompanyPaymentMethod[];

  invoiceSettings: InvoiceSettings;
  quotationSettings?: QuotationSettings;
  purchaseOrderSettings?: PurchaseOrderSettings;
  saleNumberSettings?: SaleNumberSettings;
  notificationSettings: NotificationSettings;
  operationalSettings: OperationalSettings;

  createdAt: Date;
  updatedAt: Date;
}
