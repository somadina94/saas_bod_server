import Notification from "../models/Notification.model.js";
import type mongoose from "mongoose";

export const notifyUser = async (params: {
  companyId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  body: string;
  type?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}) => {
  await Notification.create({
    companyId: params.companyId,
    userId: params.userId,
    title: params.title,
    body: params.body,
    type: params.type ?? "info",
    link: params.link,
    metadata: params.metadata ?? {},
  });
};
