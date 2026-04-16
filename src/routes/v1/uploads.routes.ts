import { Router } from "express";
import * as ctrl from "../../controllers/uploadController.js";
import { protect } from "../../middleware/auth.js";

const r = Router();
r.use(protect);

r.post("/", ctrl.uploadMiddleware.single("file"), ctrl.uploadGeneric);

export default r;
