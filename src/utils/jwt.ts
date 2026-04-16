import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import type { UserRole } from "../types/user.js";
import type { UserPermissions } from "../types/user.js";

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  permissions: UserPermissions;
  typ: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  typ: "refresh";
  jti: string;
}

export const signAccessToken = (payload: Omit<AccessTokenPayload, "typ">) => {
  const secret = env.jwtSecret();
  const opts = { expiresIn: env.jwtExpiresIn } as SignOptions;
  return jwt.sign(
    { ...payload, typ: "access" } satisfies AccessTokenPayload,
    secret,
    opts,
  );
};

export const signRefreshToken = (payload: Omit<RefreshTokenPayload, "typ">) => {
  const secret = env.jwtRefreshSecret();
  const opts = { expiresIn: env.jwtRefreshExpiresIn } as SignOptions;
  return jwt.sign(
    { ...payload, typ: "refresh" } satisfies RefreshTokenPayload,
    secret,
    opts,
  );
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const decoded = jwt.verify(token, env.jwtSecret()) as AccessTokenPayload;
  if (decoded.typ !== "access") throw new Error("Invalid token type");
  return decoded;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const decoded = jwt.verify(token, env.jwtRefreshSecret()) as RefreshTokenPayload;
  if (decoded.typ !== "refresh") throw new Error("Invalid token type");
  return decoded;
};
