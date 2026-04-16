import catchAsync from "../utils/catchAsync.js";
import { sendSuccess } from "../utils/apiResponse.js";
import SystemSettings from "../models/SystemSettings.model.js";
import AppError from "../utils/appError.js";

export const getSettings = catchAsync(async (req, res) => {
  const doc = await SystemSettings.findOne({ key: "global" });
  sendSuccess(res, doc ?? { key: "global", value: {} });
});

export const updateSettings = catchAsync(async (req, res) => {
  const doc = await SystemSettings.findOneAndUpdate(
    { key: "global" },
    { $set: { value: req.body.value ?? {} } },
    { new: true, upsert: true },
  );
  if (!doc) throw new AppError("Failed to save settings", 500);
  sendSuccess(res, doc);
});
