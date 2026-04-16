import catchAsync from "../utils/catchAsync.js";
import { paginated, sendSuccess } from "../utils/apiResponse.js";
import {
  buildPaginationMeta,
  parsePagination,
} from "../utils/pagination.js";
import AuditLog from "../models/AuditLog.model.js";

export const listAuditLogs = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = {};
  if (req.query.entityType) filter.entityType = req.query.entityType;
  if (req.query.actorId) filter.actorId = req.query.actorId;

  const [items, total] = await Promise.all([
    AuditLog.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
    AuditLog.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(page, limit, total));
});
