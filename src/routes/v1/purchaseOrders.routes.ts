import { Router } from "express";
import * as ctrl from "../../controllers/purchaseOrderController.js";
import { protect } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permission.js";

const r = Router();
r.use(protect);
r.use(requirePermission("canManagePurchases"));

r.get("/", ctrl.listPurchaseOrders);
r.post("/", ctrl.createPurchaseOrder);
r.get("/:id", ctrl.getPurchaseOrder);
r.patch("/:id", ctrl.updatePurchaseOrder);
r.post("/:id/approve", ctrl.approvePurchaseOrder);
r.post("/:id/receive", ctrl.receivePurchaseOrder);

export default r;
