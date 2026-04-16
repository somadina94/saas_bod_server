import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { verifyAccessToken } from "../utils/jwt.js";
import User from "../models/User.model.js";

export const protect = catchAsync(async (req, _res, next) => {
  let token: string | undefined;
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    token = header.slice(7);
  }
  if (!token) {
    next(new AppError("You are not logged in. Please authenticate.", 401));
    return;
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    next(new AppError("Invalid or expired token", 401));
    return;
  }

  const user = await User.findById(payload.sub);
  if (!user || user.status !== "active" || user.deletedAt) {
    next(new AppError("User is no longer authorized", 401));
    return;
  }

  req.authUserId = String(user._id);
  req.authRole = user.role;
  req.authPermissions = user.permissions;
  req.authStatus = user.status;
  req.authUser = user;
  next();
});
