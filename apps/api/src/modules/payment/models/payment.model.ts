import mongoose, { type Document } from "mongoose";
import type { PaymentStatus } from "@workspace/shared-types";

export interface IPayment extends Document {
  order: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  courses: mongoose.Types.ObjectId[];
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  providerOrderId: string;
  providerPaymentId?: string;
  providerSignature?: string;
  isDemo: boolean;
  failureReason?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new mongoose.Schema<IPayment>(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
      },
    ],
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "refunded"],
      required: true,
      default: "pending",
      index: true,
    },
    provider: { type: String, required: true, default: "mock" },
    providerOrderId: { type: String, required: true, index: true },
    providerPaymentId: { type: String, index: true },
    providerSignature: { type: String },
    isDemo: { type: Boolean, default: true, required: true },
    failureReason: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

paymentSchema.index({ user: 1, status: 1, createdAt: -1 });

export const Payment = mongoose.model<IPayment>("Payment", paymentSchema);
