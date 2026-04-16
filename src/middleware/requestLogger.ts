import type { Request, Response, NextFunction } from "express";

export const requestLogger = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (process.env.NODE_ENV !== "test") {
    console.log(`${req.method} ${req.originalUrl}`);
  }
  next();
};
