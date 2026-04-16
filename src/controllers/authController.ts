import catchAsync from "../utils/catchAsync.js";
import { sendSuccess } from "../utils/apiResponse.js";
import * as authService from "../services/auth.service.js";
import AppError from "../utils/appError.js";
import { isValidEmail } from "../utils/validateEmail.js";

export const registerBootstrap = catchAsync(async (req, res) => {
  const b = req.body as Record<string, unknown>;
  if (
    !b.firstName ||
    !b.lastName ||
    !isValidEmail(b.email) ||
    typeof b.password !== "string" ||
    b.password.length < 8 ||
    !b.companyName
  ) {
    throw new AppError(
      "firstName, lastName, valid email, password (min 8 chars), and companyName are required",
      400,
    );
  }
  const result = await authService.registerCompany({
    firstName: String(b.firstName),
    lastName: String(b.lastName),
    email: b.email,
    password: b.password,
    companyName: String(b.companyName),
    industry: b.industry !== undefined ? String(b.industry) : undefined,
    currency: b.currency !== undefined ? String(b.currency) : undefined,
  });
  sendSuccess(res, result, 201);
});

export const login = catchAsync(async (req, res) => {
  const b = req.body as Record<string, unknown>;
  if (!isValidEmail(b.email) || typeof b.password !== "string") {
    throw new AppError("Valid email and password are required", 400);
  }
  const result = await authService.login({
    email: b.email,
    password: b.password,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
  sendSuccess(res, result);
});

export const refresh = catchAsync(async (req, res) => {
  const b = req.body as Record<string, unknown>;
  if (typeof b.refreshToken !== "string" || !b.refreshToken) {
    throw new AppError("refreshToken is required", 400);
  }
  const result = await authService.refreshSession(b.refreshToken);
  sendSuccess(res, result);
});

export const logout = catchAsync(async (req, res) => {
  if (!req.authUserId) throw new AppError("Not authenticated", 401);
  await authService.logout(req.authUserId);
  sendSuccess(res, { message: "Logged out" });
});

export const forgotPassword = catchAsync(async (req, res) => {
  const b = req.body as Record<string, unknown>;
  if (!isValidEmail(b.email)) {
    throw new AppError("Valid email is required", 400);
  }
  const result = await authService.requestPasswordReset(b.email);
  sendSuccess(res, result);
});

export const resetPassword = catchAsync(async (req, res) => {
  const b = req.body as Record<string, unknown>;
  if (
    !isValidEmail(b.email) ||
    typeof b.token !== "string" ||
    typeof b.password !== "string" ||
    b.password.length < 8
  ) {
    throw new AppError("email, token, and password (min 8) are required", 400);
  }
  await authService.resetPasswordWithToken({
    email: b.email,
    token: b.token,
    password: b.password,
  });
  sendSuccess(res, { message: "Password updated" });
});

export const changePassword = catchAsync(async (req, res) => {
  if (!req.authUserId) throw new AppError("Not authenticated", 401);
  const b = req.body as Record<string, unknown>;
  if (
    typeof b.currentPassword !== "string" ||
    typeof b.newPassword !== "string" ||
    b.newPassword.length < 8
  ) {
    throw new AppError("currentPassword and newPassword (min 8) are required", 400);
  }
  await authService.changePassword({
    userId: req.authUserId,
    currentPassword: b.currentPassword,
    newPassword: b.newPassword,
  });
  sendSuccess(res, { message: "Password updated" });
});

export const me = catchAsync(async (req, res) => {
  if (!req.authUser) throw new AppError("Not authenticated", 401);
  sendSuccess(res, authService.sanitizeUser(req.authUser));
});

export const updateMe = catchAsync(async (req, res) => {
  if (!req.authUserId) throw new AppError("Not authenticated", 401);
  const user = await authService.updateProfile({
    userId: req.authUserId,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    phone: req.body.phone,
    timezone: req.body.timezone,
    language: req.body.language,
    notificationPreferences: req.body.notificationPreferences,
  });
  sendSuccess(res, user);
});

export const acceptInvite = catchAsync(async (req, res) => {
  const b = req.body as Record<string, unknown>;
  if (
    !isValidEmail(b.email) ||
    typeof b.token !== "string" ||
    typeof b.newPassword !== "string" ||
    b.newPassword.length < 8
  ) {
    throw new AppError("email, token, and newPassword (min 8) are required", 400);
  }
  const tokens = await authService.acceptInvitation({
    email: b.email,
    token: b.token,
    newPassword: b.newPassword,
  });
  sendSuccess(res, tokens);
});
