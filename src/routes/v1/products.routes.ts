import { Router } from "express";
import * as ctrl from "../../controllers/productController.js";
import { protect } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permission.js";

const r = Router();
r.use(protect);
r.use(requirePermission("canManageProducts"));

r.get("/", ctrl.listProducts);
r.post("/", ctrl.createProduct);
r.get("/:id", ctrl.getProduct);
r.patch("/:id", ctrl.updateProduct);
r.delete("/:id", ctrl.archiveProduct);

export default r;
