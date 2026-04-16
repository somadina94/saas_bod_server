import AuditLog from "../models/AuditLog.model.js";
import type { AuditAction, AuditEntityType } from "../types/audit.js";

export interface AuditParams {
  actorId?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export const recordAudit = async (params: AuditParams): Promise<void> => {
  try {
    await AuditLog.create({
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata ?? {},
      ip: params.ip,
      userAgent: params.userAgent,
    });
  } catch {
    // Never fail primary flow on audit write
  }
};
