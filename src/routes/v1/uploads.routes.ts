import { Router } from "express";
import * as ctrl from "../../controllers/uploadController.js";
import { protect } from "../../middleware/auth.js";
import { requireActiveSubscription } from "../../middleware/subscription.js";

const r = Router();
r.use(protect);
r.use(requireActiveSubscription);

r.post("/", ctrl.uploadMiddleware.single("file"), ctrl.uploadGeneric);

export default r;
