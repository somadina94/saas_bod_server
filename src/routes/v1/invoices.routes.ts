import { Router } from "express";
import * as ctrl from "../../controllers/invoiceController.js";
import { protect } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permission.js";

const r = Router();
r.use(protect);
r.use(requirePermission("canManageInvoices"));

r.get("/", ctrl.listInvoices);
r.post("/", ctrl.createInvoice);
r.get("/:id", ctrl.getInvoice);
r.patch("/:id", ctrl.updateDraftInvoice);
r.post("/:id/send", ctrl.sendInvoice);
r.patch("/:id/status", ctrl.updateInvoiceStatus);

export default r;
