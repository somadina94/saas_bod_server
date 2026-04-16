import { Router } from "express";
import * as ctrl from "../../controllers/notificationController.js";
import { protect } from "../../middleware/auth.js";

const r = Router();
r.use(protect);

r.get("/", ctrl.listNotifications);
r.post("/:id/read", ctrl.markRead);
r.post("/read-all", ctrl.markAllRead);

export default r;
