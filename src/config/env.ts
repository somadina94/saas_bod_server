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

  paystackSecretKey: () => process.env.PAYSTACK_SECRET_KEY ?? "",
  paystackPublicKey: () => process.env.PAYSTACK_PUBLIC_KEY ?? "",
  paystackWebhookSecret: () => process.env.PAYSTACK_WEBHOOK_SECRET ?? "",

  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  apiUrl: process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 6610}`,

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
    return process.env.COMPANY_NAME ?? "BOD";
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
