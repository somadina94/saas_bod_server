import mongoose, { Schema } from "mongoose";
import type {
  UserPermissions,
  UserRole,
  UserStatus,
  NotificationPreferences,
  ActiveSession,
} from "../types/user.js";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
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
  refreshTokenHash?: string;
  refreshTokenExpiresAt?: Date;
  timezone?: string;
  language?: string;
  notificationPreferences: NotificationPreferences;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const notificationPreferencesSchema = new Schema<NotificationPreferences>(
  {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
    push: { type: Boolean, default: false },
  },
  { _id: false },
);

const activeSessionSchema = new Schema<ActiveSession>(
  {
    device: String,
    ip: String,
    userAgent: String,
    lastActiveAt: { type: Date, required: true },
    createdAt: Date,
  },
  { _id: false },
);

const permissionsSchema = new Schema<UserPermissions>(
  {
    canManageUsers: { type: Boolean, default: false },
    canManageCompanySettings: { type: Boolean, default: false },
    canViewDashboard: { type: Boolean, default: true },
    canManageCustomers: { type: Boolean, default: false },
    canManageSuppliers: { type: Boolean, default: false },
    canManageProducts: { type: Boolean, default: false },
    canManageInventory: { type: Boolean, default: false },
    canAdjustStock: { type: Boolean, default: false },
    canCreateSales: { type: Boolean, default: false },
    canManageInvoices: { type: Boolean, default: false },
    canRecordPayments: { type: Boolean, default: false },
    canManagePurchases: { type: Boolean, default: false },
    canManageExpenses: { type: Boolean, default: false },
    canApproveExpenses: { type: Boolean, default: false },
    canApproveDiscounts: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: false },
    canExportReports: { type: Boolean, default: false },
    canViewAuditLogs: { type: Boolean, default: false },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    employeeId: { type: Schema.Types.ObjectId },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },
    profileImageUrl: { type: String },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: [
        "owner",
        "admin",
        "manager",
        "sales",
        "inventory",
        "accountant",
        "support",
        "viewer",
      ],
      required: true,
    },
    permissions: { type: permissionsSchema, required: true },
    isOwner: { type: Boolean, default: false },
    department: { type: String },
    jobTitle: { type: String },
    status: {
      type: String,
      enum: ["active", "invited", "suspended", "disabled", "deleted"],
      default: "active",
    },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },
    lastActiveAt: { type: Date },
    activeSessions: { type: [activeSessionSchema], default: [] },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
    invitedAt: { type: Date },
    invitationToken: { type: String, select: false },
    invitationExpiresAt: { type: Date },
    passwordResetToken: { type: String, select: false },
    passwordResetExpiresAt: { type: Date },
    refreshTokenHash: { type: String, select: false },
    refreshTokenExpiresAt: { type: Date },
    timezone: { type: String },
    language: { type: String },
    notificationPreferences: {
      type: notificationPreferencesSchema,
      required: true,
      default: () => ({
        email: true,
        sms: false,
        whatsapp: false,
        push: false,
      }),
    },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

userSchema.index({ companyId: 1, status: 1 });
userSchema.index({ status: 1 });
userSchema.index({ role: 1 });
userSchema.index({ deletedAt: 1 });

userSchema.virtual("fullName").get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`.trim();
});

userSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret: any) => {
    if (ret._id) {
      ret.id = String(ret._id);
      delete ret._id;
    }
    delete ret.__v;
    delete ret.passwordHash;
    delete ret.refreshTokenHash;
    delete ret.twoFactorSecret;
    delete ret.invitationToken;
    delete ret.passwordResetToken;
    return ret;
  },
});

const User = mongoose.model<IUser>("User", userSchema);
export default User;
