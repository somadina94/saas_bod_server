import { Router } from "express";
import * as ctrl from "../../controllers/dashboardController.js";
import { protect } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permission.js";

const r = Router();
r.use(protect);
r.use(requirePermission("canViewDashboard"));

r.get("/overview", ctrl.overview);

export default r;
