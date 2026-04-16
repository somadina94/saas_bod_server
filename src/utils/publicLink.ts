import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

type PublicResource = "quotation" | "invoice";

interface PublicLinkPayload {
  typ: "public";
  res: PublicResource;
  docId: string;
  customerId: string;
}

export const signPublicLinkToken = (params: {
  resource: PublicResource;
  docId: string;
  customerId: string;
}): string => {
  const opts = { expiresIn: env.publicLinkExpiresIn } as SignOptions;
  return jwt.sign(
    {
      typ: "public",
      res: params.resource,
      docId: params.docId,
      customerId: params.customerId,
    } satisfies PublicLinkPayload,
    env.publicLinkSecret,
    opts,
  );
};

export const verifyPublicLinkToken = (
  token: string,
): PublicLinkPayload => {
  const decoded = jwt.verify(token, env.publicLinkSecret) as PublicLinkPayload;
  if (decoded.typ !== "public") throw new Error("Invalid token type");
  if (!decoded.res || !decoded.docId || !decoded.customerId) {
    throw new Error("Invalid token payload");
  }
  return decoded;
};
