import path from "path";
import express from "express";
import cors from "cors";
import globalErrorHandler from "./controllers/errorController.js";
import AppError from "./utils/appError.js";
import v1Routes from "./routes/v1/index.js";
import { platformBillingWebhook } from "./controllers/platformBillingWebhookController.js";
import { tenantPaystackWebhook } from "./controllers/tenantPaystackWebhookController.js";
import { securityHeaders } from "./middleware/securityHeaders.js";
import { requestLogger } from "./middleware/requestLogger.js";

import type { Request, Response, NextFunction } from "express";

const app = express();

app.use(securityHeaders);
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? true,
    credentials: true,
  }),
);
app.use(requestLogger);

app.use(
  "/api/v1/billing/webhooks/paystack",
  express.raw({ type: "application/json" }),
  platformBillingWebhook,
);

app.use(
  "/api/v1/webhooks/paystack/tenant/:companyId",
  express.raw({ type: "application/json" }),
  tenantPaystackWebhook,
);

app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const uploadsDir = path.join(process.cwd(), "uploads");
app.use(
  "/uploads",
  express.static(uploadsDir, {
    maxAge: process.env.NODE_ENV === "production" ? "1d" : 0,
  }),
);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/v1", v1Routes);

app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

export default app;
