import catchAsync from "../utils/catchAsync.js";
import { sendSuccess } from "../utils/apiResponse.js";
import * as paystackService from "../services/paystack.service.js";
import * as billingService from "../services/billing.service.js";
import AppError from "../utils/appError.js";

/** Platform Paystack webhook — subscription charges only (`.env` secret). */
export const platformBillingWebhook = catchAsync(async (req, res) => {
  const signature = req.headers["x-paystack-signature"] as string | undefined;
  const raw = Buffer.isBuffer(req.body)
    ? req.body.toString("utf8")
    : String(req.body ?? "");

  if (
    !paystackService.verifyWebhookSignatureWithSecret(
      raw,
      signature,
      paystackService.platformPaystack.secretKey(),
    )
  ) {
    throw new AppError("Invalid signature", 400);
  }

  const event = JSON.parse(raw) as {
    event?: string;
    data?: { reference?: string };
  };

  if (event.event === "charge.success" && event.data?.reference) {
    await billingService.applyPlatformChargeSuccess(event.data.reference);
  }

  sendSuccess(res, { received: true });
});
