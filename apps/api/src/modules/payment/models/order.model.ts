import mongoose, { type Document } from "mongoose";
import type { OrderStatus } from "@workspace/shared-types";

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId;
  courses: mongoose.Types.ObjectId[];
  amount: number;
  currency: string;
  status: OrderStatus;
  provider: string;
  providerOrderId: string;
  providerPaymentId?: string;
  checkoutSignature?: string;
  idempotencyKey?: string;
  isDemo: boolean;
  paidAt?: Date;
  failureReason?: string;
  confirmationEmailSentAt?: Date;
  enrollmentCompletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new mongoose.Schema<IOrder>(
  {
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
      enum: ["pending", "paid", "failed", "cancelled", "expired"],
      default: "pending",
      required: true,
      index: true,
    },
    provider: { type: String, required: true, default: "mock" },
    providerOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    providerPaymentId: { type: String },
    checkoutSignature: { type: String },
    idempotencyKey: { type: String, unique: true, sparse: true },
    isDemo: { type: Boolean, default: true, required: true },
    paidAt: { type: Date },
    failureReason: { type: String },
    confirmationEmailSentAt: { type: Date },
    enrollmentCompletedAt: { type: Date },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, status: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: 1 });

export const Order = mongoose.model<IOrder>("Order", orderSchema);
