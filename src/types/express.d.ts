import type { UserRole, UserPermissions, UserStatus } from "./user.js";
import type { IUser } from "../models/User.model.js";

declare global {
  namespace Express {
    interface Request {
      authUserId?: string;
      /** Active tenant (Mongo ObjectId string). */
      authCompanyId?: string;
      authRole?: UserRole;
      authPermissions?: UserPermissions;
      authStatus?: UserStatus;
      authUser?: IUser;
    }
  }
}

export {};
