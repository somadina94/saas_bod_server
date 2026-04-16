import mongoose from "mongoose";

export type UserStatus =
  | "active"
  | "invited"
  | "suspended"
  | "disabled"
  | "deleted";

export type UserRole =
  | "owner"
  | "admin"
  | "manager"
  | "sales"
  | "inventory"
  | "accountant"
  | "support"
  | "viewer";

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
}

export interface ActiveSession {
  device?: string;
  ip?: string;
  userAgent?: string;
  lastActiveAt: Date;
  createdAt?: Date;
}

export interface UserPermissions {
  canManageUsers: boolean;
  canManageCompanySettings: boolean;
  canViewDashboard: boolean;

  canManageCustomers: boolean;
  canManageSuppliers: boolean;

  canManageProducts: boolean;
  canManageInventory: boolean;
  canAdjustStock: boolean;

  canCreateSales: boolean;
  canManageInvoices: boolean;
  canRecordPayments: boolean;

  canManagePurchases: boolean;
  canManageExpenses: boolean;
  canApproveExpenses: boolean;
  canApproveDiscounts: boolean;

  canViewReports: boolean;
  canExportReports: boolean;

  canViewAuditLogs: boolean;
}

export interface User {
  id: mongoose.Types.ObjectId;
  employeeId?: mongoose.Types.ObjectId;

  firstName: string;
  lastName: string;
  fullName?: string;

  email: string;
  phone?: string;
  profileImageUrl?: string;

  passwordHash: string;

  role: UserRole;
  permissions: UserPermissions;
  isOwner: boolean;

  department?: string;
  jobTitle?: string;

  status: UserStatus;

  emailVerified: boolean;
  phoneVerified: boolean;

  twoFactorEnabled: boolean;
  twoFactorSecret?: string;

  failedLoginAttempts: number;
  lockUntil?: Date;

  lastLoginAt?: Date;
  lastLoginIp?: string;
  lastActiveAt?: Date;

  activeSessions?: ActiveSession[];

  invitedBy?: mongoose.Types.ObjectId;
  invitedAt?: Date;
  invitationToken?: string;
  invitationExpiresAt?: Date;

  passwordResetToken?: string;
  passwordResetExpiresAt?: Date;

  /** SHA-256 hash of active refresh token (rotation on login) */
  refreshTokenHash?: string;
  refreshTokenExpiresAt?: Date;

  timezone?: string;
  language?: string;
  notificationPreferences: NotificationPreferences;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
