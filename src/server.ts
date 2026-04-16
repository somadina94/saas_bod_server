import "./config/loadEnv.js";

import mongoose from "mongoose";
import app from "./app.js";
import { env } from "./config/env.js";
import { isEmailConfigured, verifyMailTransport } from "./utils/email.js";

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION");
  console.error(err);
  console.error(err instanceof Error ? err.stack : "Not an Error");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION");
  console.error(reason);
  process.exit(1);
});

const port = env.port;

const DB = env.databaseUrl();

const server = app.listen(port, () => {
  console.log(`BOD API listening on port ${port}`);
});

const connectDB = async () => {
  await mongoose.connect(DB);
  if (mongoose.connection.readyState === 1) {
    console.log("MongoDB connected");
  }
};

void connectDB();

const verifyEmailOnStartup = async () => {
  if (!isEmailConfigured()) {
    console.warn(
      "SMTP not configured: set EMAIL_HOST, EMAIL_PORT, EMAIL_ADDRESS, EMAIL_PASSWORD.",
    );
    return;
  }
  try {
    await verifyMailTransport();
    console.log("SMTP transport verified");
  } catch (error) {
    console.error("SMTP verification failed");
    console.error(error);
  }
};

void verifyEmailOnStartup();
