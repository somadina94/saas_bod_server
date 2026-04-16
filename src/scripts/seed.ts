import "../config/loadEnv.js";

import mongoose from "mongoose";
import { env } from "../config/env.js";
import User from "../models/User.model.js";
import Company from "../models/Company.model.js";
import { registerCompany } from "../services/auth.service.js";

const run = async () => {
  await mongoose.connect(env.databaseUrl());

  const users = await User.countDocuments();
  const companies = await Company.countDocuments();

  if (users > 0 || companies > 0) {
    console.log("Database already initialized. Skipping seed.");
    process.exit(0);
  }

  const email = process.env.SEED_OWNER_EMAIL ?? "owner@example.com";
  const password = process.env.SEED_OWNER_PASSWORD ?? "ChangeMe123!";
  const companyName = process.env.SEED_COMPANY_NAME ?? "Demo Company";

  await registerCompany({
    firstName: "Owner",
    lastName: "User",
    email,
    password,
    companyName,
    industry: "services",
    currency: "NGN",
  });

  console.log(`Seeded owner ${email} and company "${companyName}".`);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
