import mongoose from "mongoose";
import Company from "../models/Company.model.js";
import type { ICompany } from "../models/Company.model.js";
import AppError from "../utils/appError.js";

export const padDocNumber = (n: number, width = 5): string =>
  String(n).padStart(width, "0");

export const getSingletonCompany = async (): Promise<ICompany | null> => {
  return Company.findOne();
};

export const requireCompany = async (): Promise<ICompany> => {
  const c = await getSingletonCompany();
  if (!c) throw new AppError("Company profile not initialized", 404);
  return c;
};

export const companyId = async (): Promise<mongoose.Types.ObjectId> => {
  const c = await requireCompany();
  return c._id;
};

type NumberingKey =
  | "invoiceSettings"
  | "quotationSettings"
  | "purchaseOrderSettings"
  | "saleNumberSettings";

export const nextNumberedDocument = async (
  field: NumberingKey,
): Promise<string> => {
  const path = `${field}.nextNumber`;
  const company = await Company.findOneAndUpdate(
    {},
    { $inc: { [path]: 1 } },
    { new: true, sort: { createdAt: 1 } },
  );
  if (!company) throw new AppError("Company profile not initialized", 404);

  const settings = company[field];
  if (!settings) throw new AppError("Numbering settings missing", 500);
  return `${settings.prefix}-${padDocNumber(settings.nextNumber)}`;
};
