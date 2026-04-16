import { Router } from "express";
import * as ctrl from "../../controllers/paymentController.js";
import { protect } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permission.js";

const r = Router();
r.use(protect);
r.use(requirePermission("canRecordPayments"));

r.get("/", ctrl.listPayments);
r.post("/", ctrl.recordPayment);
r.post("/invoices/:id/initialize", ctrl.initializePaymentForInvoice);
r.get("/verify/:reference", ctrl.verifyPaystackPayment);

export default r;
