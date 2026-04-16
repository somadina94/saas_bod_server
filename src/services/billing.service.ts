import mongoose from "mongoose";
import Subscription from "../models/Subscription.model.js";
import Company from "../models/Company.model.js";
import { env } from "../config/env.js";
import {
  platformInitializeTransaction,
  platformVerifyTransaction,
} from "./paystack.service.js";
import type { SubscriptionInterval } from "../models/Subscription.model.js";
import AppError from "../utils/appError.js";

const addBillingPeriod = (from: Date, interval: SubscriptionInterval): Date => {
  const d = new Date(from);
  if (interval === "monthly") d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
};

export const getSubscriptionForCompany = async (companyId: string) => {
  return Subscription.findOne({ companyId }).sort({ createdAt: -1 });
};

export const createPlatformCheckout = async (params: {
  companyId: string;
  interval: SubscriptionInterval;
}) => {
  const company = await Company.findById(params.companyId);
  if (!company) throw new AppError("Company not found", 404);

  const amount =
    params.interval === "monthly"
      ? env.billingPlanMonthlyNgn()
      : env.billingPlanYearlyNgn();

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError("Billing amount is not configured", 500);
  }

  const payerEmail =
    company.email?.trim() || env.emailAddress || "billing@example.com";
  const reference = `BOD_SUB_${params.companyId}_${Date.now()}`;

  return platformInitializeTransaction({
    email: payerEmail,
    amount,
    reference,
    callbackUrl: `${env.frontendUrl.replace(/\/$/, "")}/dashboard/billing/callback`,
    metadata: {
      type: "platform_subscription",
      companyId: params.companyId,
      interval: params.interval,
    },
  });
};

export const applyPlatformChargeSuccess = async (reference: string) => {
  const verified = await platformVerifyTransaction(reference);
  if (verified.status !== "success") return { applied: false };

  const meta = verified.metadata as Record<string, unknown> | undefined;
  if (meta?.type !== "platform_subscription") return { applied: false };

  const companyId = meta.companyId as string | undefined;
  const interval = meta.interval as SubscriptionInterval | undefined;
  if (!companyId || (interval !== "monthly" && interval !== "yearly")) {
    return { applied: false };
  }

  const cid = new mongoose.Types.ObjectId(companyId);

  const sub = await Subscription.findOne({ companyId: cid });
  if (sub?.lastPaystackReference === reference) {
    return { applied: true, duplicate: true };
  }

  const now = new Date();
  const periodEnd = addBillingPeriod(now, interval);

  await Subscription.findOneAndUpdate(
    { companyId: cid },
    {
      $set: {
        plan: "standard",
        interval,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        lastPaystackReference: reference,
        gracePeriodEndsAt: undefined,
      },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );

  return { applied: true };
};
