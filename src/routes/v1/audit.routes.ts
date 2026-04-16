import { Router } from "express";
import * as ctrl from "../../controllers/auditLogController.js";
import { protect } from "../../middleware/auth.js";
import { requireActiveSubscription } from "../../middleware/subscription.js";
import { requirePermission } from "../../middleware/permission.js";

const r = Router();
r.use(protect);
r.use(requireActiveSubscription);
r.use(requirePermission("canViewAuditLogs"));

r.get("/", ctrl.listAuditLogs);

export default r;
