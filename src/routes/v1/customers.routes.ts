import { Router } from "express";
import * as ctrl from "../../controllers/customerController.js";
import { protect } from "../../middleware/auth.js";
import { requireActiveSubscription } from "../../middleware/subscription.js";
import { requireAnyPermission, requirePermission } from "../../middleware/permission.js";

const r = Router();
r.use(protect);
r.use(requireActiveSubscription);
r.get(
  "/",
  requireAnyPermission(
    "canManageCustomers",
    "canManageInvoices",
    "canRecordPayments",
    "canCreateSales",
  ),
  ctrl.listCustomers,
);
r.post("/", requirePermission("canManageCustomers"), ctrl.createCustomer);
r.get(
  "/:id",
  requireAnyPermission(
    "canManageCustomers",
    "canManageInvoices",
    "canRecordPayments",
    "canCreateSales",
  ),
  ctrl.getCustomer,
);
r.patch("/:id", requirePermission("canManageCustomers"), ctrl.updateCustomer);
r.delete("/:id", requirePermission("canManageCustomers"), ctrl.archiveCustomer);

export default r;
