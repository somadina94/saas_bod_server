import catchAsync from "../utils/catchAsync.js";
import { sendSuccess } from "../utils/apiResponse.js";
import * as billingService from "../services/billing.service.js";
import { env } from "../config/env.js";
import AppError from "../utils/appError.js";
import type { SubscriptionInterval } from "../models/Subscription.model.js";

export const getSubscription = catchAsync(async (req, res) => {
  const sub = await billingService.getSubscriptionForCompany(req.authCompanyId!);
  sendSuccess(res, {
    subscription: sub,
    pricing: {
      monthlyNgn: env.billingPlanMonthlyNgn(),
      yearlyNgn: env.billingPlanYearlyNgn(),
      currency: "NGN",
    },
  });
});

export const checkout = catchAsync(async (req, res) => {
  const interval = req.body.interval as SubscriptionInterval | undefined;
  if (interval !== "monthly" && interval !== "yearly") {
    throw new AppError("interval must be monthly or yearly", 400);
  }
  const init = await billingService.createPlatformCheckout({
    companyId: req.authCompanyId!,
    interval,
  });
  sendSuccess(res, {
    authorizationUrl: init.authorizationUrl,
    accessCode: init.accessCode,
    reference: init.reference,
  });
});
