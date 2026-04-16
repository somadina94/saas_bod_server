import { Router } from "express";
import * as ctrl from "../../controllers/billingController.js";
import { protect } from "../../middleware/auth.js";

const r = Router();
r.use(protect);

r.get("/subscription", ctrl.getSubscription);
r.post("/checkout", ctrl.checkout);

export default r;
