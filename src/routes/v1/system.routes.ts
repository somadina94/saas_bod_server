import { Router } from "express";
import * as ctrl from "../../controllers/systemSettingsController.js";
import { protect } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permission.js";

const r = Router();
r.use(protect);
r.use(requirePermission("canManageCompanySettings"));

r.get("/", ctrl.getSettings);
r.put("/", ctrl.updateSettings);

export default r;
