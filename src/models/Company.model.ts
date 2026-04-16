import mongoose, { Schema } from "mongoose";
import type {
  CompanyAddress,
  CompanyBankAccount,
  CompanyPaymentMethod,
  InvoiceSettings,
  NotificationSettings,
  OperationalSettings,
  IndustryType,
  QuotationSettings,
  PurchaseOrderSettings,
  SaleNumberSettings,
} from "../types/company.js";

export interface ICompany {
  _id: mongoose.Types.ObjectId;
  /** URL-safe unique slug for callbacks and documentation. */
  slug: string;
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
  /** Tenant Paystack — customer invoice payments (never log secret). */
  paystackPublicKey?: string;
  paystackSecretKeyEncrypted?: string;
  paystackWebhookConfiguredAt?: Date;
  /** Admin bypass for subscription enforcement (e.g. support). */
  subscriptionBypassUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<CompanyAddress>(
  {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
  },
  { _id: false },
);

const bankAccountSchema = new Schema<CompanyBankAccount>(
  {
    bankName: { type: String, required: true },
    accountName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    sortCode: String,
    isDefault: { type: Boolean, default: false },
  },
  { _id: false },
);

const paymentMethodSchema = new Schema<CompanyPaymentMethod>(
  {
    type: {
      type: String,
      enum: ["cash", "bank_transfer", "card", "pos", "online"],
      required: true,
    },
    provider: String,
    accountName: String,
    accountNumber: String,
    bankName: String,
    details: Schema.Types.Mixed,
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const invoiceSettingsSchema = new Schema<InvoiceSettings>(
  {
    prefix: { type: String, default: "INV" },
    nextNumber: { type: Number, default: 0 },
    dueDays: { type: Number, default: 14 },
    termsAndConditions: String,
    footerNote: String,
    showLogo: { type: Boolean, default: true },
    showBankDetails: { type: Boolean, default: true },
  },
  { _id: false },
);

const quotationSettingsSchema = new Schema<QuotationSettings>(
  {
    prefix: { type: String, default: "QT" },
    nextNumber: { type: Number, default: 0 },
  },
  { _id: false },
);

const poSettingsSchema = new Schema<PurchaseOrderSettings>(
  {
    prefix: { type: String, default: "PO" },
    nextNumber: { type: Number, default: 0 },
  },
  { _id: false },
);

const saleNumberSchema = new Schema<SaleNumberSettings>(
  {
    prefix: { type: String, default: "SAL" },
    nextNumber: { type: Number, default: 0 },
  },
  { _id: false },
);

const notificationSettingsSchema = new Schema<NotificationSettings>(
  {
    emailEnabled: { type: Boolean, default: true },
    smsEnabled: { type: Boolean, default: false },
    whatsappEnabled: { type: Boolean, default: false },
    sendInvoiceReminders: { type: Boolean, default: true },
    sendPaymentConfirmations: { type: Boolean, default: true },
    sendLowStockAlerts: { type: Boolean, default: true },
  },
  { _id: false },
);

const operationalSettingsSchema = new Schema<OperationalSettings>(
  {
    allowNegativeStock: { type: Boolean, default: false },
    requireExpenseApproval: { type: Boolean, default: false },
    requireDiscountApproval: { type: Boolean, default: false },
    enableInventoryTracking: { type: Boolean, default: true },
    enableLowStockAlerts: { type: Boolean, default: true },
    enableBatchTracking: { type: Boolean, default: false },
    enableExpiryTracking: { type: Boolean, default: false },
  },
  { _id: false },
);

const companySchema = new Schema<ICompany>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 64,
    },
    name: { type: String, required: true, trim: true },
    legalName: String,
    registrationNumber: String,
    taxId: String,
    logoUrl: String,
    website: String,
    email: String,
    phone: String,
    address: { type: addressSchema, default: {} },
    industry: {
      type: String,
      enum: [
        "manufacturing",
        "wholesale",
        "retail",
        "pharmacy",
        "logistics",
        "services",
        "other",
      ],
      default: "other",
    },
    businessType: String,
    description: String,
    currency: { type: String, default: "NGN" },
    taxRate: { type: Number, default: 0 },
    bankAccounts: { type: [bankAccountSchema], default: [] },
    paymentMethods: { type: [paymentMethodSchema], default: [] },
    invoiceSettings: { type: invoiceSettingsSchema, required: true },
    quotationSettings: {
      type: quotationSettingsSchema,
      default: () => ({ prefix: "QT", nextNumber: 0 }),
    },
    purchaseOrderSettings: {
      type: poSettingsSchema,
      default: () => ({ prefix: "PO", nextNumber: 0 }),
    },
    saleNumberSettings: {
      type: saleNumberSchema,
      default: () => ({ prefix: "SAL", nextNumber: 0 }),
    },
    notificationSettings: { type: notificationSettingsSchema, required: true },
    operationalSettings: { type: operationalSettingsSchema, required: true },
    paystackPublicKey: { type: String },
    paystackSecretKeyEncrypted: { type: String, select: false },
    paystackWebhookConfiguredAt: { type: Date },
    subscriptionBypassUntil: { type: Date },
  },
  { timestamps: true },
);

companySchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret: any) => {
    if (ret._id) {
      ret.id = String(ret._id);
      delete ret._id;
    }
    delete ret.__v;
    delete ret.paystackSecretKeyEncrypted;
    return ret;
  },
});

const Company = mongoose.model<ICompany>("Company", companySchema);
export default Company;
