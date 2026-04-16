import crypto from "crypto";
import { env } from "../config/env.js";

const ALG = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

const keyBuffer = (): Buffer => {
  const k = env.encryptionKeyBytes();
  if (k.length !== 32) {
    throw new Error("ENCRYPTION_KEY must resolve to 32 bytes");
  }
  return k;
};

/** Encrypt UTF-8 string for storage (AES-256-GCM). */
export const encryptField = (plain: string): string => {
  const key = keyBuffer();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
};

export const decryptField = (stored: string): string => {
  const key = keyBuffer();
  const buf = Buffer.from(stored, "base64url");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
};
