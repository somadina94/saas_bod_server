/**
 * One-time migration: assign a single existing company + slug + subscriptions
 * when upgrading from pre-multi-tenant BOD. Run: npx tsx src/scripts/migrateSingletonToTenant.ts
 */
import "../config/loadEnv.js";

import crypto from "crypto";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import User from "../models/User.model.js";
import Company from "../models/Company.model.js";
import Subscription from "../models/Subscription.model.js";
import Customer from "../models/Customer.model.js";
import Supplier from "../models/Supplier.model.js";
import Product from "../models/Product.model.js";
import Service from "../models/Service.model.js";
import Invoice from "../models/Invoice.model.js";
import Quotation from "../models/Quotation.model.js";
import Sale from "../models/Sale.model.js";
import PurchaseOrder from "../models/PurchaseOrder.model.js";
import Payment from "../models/Payment.model.js";
import Expense from "../models/Expense.model.js";
import InventoryMovement from "../models/InventoryMovement.model.js";
import Notification from "../models/Notification.model.js";

const slug = () => `legacy-${crypto.randomBytes(4).toString("hex")}`;

const run = async () => {
  await mongoose.connect(env.databaseUrl());

  const needsUser = await User.countDocuments({ companyId: { $exists: false } });
  const companies = await Company.find({ slug: { $exists: false } });

  if (needsUser === 0 && companies.length === 0) {
    console.log("Nothing to migrate.");
    process.exit(0);
  }

  let company = await Company.findOne().sort({ createdAt: 1 });
  if (!company) {
    console.error("No company document found.");
    process.exit(1);
  }

  if (!company.slug) {
    await Company.updateOne(
      { _id: company._id },
      { $set: { slug: slug() } },
    );
    company = (await Company.findById(company._id))!;
  }

  const cid = company._id;

  await User.updateMany(
    { companyId: { $exists: false } },
    { $set: { companyId: cid } },
  );

  const models: Array<{
    name: string;
    model: mongoose.Model<unknown>;
  }> = [
    { name: "Customer", model: Customer },
    { name: "Supplier", model: Supplier },
    { name: "Product", model: Product },
    { name: "Service", model: Service },
    { name: "Invoice", model: Invoice },
    { name: "Quotation", model: Quotation },
    { name: "Sale", model: Sale },
    { name: "PurchaseOrder", model: PurchaseOrder },
    { name: "Payment", model: Payment },
    { name: "Expense", model: Expense },
    { name: "InventoryMovement", model: InventoryMovement },
  ];

  for (const { name, model } of models) {
    const r = await model.updateMany(
      { companyId: { $exists: false } },
      { $set: { companyId: cid } },
    );
    if (r.modifiedCount > 0) {
      console.log(`${name}: ${r.modifiedCount} documents updated`);
    }
  }

  const notifRows = await Notification.find({ companyId: { $exists: false } });
  let notifN = 0;
  for (const doc of notifRows) {
    const u = await User.findById(doc.userId);
    const oc = u?.companyId ?? cid;
    await Notification.updateOne({ _id: doc._id }, { $set: { companyId: oc } });
    notifN += 1;
  }
  if (notifN > 0) console.log(`Notification: ${notifN} documents updated`);

  const sub = await Subscription.findOne({ companyId: cid });
  if (!sub) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + env.billingTrialDays());
    await Subscription.create({
      companyId: cid,
      plan: "standard",
      interval: "monthly",
      status: "trialing",
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEnd,
    });
    console.log("Created trial subscription for migrated company.");
  }

  console.log("Migration complete.");
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
