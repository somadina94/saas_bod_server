import { Router } from "express";
import * as ctrl from "../../controllers/inventoryController.js";
import { protect } from "../../middleware/auth.js";
import { requireActiveSubscription } from "../../middleware/subscription.js";
import { requirePermission } from "../../middleware/permission.js";

const r = Router();
r.use(protect);
r.use(requireActiveSubscription);
r.use(requirePermission("canManageInventory"));

r.post("/stock-in", requirePermission("canAdjustStock"), ctrl.stockIn);
r.post("/stock-out", requirePermission("canAdjustStock"), ctrl.stockOut);
r.post("/adjust", requirePermission("canAdjustStock"), ctrl.adjustStock);
r.post("/transfer", requirePermission("canAdjustStock"), ctrl.transferStock);
r.get("/movements", ctrl.listMovements);
r.get("/low-stock", ctrl.lowStock);

export default r;
