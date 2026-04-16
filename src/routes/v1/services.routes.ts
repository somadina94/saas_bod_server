import { Router } from "express";
import * as ctrl from "../../controllers/serviceController.js";
import { protect } from "../../middleware/auth.js";
import { requireActiveSubscription } from "../../middleware/subscription.js";
import { requirePermission } from "../../middleware/permission.js";

const r = Router();
r.use(protect);
r.use(requireActiveSubscription);
r.use(requirePermission("canManageProducts"));

r.get("/", ctrl.listServices);
r.post("/", ctrl.createService);
r.get("/:id", ctrl.getService);
r.patch("/:id", ctrl.updateService);
r.delete("/:id", ctrl.archiveService);

export default r;
