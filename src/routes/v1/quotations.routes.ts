import { Router } from "express";
import * as ctrl from "../../controllers/quotationController.js";
import { protect } from "../../middleware/auth.js";
import { requireActiveSubscription } from "../../middleware/subscription.js";
import { requirePermission } from "../../middleware/permission.js";

const r = Router();
r.use(protect);
r.use(requireActiveSubscription);
r.use(requirePermission("canManageInvoices"));

r.get("/", ctrl.listQuotations);
r.post("/", ctrl.createQuotation);
r.get("/:id", ctrl.getQuotation);
r.patch("/:id", ctrl.updateQuotation);
r.post("/:id/convert-to-invoice", ctrl.convertToInvoice);

export default r;
