import { Router } from "express";
import * as auth from "../../controllers/authController.js";
import { validate } from "../../middleware/validate.js";
import { protect } from "../../middleware/auth.js";
import { authLimiter, strictAuthLimiter } from "../../middleware/rateLimit.js";

const r = Router();

r.post("/register", strictAuthLimiter, validate, auth.registerBootstrap);
r.post("/login", authLimiter, validate, auth.login);
r.post("/refresh", validate, auth.refresh);
r.post("/logout", protect, auth.logout);
r.post("/forgot-password", authLimiter, validate, auth.forgotPassword);
r.post("/reset-password", strictAuthLimiter, validate, auth.resetPassword);
r.post("/change-password", protect, validate, auth.changePassword);
r.get("/me", protect, auth.me);
r.patch("/me", protect, validate, auth.updateMe);
r.post("/accept-invite", validate, auth.acceptInvite);

export default r;
