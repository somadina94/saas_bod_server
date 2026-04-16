import catchAsync from "../utils/catchAsync.js";
import { sendSuccess } from "../utils/apiResponse.js";
import Company from "../models/Company.model.js";
import AppError from "../utils/appError.js";
import { recordAudit } from "../services/auditLog.service.js";

export const getCompany = catchAsync(async (_req, res) => {
  const company = await Company.findOne();
  if (!company) throw new AppError("Company not found", 404);
  sendSuccess(res, company);
});

export const createCompany = catchAsync(async (req, res) => {
  const count = await Company.countDocuments();
  if (count > 0) throw new AppError("Company already exists", 400);

  const company = await Company.create({
    name: req.body.name,
    legalName: req.body.legalName,
    registrationNumber: req.body.registrationNumber,
    taxId: req.body.taxId,
    logoUrl: req.body.logoUrl,
    website: req.body.website,
    email: req.body.email,
    phone: req.body.phone,
    address: req.body.address ?? {},
    industry: req.body.industry ?? "other",
    businessType: req.body.businessType,
    description: req.body.description,
    currency: req.body.currency ?? "NGN",
    taxRate: req.body.taxRate,
    bankAccounts: req.body.bankAccounts ?? [],
    paymentMethods: req.body.paymentMethods ?? [],
    invoiceSettings: req.body.invoiceSettings ?? {
      prefix: "INV",
      nextNumber: 0,
      dueDays: 14,
      showLogo: true,
      showBankDetails: true,
    },
    quotationSettings: req.body.quotationSettings ?? {
      prefix: "QT",
      nextNumber: 0,
    },
    purchaseOrderSettings: req.body.purchaseOrderSettings ?? {
      prefix: "PO",
      nextNumber: 0,
    },
    saleNumberSettings: req.body.saleNumberSettings ?? {
      prefix: "SAL",
      nextNumber: 0,
    },
    notificationSettings: req.body.notificationSettings ?? {
      emailEnabled: true,
      smsEnabled: false,
      whatsappEnabled: false,
      sendInvoiceReminders: true,
      sendPaymentConfirmations: true,
      sendLowStockAlerts: true,
    },
    operationalSettings: req.body.operationalSettings ?? {
      allowNegativeStock: false,
      requireExpenseApproval: false,
      requireDiscountApproval: false,
      enableInventoryTracking: true,
      enableLowStockAlerts: true,
      enableBatchTracking: false,
      enableExpiryTracking: false,
    },
  });

  await recordAudit({
    actorId: req.authUserId,
    action: "create",
    entityType: "company",
    entityId: String(company._id),
  });

  sendSuccess(res, company, 201);
});

export const updateCompany = catchAsync(async (req, res) => {
  const company = await Company.findOne();
  if (!company) throw new AppError("Company not found", 404);

  const allowed = [
    "name",
    "legalName",
    "registrationNumber",
    "taxId",
    "logoUrl",
    "website",
    "email",
    "phone",
    "address",
    "industry",
    "businessType",
    "description",
    "currency",
    "taxRate",
    "bankAccounts",
    "paymentMethods",
    "invoiceSettings",
    "quotationSettings",
    "purchaseOrderSettings",
    "saleNumberSettings",
    "notificationSettings",
    "operationalSettings",
  ] as const;

  for (const k of allowed) {
    if (req.body[k] !== undefined) {
      (company as unknown as Record<string, unknown>)[k] = req.body[k];
    }
  }

  await company.save();

  await recordAudit({
    actorId: req.authUserId,
    action: "update",
    entityType: "company",
    entityId: String(company._id),
  });

  sendSuccess(res, company);
});
