import catchAsync from "../utils/catchAsync.js";
import { sendSuccess } from "../utils/apiResponse.js";
import Company from "../models/Company.model.js";
import AppError from "../utils/appError.js";
import { recordAudit } from "../services/auditLog.service.js";
import { env } from "../config/env.js";
import { decryptField, encryptField } from "../utils/fieldEncryption.js";
import * as paystackService from "../services/paystack.service.js";

export const getCompany = catchAsync(async (req, res) => {
  const company = await Company.findById(req.authCompanyId).select(
    "+paystackSecretKeyEncrypted",
  );
  if (!company) throw new AppError("Company not found", 404);

  const raw = company.toJSON() as unknown as Record<string, unknown>;
  raw.paystackSecretConfigured = Boolean(company.paystackSecretKeyEncrypted);
  delete raw.paystackSecretKeyEncrypted;

  const apiBase = env.apiUrl.replace(/\/$/, "");
  raw.tenantInvoiceCallbackUrl = `${env.frontendUrl.replace(/\/$/, "")}/payments/callback?companyId=${encodeURIComponent(req.authCompanyId!)}`;
  raw.tenantPaystackWebhookUrl = `${apiBase}/api/v1/webhooks/paystack/tenant/${req.authCompanyId}`;

  sendSuccess(res, raw);
});

export const createCompany = catchAsync(async (_req, res) => {
  void res;
  throw new AppError(
    "Workspaces are created using the registration flow.",
    403,
  );
});

export const updateCompany = catchAsync(async (req, res) => {
  const company = await Company.findById(req.authCompanyId).select(
    "+paystackSecretKeyEncrypted",
  );
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

  if (req.body.paystackPublicKey !== undefined) {
    company.paystackPublicKey =
      String(req.body.paystackPublicKey).trim() || undefined;
  }

  if (req.body.paystackSecretKey !== undefined) {
    const s = req.body.paystackSecretKey;
    if (typeof s === "string" && s.trim() === "") {
      company.paystackSecretKeyEncrypted = undefined;
    } else if (typeof s === "string" && s.length > 0) {
      company.paystackSecretKeyEncrypted = encryptField(s.trim());
      company.paystackWebhookConfiguredAt = new Date();
    }
    await recordAudit({
      actorId: req.authUserId,
      action: "update",
      entityType: "company",
      entityId: String(company._id),
      metadata: { event: "tenant_paystack_keys_updated" },
    });
  }

  await company.save();

  await recordAudit({
    actorId: req.authUserId,
    action: "update",
    entityType: "company",
    entityId: String(company._id),
  });

  const raw = company.toJSON() as unknown as Record<string, unknown>;
  raw.paystackSecretConfigured = Boolean(company.paystackSecretKeyEncrypted);
  delete raw.paystackSecretKeyEncrypted;

  const apiBase = env.apiUrl.replace(/\/$/, "");
  raw.tenantInvoiceCallbackUrl = `${env.frontendUrl.replace(/\/$/, "")}/payments/callback?companyId=${encodeURIComponent(req.authCompanyId!)}`;
  raw.tenantPaystackWebhookUrl = `${apiBase}/api/v1/webhooks/paystack/tenant/${req.authCompanyId}`;

  sendSuccess(res, raw);
});

export const testTenantPaystack = catchAsync(async (req, res) => {
  const company = await Company.findById(req.authCompanyId).select(
    "+paystackSecretKeyEncrypted",
  );
  if (!company?.paystackSecretKeyEncrypted) {
    throw new AppError("Save a Paystack secret key first.", 400);
  }
  const secret = decryptField(company.paystackSecretKeyEncrypted);
  const ok = await paystackService.validateSecretKey(secret);
  sendSuccess(res, { ok });
});
