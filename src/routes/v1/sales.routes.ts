import { Router } from "express";
import * as ctrl from "../../controllers/saleController.js";
import { protect } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permission.js";

const r = Router();
r.use(protect);
r.use(requirePermission("canCreateSales"));

r.get("/", ctrl.listSales);
r.post("/", ctrl.createSale);
r.get("/:id", ctrl.getSale);
r.patch("/:id", ctrl.updateSale);
r.post("/:id/complete", ctrl.completeSale);
r.post("/:id/link-payment", ctrl.linkPayment);

export default r;
