import { z } from "zod";

export const paymentStatusSchema = z.enum([
  "pending",
  "success",
  "failed",
  "refunded",
]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const orderStatusSchema = z.enum([
  "pending",
  "paid",
  "failed",
  "cancelled",
  "expired",
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const checkoutSchema = z.object({
  courses: z
    .array(z.string().min(1))
    .min(1, "Select at least one course")
    .max(20, "You can buy at most 20 courses at once"),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const verifyPaymentSchema = z.object({
  orderId: z.string().min(1),
  providerOrderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
});
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

export const cancelPaymentSchema = z.object({
  orderId: z.string().min(1),
});
export type CancelPaymentInput = z.infer<typeof cancelPaymentSchema>;

export const sendPaymentSuccessEmailSchema = z.object({
  orderId: z.string().min(1),
});
export type SendPaymentSuccessEmailInput = z.infer<
  typeof sendPaymentSuccessEmailSchema
>;

export const checkoutCourseSchema = z.object({
  _id: z.string(),
  courseName: z.string(),
  thumbnail: z.string().optional(),
  price: z.number(),
});
export type CheckoutCourse = z.infer<typeof checkoutCourseSchema>;

export const checkoutResponseSchema = z.object({
  orderId: z.string(),
  providerOrderId: z.string(),
  paymentId: z.string(),
  signature: z.string(),
  amount: z.number().int().nonnegative(),
  currency: z.string(),
  isDemo: z.boolean(),
  status: orderStatusSchema,
  courses: z.array(checkoutCourseSchema),
});
export type CheckoutResponse = z.infer<typeof checkoutResponseSchema>;

export const verifyPaymentResponseSchema = z.object({
  orderId: z.string(),
  status: orderStatusSchema,
  enrolledCourseIds: z.array(z.string()),
});
export type VerifyPaymentResponse = z.infer<
  typeof verifyPaymentResponseSchema
>;

export const paymentRecordSchema = z.object({
  _id: z.string(),
  orderId: z.string(),
  providerOrderId: z.string(),
  providerPaymentId: z.string().optional(),
  amount: z.number(),
  currency: z.string(),
  status: paymentStatusSchema,
  provider: z.string(),
  isDemo: z.boolean(),
  courses: z.array(
    z.object({
      _id: z.string(),
      courseName: z.string(),
      thumbnail: z.string().optional(),
      price: z.number(),
    })
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PaymentRecord = z.infer<typeof paymentRecordSchema>;

export const instructorEarningsResponseSchema = z.object({
  totalEarnings: z.number(),
  totalTransactions: z.number(),
  currency: z.string(),
});
export type InstructorEarningsResponse = z.infer<
  typeof instructorEarningsResponseSchema
>;
