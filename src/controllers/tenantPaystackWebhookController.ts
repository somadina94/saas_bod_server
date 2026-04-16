import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync.js";
import { sendSuccess } from "../utils/apiResponse.js";
import * as paystackService from "../services/paystack.service.js";
import * as tenantPaystack from "../services/tenantPaystack.service.js";
import * as paymentService from "../services/payment.service.js";
import Invoice from "../models/Invoice.model.js";
import AppError from "../utils/appError.js";

/**
 * Per-tenant Paystack webhook — URL includes `companyId`; HMAC uses that
 * merchant's secret key (Dashboard → API/Webhooks).
 */
export const tenantPaystackWebhook = catchAsync(async (req, res) => {
  const companyId = String(req.params.companyId);
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    throw new AppError("Invalid workspace", 400);
  }

  const secret = await tenantPaystack.getTenantPaystackSecret(companyId);
  if (!secret) {
    throw new AppError("Paystack is not configured for this workspace", 400);
  }

  const signature = req.headers["x-paystack-signature"] as string | undefined;
  const raw = Buffer.isBuffer(req.body)
    ? req.body.toString("utf8")
    : String(req.body ?? "");

  if (!paystackService.verifyWebhookSignatureWithSecret(raw, signature, secret)) {
    throw new AppError("Invalid signature", 400);
  }

  const event = JSON.parse(raw) as {
    event?: string;
    data?: { reference?: string };
  };

  if (event.event === "charge.success" && event.data?.reference) {
    const verified = await paystackService.verifyTransaction(
      event.data.reference,
      secret,
    );
    const meta = verified.metadata as Record<string, unknown> | undefined;
    const invoiceId =
      (meta?.invoiceId as string | undefined) ??
      (meta?.invoice_id as string | undefined);
    if (invoiceId && verified.status === "success") {
      const amount = (verified.amount ?? 0) / 100;
      const inv = await Invoice.findById(invoiceId);
      if (inv && String(inv.companyId) === companyId) {
        const dup = await paymentService.findCompletedByPaystackReference(
          event.data.reference,
        );
        if (!dup) {
          await paymentService.applyPaystackPaymentToInvoice({
            companyId: inv.companyId,
            invoiceId: inv._id,
            amount,
            currency: verified.currency ?? "NGN",
            reference: event.data.reference,
            customerId: inv.customerId,
          });
        }
      }
    }
  }

  sendSuccess(res, { received: true });
});
