import { Router } from "express";
import * as ctrl from "../../controllers/publicController.js";

const r = Router();

r.get("/quotations/:token", ctrl.getPublicQuotation);
r.get("/invoices/:token", ctrl.getPublicInvoice);

export default r;
