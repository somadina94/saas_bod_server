import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import Company from "../models/Company.model.js";
import Subscription from "../models/Subscription.model.js";

/**
 * Blocks dashboard API when there is no active / trialing subscription.
 * Billing routes register this middleware separately (not used there).
 */
export const requireActiveSubscription = catchAsync(async (req, _res, next) => {
  const companyId = req.authCompanyId;
  if (!companyId) {
    next(new AppError("Workspace context required", 403));
    return;
  }

  const company = await Company.findById(companyId).select(
    "subscriptionBypassUntil",
  );
  if (
    company?.subscriptionBypassUntil &&
    company.subscriptionBypassUntil > new Date()
  ) {
    next();
    return;
  }

  const sub = await Subscription.findOne({ companyId }).sort({ createdAt: -1 });
  if (!sub) {
    next(
      new AppError(
        "An active subscription is required to use BOD. Open Billing to continue.",
        402,
      ),
    );
    return;
  }

  const now = new Date();
  const periodOk = sub.currentPeriodEnd && sub.currentPeriodEnd > now;
  const graceOk =
    sub.gracePeriodEndsAt && sub.gracePeriodEndsAt > now;

  if (
    (sub.status === "trialing" || sub.status === "active") &&
    periodOk
  ) {
    next();
    return;
  }

  if (sub.status === "past_due" && graceOk) {
    next();
    return;
  }

  next(
    new AppError(
      "Your subscription is not active. Renew from Billing to continue.",
      402,
    ),
  );
});
