import type { RequestHandler } from "express";

const buckets = new Map<string, { count: number; resetAt: number }>();

const windowMs = 15 * 60 * 1000;

const makeLimiter =
  (max: number): RequestHandler =>
  (req, res, next) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || now > b.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (b.count >= max) {
      res.status(429).json({
        status: "fail",
        message: "Too many requests, please try again later.",
      });
      return;
    }
    b.count += 1;
    next();
  };

export const authLimiter = makeLimiter(1000);
export const strictAuthLimiter = makeLimiter(20);
