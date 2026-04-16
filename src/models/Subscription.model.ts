import mongoose, { Schema } from "mongoose";

export type SubscriptionPlan = "standard";
export type SubscriptionInterval = "monthly" | "yearly";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "none";

export interface ISubscription {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  plan: SubscriptionPlan;
  interval: SubscriptionInterval;
  status: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  gracePeriodEndsAt?: Date;
  paystackCustomerCode?: string;
  lastPaystackReference?: string;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
    },
    plan: {
      type: String,
      enum: ["standard"],
      default: "standard",
    },
    interval: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },
    status: {
      type: String,
      enum: ["trialing", "active", "past_due", "cancelled", "none"],
      default: "none",
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    gracePeriodEndsAt: Date,
    paystackCustomerCode: String,
    lastPaystackReference: String,
  },
  { timestamps: true },
);


subscriptionSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    const o = ret as unknown as Record<string, unknown>;
    if (o._id) {
      o.id = String(o._id);
      delete o._id;
    }
    delete o.__v;
    return o;
  },
});

const Subscription = mongoose.model<ISubscription>(
  "Subscription",
  subscriptionSchema,
);
export default Subscription;
