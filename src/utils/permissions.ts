import type { UserPermissions } from "../types/user.js";

export const hasPermission = (
  permissions: UserPermissions | undefined,
  key: keyof UserPermissions,
): boolean => permissions?.[key] === true;
