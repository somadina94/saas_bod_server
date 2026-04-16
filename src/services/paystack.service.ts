import crypto from "crypto";
import { env } from "../config/env.js";
import AppError from "../utils/appError.js";

const PAYSTACK_BASE = "https://api.paystack.co";

/** Platform Paystack — subscription billing only (keys from `.env`). */
export const platformPaystack = {
  secretKey: (): string => env.paystackSecretKey(),
};

/** Verify Paystack webhook HMAC for a given secret (platform or tenant). */
export const verifyWebhookSignatureWithSecret = (
  rawBody: string | Buffer,
  signature: string | undefined,
  secretKey: string,
): boolean => {
  if (!secretKey || !signature) return false;
  const hash = crypto
    .createHmac("sha512", secretKey)
    .update(rawBody)
    .digest("hex");
  return hash === signature;
};

/** @deprecated Use verifyWebhookSignatureWithSecret + tenant secret */
export const verifyWebhookSignature = (
  rawBody: string | Buffer,
  signature: string | undefined,
): boolean =>
  verifyWebhookSignatureWithSecret(
    rawBody,
    signature,
    platformPaystack.secretKey(),
  );

export const initializeTransaction = async (params: {
  secretKey: string;
  email: string;
  amount: number;
  currency?: string;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}) => {
  if (!params.secretKey) throw new AppError("Paystack is not configured", 500);

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
      Authorization: `Bearer ${params.secretKey}`,
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

/** Platform subscription checkout (uses env secret only). */
export const platformInitializeTransaction = async (params: {
  email: string;
  amount: number;
  currency?: string;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}) => {
  const secret = platformPaystack.secretKey();
  if (!secret) throw new AppError("Platform Paystack is not configured", 500);
  return initializeTransaction({ secretKey: secret, ...params });
};

export const verifyTransaction = async (
  reference: string,
  secretKey: string,
) => {
  if (!secretKey) throw new AppError("Paystack is not configured", 500);

  const res = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secretKey}` },
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

export const platformVerifyTransaction = async (reference: string) => {
  const secret = platformPaystack.secretKey();
  if (!secret) throw new AppError("Platform Paystack is not configured", 500);
  return verifyTransaction(reference, secret);
};

/** Lightweight API call to validate tenant secret (balance endpoint). */
export const validateSecretKey = async (secretKey: string): Promise<boolean> => {
  try {
    const res = await fetch(`${PAYSTACK_BASE}/balance`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const json = (await res.json()) as { status?: boolean };
    return json.status === true;
  } catch {
    return false;
  }
};
