import type { Response } from "express";

export interface ApiSuccessBody<T> {
  status: "success";
  data: T;
  meta?: Record<string, unknown>;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>,
): void => {
  const body: ApiSuccessBody<T> = { status: "success", data };
  if (meta !== undefined) body.meta = meta;
  res.status(statusCode).json(body);
};

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const paginated = <T>(
  res: Response,
  items: T[],
  meta: PaginationMeta,
  statusCode = 200,
): void => {
  sendSuccess(res, { items, pagination: meta }, statusCode);
};
