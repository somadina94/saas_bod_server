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
  transform: (_doc, ret: Record<string, unknown>) => {
    if (ret._id) {
      ret.id = String(ret._id);
      delete ret._id;
    }
    delete ret.__v;
    return ret;
  },
});

const Subscription = mongoose.model<ISubscription>(
  "Subscription",
  subscriptionSchema,
);
export default Subscription;
