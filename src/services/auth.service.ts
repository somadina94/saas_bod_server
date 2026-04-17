import bcrypt from "bcryptjs";
import crypto from "crypto";
import mongoose from "mongoose";
import User from "../models/User.model.js";
import Company from "../models/Company.model.js";
import Subscription from "../models/Subscription.model.js";
import type { IUser } from "../models/User.model.js";
import { defaultPermissionsForRole, mergePermissionOverrides } from "../constants/permissions.js";
import { env } from "../config/env.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { sha256Hex, randomToken } from "../utils/crypto.js";
import AppError from "../utils/appError.js";
import { recordAudit } from "./auditLog.service.js";
import type { UserRole } from "../types/user.js";
import type { IndustryType } from "../types/company.js";
import Email from "../utils/email.js";
import { isEmailConfigured } from "../utils/email.js";
import { notifyStaffInvitation } from "./emailNotifications.service.js";

const SALT_ROUNDS = 12;

export const hashPassword = async (plain: string): Promise<string> =>
  bcrypt.hash(plain, SALT_ROUNDS);

export const comparePassword = async (
  plain: string,
  hash: string,
): Promise<boolean> => bcrypt.compare(plain, hash);

const workspaceSlug = (companyName: string): string => {
  const base =
    companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "workspace";
  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
};

/** Open registration: new company + owner user + trial subscription. */
export const registerCompany = async (params: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyName: string;
  industry?: string;
  currency?: string;
}) => {
  const existing = await User.findOne({ email: params.email.toLowerCase() });
  if (existing) {
    throw new AppError("An account with this email already exists", 400);
  }

  const passwordHash = await hashPassword(params.password);
  const role: UserRole = "owner";
  const permissions = defaultPermissionsForRole(role);

  const trialDays = env.billingTrialDays();
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + trialDays);

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const company = await Company.create(
      [
        {
          slug: workspaceSlug(params.companyName),
          name: params.companyName,
          industry: ((params.industry as IndustryType | undefined) ?? "other") as IndustryType,
          currency: params.currency ?? "NGN",
          address: {},
          bankAccounts: [],
          paymentMethods: [],
          invoiceSettings: {
            prefix: "INV",
            nextNumber: 0,
            dueDays: 14,
            showLogo: true,
            showBankDetails: true,
          },
          notificationSettings: {
            emailEnabled: true,
            smsEnabled: false,
            whatsappEnabled: false,
            sendInvoiceReminders: true,
            sendPaymentConfirmations: true,
            sendLowStockAlerts: true,
          },
          operationalSettings: {
            allowNegativeStock: false,
            requireExpenseApproval: false,
            requireDiscountApproval: false,
            enableInventoryTracking: true,
            enableLowStockAlerts: true,
            enableBatchTracking: false,
            enableExpiryTracking: false,
          },
        },
      ],
      { session },
    );

    const comp = company[0]!;

    const userArr = await User.create(
      [
        {
          companyId: comp._id,
          firstName: params.firstName,
          lastName: params.lastName,
          email: params.email,
          passwordHash,
          role,
          permissions,
          isOwner: true,
          status: "active",
          emailVerified: false,
          phoneVerified: false,
          twoFactorEnabled: false,
          failedLoginAttempts: 0,
          notificationPreferences: {
            email: true,
            sms: false,
            whatsapp: false,
            push: false,
          },
        },
      ],
      { session },
    );

    await Subscription.create(
      [
        {
          companyId: comp._id,
          plan: "standard",
          interval: "monthly",
          status: "trialing",
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEnd,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    const user = userArr[0]!;

    const tokens = await issueTokens(user);

    await recordAudit({
      actorId: String(user._id),
      action: "create",
      entityType: "auth",
      metadata: { event: "register_company", companyId: String(comp._id) },
    });

    return { user: sanitizeUser(user), company: comp, ...tokens };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

export const sanitizeUser = (user: IUser) => {
  const u = user as unknown as { toJSON?: () => Record<string, unknown> };
  const obj =
    typeof u.toJSON === "function"
      ? u.toJSON()
      : ({ ...(user as object) } as Record<string, unknown>);
  delete obj.passwordHash;
  delete obj.refreshTokenHash;
  if (user.companyId) {
    obj.companyId = String(user.companyId);
  }
  return obj;
};

export const issueTokens = async (user: IUser) => {
  const jti = randomToken(16);
  const accessToken = signAccessToken({
    sub: String(user._id),
    companyId: String(user.companyId),
    role: user.role,
    permissions: user.permissions,
  });
  const refreshToken = signRefreshToken({ sub: String(user._id), jti });
  const refreshTokenHash = sha256Hex(refreshToken);
  const refreshExpiry = new Date();
  refreshExpiry.setDate(refreshExpiry.getDate() + 7);

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        refreshTokenHash,
        refreshTokenExpiresAt: refreshExpiry,
        lastActiveAt: new Date(),
      },
    },
  );

  return { accessToken, refreshToken, expiresIn: env.jwtExpiresIn };
};

export const login = async (params: {
  email: string;
  password: string;
  ip?: string;
  userAgent?: string;
}) => {
  const user = await User.findOne({ email: params.email.toLowerCase() }).select(
    "+passwordHash",
  );
  if (!user) {
    throw new AppError("Incorrect email or password", 401);
  }

  if (user.status !== "active") {
    throw new AppError("Account is not active", 403);
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    throw new AppError("Account temporarily locked. Try again later.", 403);
  }

  const ok = await comparePassword(params.password, user.passwordHash);
  if (!ok) {
    await User.updateOne(
      { _id: user._id },
      { $inc: { failedLoginAttempts: 1 } },
    );
    throw new AppError("Incorrect email or password", 401);
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
        lastLoginIp: params.ip,
        lastActiveAt: new Date(),
      },
      $unset: { lockUntil: 1 },
    },
  );

  const fresh = await User.findById(user._id);
  if (!fresh) throw new AppError("User not found", 404);

  const tokens = await issueTokens(fresh);

  await recordAudit({
    actorId: String(fresh._id),
    action: "login",
    entityType: "auth",
    metadata: { email: fresh.email },
    ip: params.ip,
    userAgent: params.userAgent,
  });

  return { user: sanitizeUser(fresh), ...tokens };
};

export const refreshSession = async (refreshToken: string) => {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid refresh token", 401);
  }

  const user = await User.findById(payload.sub).select("+refreshTokenHash");
  if (!user || !user.refreshTokenHash) {
    throw new AppError("Invalid refresh token", 401);
  }

  if (
    user.refreshTokenExpiresAt &&
    user.refreshTokenExpiresAt < new Date()
  ) {
    throw new AppError("Refresh token expired", 401);
  }

  const hash = sha256Hex(refreshToken);
  if (hash !== user.refreshTokenHash) {
    throw new AppError("Invalid refresh token", 401);
  }

  return issueTokens(user);
};

export const logout = async (userId: string) => {
  await User.updateOne(
    { _id: userId },
    { $unset: { refreshTokenHash: 1, refreshTokenExpiresAt: 1 } },
  );
  await recordAudit({
    actorId: userId,
    action: "logout",
    entityType: "auth",
  });
};

export const requestPasswordReset = async (email: string) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return { message: "If an account exists, a reset email will be sent." };
  }

  const raw = randomToken(32);
  const hashed = sha256Hex(raw);
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordResetToken: hashed,
        passwordResetExpiresAt: expires,
      },
    },
  );

  const resetUrl = `${env.frontendUrl}/reset-password?token=${raw}&email=${encodeURIComponent(user.email)}`;

  try {
    await new Email(
      {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      "",
    ).sendPasswordReset(resetUrl);
  } catch {
    if (env.nodeEnv === "development") {
      return {
        message: "If an account exists, a reset email will be sent.",
        resetUrl,
      };
    }
    throw new AppError("Email could not be sent. Try again later.", 500);
  }

  return { message: "If an account exists, a reset email will be sent.", resetUrl: env.nodeEnv === "development" ? resetUrl : undefined };
};

export const resetPasswordWithToken = async (params: {
  email: string;
  token: string;
  password: string;
}) => {
  const user = await User.findOne({
    email: params.email.toLowerCase(),
  }).select("+passwordResetToken");

  if (
    !user ||
    !user.passwordResetToken ||
    !user.passwordResetExpiresAt ||
    user.passwordResetExpiresAt < new Date()
  ) {
    throw new AppError("Token is invalid or has expired", 400);
  }

  const hashed = sha256Hex(params.token);
  if (hashed !== user.passwordResetToken) {
    throw new AppError("Token is invalid or has expired", 400);
  }

  const passwordHash = await hashPassword(params.password);
  await User.updateOne(
    { _id: user._id },
    {
      $set: { passwordHash },
      $unset: {
        passwordResetToken: 1,
        passwordResetExpiresAt: 1,
        refreshTokenHash: 1,
        refreshTokenExpiresAt: 1,
      },
    },
  );

  await recordAudit({
    actorId: String(user._id),
    action: "password_reset",
    entityType: "auth",
  });
};

export const changePassword = async (params: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}) => {
  const user = await User.findById(params.userId).select("+passwordHash");
  if (!user) throw new AppError("User not found", 404);

  const ok = await comparePassword(params.currentPassword, user.passwordHash);
  if (!ok) throw new AppError("Current password is incorrect", 400);

  const passwordHash = await hashPassword(params.newPassword);
  await User.updateOne(
    { _id: user._id },
    {
      $set: { passwordHash },
      $unset: { refreshTokenHash: 1, refreshTokenExpiresAt: 1 },
    },
  );

  await recordAudit({
    actorId: String(user._id),
    action: "update",
    entityType: "user",
    entityId: String(user._id),
    metadata: { field: "password" },
  });
};

export const updateProfile = async (params: {
  userId: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  timezone?: string;
  language?: string;
  notificationPreferences?: IUser["notificationPreferences"];
}) => {
  const updates: Record<string, unknown> = {};
  if (params.firstName !== undefined) updates.firstName = params.firstName;
  if (params.lastName !== undefined) updates.lastName = params.lastName;
  if (params.phone !== undefined) updates.phone = params.phone;
  if (params.timezone !== undefined) updates.timezone = params.timezone;
  if (params.language !== undefined) updates.language = params.language;
  if (params.notificationPreferences !== undefined) {
    updates.notificationPreferences = params.notificationPreferences;
  }

  const user = await User.findByIdAndUpdate(params.userId, updates, {
    new: true,
  });
  if (!user) throw new AppError("User not found", 404);
  return sanitizeUser(user);
};

export const acceptInvitation = async (params: {
  email: string;
  token: string;
  newPassword: string;
}) => {
  const user = await User.findOne({
    email: params.email.toLowerCase(),
  }).select("+invitationToken");

  if (!user || user.status !== "invited") {
    throw new AppError("Invalid invitation", 400);
  }
  if (
    !user.invitationToken ||
    !user.invitationExpiresAt ||
    user.invitationExpiresAt < new Date()
  ) {
    throw new AppError("Invitation expired", 400);
  }

  const hash = sha256Hex(params.token);
  if (hash !== user.invitationToken) {
    throw new AppError("Invalid invitation token", 400);
  }

  const passwordHash = await hashPassword(params.newPassword);
  await User.updateOne(
    { _id: user._id },
    {
      $set: { passwordHash, status: "active" },
      $unset: {
        invitationToken: 1,
        invitationExpiresAt: 1,
      },
    },
  );

  await recordAudit({
    actorId: String(user._id),
    action: "update",
    entityType: "user",
    entityId: String(user._id),
    metadata: { event: "invitation_accepted" },
  });

  const fresh = await User.findById(user._id);
  if (!fresh) throw new AppError("User not found", 404);
  return issueTokens(fresh);
};

export const createStaffUser = async (params: {
  invitedBy: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  permissionOverrides?: Partial<IUser["permissions"]>;
  department?: string;
  jobTitle?: string;
}) => {
  if (!isEmailConfigured()) {
    throw new AppError(
      "Invitation email is unavailable. Configure SMTP before inviting staff.",
      500,
    );
  }

  const inviter = await User.findById(params.invitedBy);
  if (!inviter?.companyId) {
    throw new AppError("Inviter workspace is invalid", 500);
  }

  const existing = await User.findOne({ email: params.email.toLowerCase() });
  if (existing) throw new AppError("Email already in use", 400);

  const tempPassword = randomToken(8);
  const passwordHash = await hashPassword(tempPassword);
  const basePerms = defaultPermissionsForRole(params.role);
  const permissions = mergePermissionOverrides(
    basePerms,
    params.permissionOverrides,
  );

  const rawToken = randomToken(32);
  const invitationTokenHash = sha256Hex(rawToken);
  const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const user = await User.create({
    companyId: inviter.companyId,
    firstName: params.firstName,
    lastName: params.lastName,
    email: params.email.toLowerCase(),
    passwordHash,
    role: params.role,
    permissions,
    isOwner: false,
    status: "invited",
    emailVerified: false,
    phoneVerified: false,
    twoFactorEnabled: false,
    failedLoginAttempts: 0,
    invitedBy: params.invitedBy,
    invitedAt: new Date(),
    invitationToken: invitationTokenHash,
    invitationExpiresAt,
    notificationPreferences: {
      email: true,
      sms: false,
      whatsapp: false,
      push: false,
    },
    department: params.department,
    jobTitle: params.jobTitle,
  });

  await recordAudit({
    actorId: String(params.invitedBy),
    action: "create",
    entityType: "user",
    entityId: String(user._id),
    metadata: { email: user.email, role: user.role },
  });

  const invitationLink = `${env.frontendUrl}/accept-invite?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

  const inviterCompany = await Company.findById(inviter.companyId);

  try {
    await notifyStaffInvitation({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      invitationUrl: invitationLink,
      role: user.role,
      companyName: inviterCompany?.name ?? env.companyName,
      logoUrl: inviterCompany?.logoUrl,
    });
  } catch {
    // Do not leave a dangling invited account when email dispatch fails.
    await User.deleteOne({ _id: user._id });
    throw new AppError(
      "Invitation email could not be sent. Please verify SMTP settings and try again.",
      502,
    );
  }

  return {
    user: sanitizeUser(user),
  };
};
