import multer from "multer";
import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync.js";
import { sendSuccess } from "../utils/apiResponse.js";
import * as uploadService from "../services/upload.service.js";
import User from "../models/User.model.js";
import Company from "../models/Company.model.js";
import Product from "../models/Product.model.js";
import Expense from "../models/Expense.model.js";
import Customer from "../models/Customer.model.js";
import Supplier from "../models/Supplier.model.js";
import AppError from "../utils/appError.js";

const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadGeneric = catchAsync(async (req, res) => {
  const file = req.file;
  if (!file) throw new AppError("No file uploaded", 400);
  const kind = req.body.kind as uploadService.UploadKind;
  if (!kind) throw new AppError("kind is required", 400);

  const result = await uploadService.uploadFile({
    buffer: file.buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
    kind,
  });

  if (kind === "user_avatar" && req.authUserId) {
    await User.updateOne(
      { _id: req.authUserId },
      { $set: { profileImageUrl: result.url } },
    );
  }
  if (kind === "company_logo") {
    await Company.updateOne({}, { $set: { logoUrl: result.url } });
  }

  const parseObjectId = (raw: unknown): mongoose.Types.ObjectId | null => {
    if (typeof raw !== "string" || !mongoose.isValidObjectId(raw)) return null;
    return new mongoose.Types.ObjectId(raw);
  };

  const uploadedBy = parseObjectId(req.authUserId);

  if (kind === "product_image") {
    const productId = parseObjectId(req.body.productId);
    if (!productId) throw new AppError("productId is required for product_image", 400);
    const product = await Product.findById(productId);
    if (!product) throw new AppError("Product not found", 404);
    product.imageUrls = Array.from(new Set([...(product.imageUrls ?? []), result.url]));
    await product.save();
  }

  if (kind === "expense_receipt") {
    const expenseId = parseObjectId(req.body.expenseId);
    if (!expenseId) throw new AppError("expenseId is required for expense_receipt", 400);
    const expense = await Expense.findById(expenseId);
    if (!expense) throw new AppError("Expense not found", 404);
    expense.attachmentUrl = result.url;
    await expense.save();
  }

  if (kind === "customer_doc") {
    const customerId = parseObjectId(req.body.customerId);
    if (!customerId) throw new AppError("customerId is required for customer_doc", 400);
    const customer = await Customer.findById(customerId);
    if (!customer) throw new AppError("Customer not found", 404);
    customer.documents = [
      ...(customer.documents ?? []),
      {
        url: result.url,
        label: file.originalname,
        uploadedAt: new Date(),
        uploadedBy: uploadedBy ?? undefined,
      },
    ];
    await customer.save();
  }

  if (kind === "supplier_doc") {
    const supplierId = parseObjectId(req.body.supplierId);
    if (!supplierId) throw new AppError("supplierId is required for supplier_doc", 400);
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) throw new AppError("Supplier not found", 404);
    supplier.documents = [
      ...(supplier.documents ?? []),
      {
        url: result.url,
        label: file.originalname,
        uploadedAt: new Date(),
        uploadedBy: uploadedBy ?? undefined,
      },
    ];
    await supplier.save();
  }

  sendSuccess(res, result, 201);
});
