import mongoose, { Schema } from "mongoose";

export interface ISystemSettings {
  _id: mongoose.Types.ObjectId;
  key: string;
  value: Record<string, unknown>;
  updatedAt: Date;
}

const systemSettingsSchema = new Schema<ISystemSettings>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

const SystemSettings = mongoose.model<ISystemSettings>(
  "SystemSettings",
  systemSettingsSchema,
);
export default SystemSettings;
