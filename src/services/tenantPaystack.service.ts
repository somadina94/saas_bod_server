import Company from "../models/Company.model.js";
import { decryptField } from "../utils/fieldEncryption.js";

/** Resolve tenant secret for invoice/customer Paystack flows. */
export const getTenantPaystackSecret = async (
  companyId: string,
): Promise<string | null> => {
  const c = await Company.findById(companyId).select(
    "+paystackSecretKeyEncrypted",
  );
  if (!c?.paystackSecretKeyEncrypted) return null;
  try {
    return decryptField(c.paystackSecretKeyEncrypted);
  } catch {
    return null;
  }
};

export const getTenantPaystackPublicKey = async (
  companyId: string,
): Promise<string | undefined> => {
  const c = await Company.findById(companyId).select("paystackPublicKey");
  return c?.paystackPublicKey ?? undefined;
};
