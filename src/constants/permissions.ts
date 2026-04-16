import type { UserPermissions, UserRole } from "../types/user.js";

export const defaultPermissionsForRole = (role: UserRole): UserPermissions => {
  const full: UserPermissions = {
    canManageUsers: true,
    canManageCompanySettings: true,
    canViewDashboard: true,
    canManageCustomers: true,
    canManageSuppliers: true,
    canManageProducts: true,
    canManageInventory: true,
    canAdjustStock: true,
    canCreateSales: true,
    canManageInvoices: true,
    canRecordPayments: true,
    canManagePurchases: true,
    canManageExpenses: true,
    canApproveExpenses: true,
    canApproveDiscounts: true,
    canViewReports: true,
    canExportReports: true,
    canViewAuditLogs: true,
  };

  const viewer: UserPermissions = {
    canManageUsers: false,
    canManageCompanySettings: false,
    canViewDashboard: true,
    canManageCustomers: false,
    canManageSuppliers: false,
    canManageProducts: false,
    canManageInventory: false,
    canAdjustStock: false,
    canCreateSales: false,
    canManageInvoices: false,
    canRecordPayments: false,
    canManagePurchases: false,
    canManageExpenses: false,
    canApproveExpenses: false,
    canApproveDiscounts: false,
    canViewReports: true,
    canExportReports: false,
    canViewAuditLogs: false,
  };

  const sales: UserPermissions = {
    ...viewer,
    canManageCustomers: true,
    canCreateSales: true,
    canManageInvoices: true,
    canViewDashboard: true,
  };

  const inventory: UserPermissions = {
    ...viewer,
    canManageProducts: true,
    canManageInventory: true,
    canAdjustStock: true,
    canViewDashboard: true,
  };

  const accountant: UserPermissions = {
    ...viewer,
    canManageInvoices: true,
    canRecordPayments: true,
    canManageExpenses: true,
    canApproveExpenses: true,
    canViewReports: true,
    canExportReports: true,
  };

  const support: UserPermissions = {
    ...viewer,
    canManageCustomers: true,
    canViewDashboard: true,
  };

  const manager: UserPermissions = {
    ...full,
    canManageUsers: false,
    canManageCompanySettings: false,
    canViewAuditLogs: true,
  };

  switch (role) {
    case "owner":
    case "admin":
      return { ...full };
    case "manager":
      return { ...manager };
    case "sales":
      return { ...sales };
    case "inventory":
      return { ...inventory };
    case "accountant":
      return { ...accountant };
    case "support":
      return { ...support };
    case "viewer":
    default:
      return { ...viewer };
  }
};

export const mergePermissionOverrides = (
  base: UserPermissions,
  override?: Partial<UserPermissions> | null,
): UserPermissions => {
  if (!override) return base;
  return { ...base, ...override };
};
