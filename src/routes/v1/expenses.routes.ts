import { Router } from "express";
import * as ctrl from "../../controllers/expenseController.js";
import { protect } from "../../middleware/auth.js";
import { requireActiveSubscription } from "../../middleware/subscription.js";
import { requirePermission } from "../../middleware/permission.js";

const r = Router();
r.use(protect);
r.use(requireActiveSubscription);
r.use(requirePermission("canManageExpenses"));

r.get("/", ctrl.listExpenses);
r.post("/", ctrl.createExpense);
r.get("/:id", ctrl.getExpense);
r.patch("/:id", ctrl.updateExpense);
r.post("/:id/approve", requirePermission("canApproveExpenses"), ctrl.approveExpense);
r.post("/:id/reject", requirePermission("canApproveExpenses"), ctrl.rejectExpense);

export default r;
