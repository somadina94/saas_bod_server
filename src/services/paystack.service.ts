import crypto from "crypto";
import { env } from "../config/env.js";
import AppError from "../utils/appError.js";

const PAYSTACK_BASE = "https://api.paystack.co";

export const verifyWebhookSignature = (
  rawBody: string | Buffer,
  signature: string | undefined,
): boolean => {
  const secret = env.paystackSecretKey();
  if (!secret || !signature) return false;
  const hash = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");
  return hash === signature;
};

export const initializeTransaction = async (params: {
  email: string;
  amount: number;
  currency?: string;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}) => {
  const secret = env.paystackSecretKey();
  if (!secret) throw new AppError("Paystack is not configured", 500);

  const body = {
    email: params.email,
    amount: Math.round(params.amount * 100),
    reference: params.reference,
    currency: params.currency ?? "NGN",
    callback_url: params.callbackUrl,
    metadata: params.metadata,
  };

  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as {
    status: boolean;
    message?: string;
    data?: { authorization_url?: string; access_code?: string; reference?: string };
  };

  if (!json.status || !json.data?.authorization_url) {
    throw new AppError(json.message ?? "Paystack initialization failed", 400);
  }

  return {
    authorizationUrl: json.data.authorization_url,
    accessCode: json.data.access_code,
    reference: json.data.reference ?? params.reference,
  };
};

export const verifyTransaction = async (reference: string) => {
  const secret = env.paystackSecretKey();
  if (!secret) throw new AppError("Paystack is not configured", 500);

  const res = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secret}` },
    },
  );

  const json = (await res.json()) as {
    status: boolean;
    message?: string;
    data?: {
      status?: string;
      amount?: number;
      currency?: string;
      reference?: string;
      metadata?: Record<string, unknown>;
    };
  };

  if (!json.status || !json.data) {
    throw new AppError(json.message ?? "Verification failed", 400);
  }

  return {
    status: json.data.status,
    amount: json.data.amount,
    currency: json.data.currency,
    reference: json.data.reference,
    metadata: json.data.metadata,
  };
};
