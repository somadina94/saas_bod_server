import type { UserRole, UserPermissions, UserStatus } from "./user.js";
import type { IUser } from "../models/User.model.js";

declare global {
  namespace Express {
    interface Request {
      authUserId?: string;
      authRole?: UserRole;
      authPermissions?: UserPermissions;
      authStatus?: UserStatus;
      authUser?: IUser;
    }
  }
}

export {};
