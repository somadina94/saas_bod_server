import { Router } from "express";
import * as ctrl from "../../controllers/companyController.js";
import { protect } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permission.js";

const r = Router();

r.get("/", protect, ctrl.getCompany);
r.post(
  "/",
  protect,
  requirePermission("canManageCompanySettings"),
  ctrl.createCompany,
);
r.patch(
  "/",
  protect,
  requirePermission("canManageCompanySettings"),
  ctrl.updateCompany,
);

r.post(
  "/payments/test-paystack",
  protect,
  requirePermission("canManageCompanySettings"),
  ctrl.testTenantPaystack,
);

export default r;
