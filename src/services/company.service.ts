import mongoose from "mongoose";
import Company from "../models/Company.model.js";
import type { ICompany } from "../models/Company.model.js";
import AppError from "../utils/appError.js";

export const padDocNumber = (n: number, width = 5): string =>
  String(n).padStart(width, "0");

export const requireCompanyById = async (
  companyId: string | mongoose.Types.ObjectId,
): Promise<ICompany> => {
  const c = await Company.findById(companyId);
  if (!c) throw new AppError("Company not found", 404);
  return c;
};

type NumberingKey =
  | "invoiceSettings"
  | "quotationSettings"
  | "purchaseOrderSettings"
  | "saleNumberSettings";

export const nextNumberedDocument = async (
  companyId: mongoose.Types.ObjectId | string,
  field: NumberingKey,
): Promise<string> => {
  const path = `${field}.nextNumber`;
  const company = await Company.findOneAndUpdate(
    { _id: companyId },
    { $inc: { [path]: 1 } },
    { new: true },
  );
  if (!company) throw new AppError("Company profile not found", 404);

  const settings = company[field];
  if (!settings) throw new AppError("Numbering settings missing", 500);
  return `${settings.prefix}-${padDocNumber(settings.nextNumber)}`;
};
