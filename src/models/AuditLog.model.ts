import mongoose, { Schema } from "mongoose";
import type { AuditAction, AuditEntityType } from "../types/audit.js";

export interface IAuditLog {
  actorId?: mongoose.Types.ObjectId;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  metadata: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true },
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
export default AuditLog;
