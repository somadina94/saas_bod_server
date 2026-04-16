import { Router } from "express";
import * as ctrl from "../../controllers/supplierController.js";
import { protect } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permission.js";

const r = Router();
r.use(protect);
r.use(requirePermission("canManageSuppliers"));

r.get("/", ctrl.listSuppliers);
r.post("/", ctrl.createSupplier);
r.get("/:id", ctrl.getSupplier);
r.patch("/:id", ctrl.updateSupplier);
r.delete("/:id", ctrl.archiveSupplier);

export default r;
