import crypto from "crypto";

const required = (name: string): string => {
  const v = process.env[name];
  if (v === undefined || v === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
};

/** Treat unset and whitespace-only the same as missing (common `.env` mistake: `JWT_REFRESH_SECRET=`). */
const nonEmpty = (v: string | undefined): string | undefined => {
  if (v === undefined) return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 6610),
  isProd: process.env.NODE_ENV === "production",

  databaseUrl: (): string => {
    const template = required("DATABASE");
    const password = required("DATABASE_PASSWORD");
    return template.replace("<password>", encodeURIComponent(password));
  },

  jwtSecret: () => required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
  /** Falls back to JWT_SECRET when unset or empty (empty string does not work with `??` alone). */
  jwtRefreshSecret: () =>
    nonEmpty(process.env.JWT_REFRESH_SECRET) ?? required("JWT_SECRET"),
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  get publicLinkSecret() {
    return nonEmpty(process.env.PUBLIC_LINK_SECRET) ?? required("JWT_SECRET");
  },
  publicLinkExpiresIn: process.env.PUBLIC_LINK_EXPIRES_IN ?? "14d",

  /** Platform (JAHBYTE BOD) Paystack — subscription billing only. */
  paystackSecretKey: () => process.env.PAYSTACK_SECRET_KEY ?? "",
  paystackPublicKey: () => process.env.PAYSTACK_PUBLIC_KEY ?? "",
  paystackWebhookSecret: () => process.env.PAYSTACK_WEBHOOK_SECRET ?? "",

  /**
   * 32-byte key for AES-256-GCM (tenant Paystack secret at rest).
   * Prefer 64 hex chars. If unset in development, derives from JWT_SECRET via SHA-256 (not for production).
   */
  encryptionKeyBytes: (): Buffer => {
    const hex = nonEmpty(process.env.ENCRYPTION_KEY);
    if (hex && /^[0-9a-fA-F]{64}$/.test(hex)) {
      return Buffer.from(hex, "hex");
    }
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY (64 hex chars) is required in production");
    }
    return crypto.createHash("sha256").update(required("JWT_SECRET")).digest();
  },

  /** NGN amounts for platform subscription (override via env). */
  billingPlanMonthlyNgn: () =>
    Number(process.env.BOD_PLAN_MONTHLY_NGN ?? "15000"),
  billingPlanYearlyNgn: () =>
    Number(process.env.BOD_PLAN_YEARLY_NGN ?? "150000"),
  billingTrialDays: () => Number(process.env.BOD_TRIAL_DAYS ?? "14"),

  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  apiUrl: process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 6610}`,

  /** Max multipart upload size (MB). Match Nginx `client_max_body_size` and available RAM. */
  maxUploadBytes: (): number => {
    const raw = process.env.MAX_UPLOAD_MB;
    const mb =
      raw !== undefined && raw !== "" ? Number(raw) : 150;
    if (!Number.isFinite(mb) || mb < 1) return 150 * 1024 * 1024;
    const capped = Math.min(mb, 500);
    return Math.floor(capped * 1024 * 1024);
  },

  get emailHost() {
    return process.env.EMAIL_HOST;
  },
  get emailPort() {
    return process.env.EMAIL_PORT;
  },
  get emailSecure() {
    return process.env.EMAIL_SECURE;
  },
  get emailRequireTls() {
    return process.env.EMAIL_REQUIRE_TLS;
  },
  get emailTlsRejectUnauthorized() {
    return process.env.EMAIL_TLS_REJECT_UNAUTHORIZED;
  },
  get emailAddress() {
    return process.env.EMAIL_ADDRESS;
  },
  get emailFrom() {
    return process.env.EMAIL_FROM ?? process.env.EMAIL_ADDRESS;
  },
  get emailPassword() {
    return process.env.EMAIL_PASSWORD;
  },
  get companyName() {
    return process.env.COMPANY_NAME ?? "JAHBYTE BOD";
  },

  get b2ApplicationKeyId() {
    return process.env.B2_APPLICATION_KEY_ID;
  },
  get b2ApplicationKey() {
    return process.env.B2_APPLICATION_KEY;
  },
  get b2BucketId() {
    return process.env.B2_BUCKET_ID;
  },
  get b2BucketName() {
    return process.env.B2_BUCKET_NAME;
  },
  get b2PublicBaseUrl() {
    return process.env.B2_PUBLIC_BASE_URL;
  },
};
