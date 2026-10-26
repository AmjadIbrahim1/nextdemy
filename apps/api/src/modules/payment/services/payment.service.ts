import type {
  CheckoutCourse,
  CheckoutInput,
  CheckoutResponse,
  InstructorEarningsResponse,
  PaymentRecord,
  VerifyPaymentInput,
  VerifyPaymentResponse,
} from "@workspace/shared-types";
import crypto from "crypto";
import mongoose from "mongoose";
import env from "@/configs/env";
import { courseEnrollmentEmail } from "@/mail/templates/course-enrollment-mail-template";
import { paymentSuccess } from "@/mail/templates/payment-success-mail-template";
import User from "@/modules/auth/models/user.model";
import Course from "@/modules/course/models/course-model";
import CourseProgress from "@/modules/course/models/course-progress-model";
import { ApiError } from "@/shared/utils/api-error";
import { logger } from "@/shared/utils/logger";
import { formatMoney, fromMinorUnits, toMinorUnits } from "@/shared/utils/money";
import { sendEmail } from "@/shared/utils/send-mail";
import { Order, type IOrder } from "../models/order.model";
import { Payment } from "../models/payment.model";
import { getPaymentProvider } from "../providers";

const PENDING_ORDER_REUSE_MS = 30 * 60 * 1000;
const MAX_COURSES_PER_ORDER = 20;

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: number }).code === 11000;

const assertObjectId = (value: string, field: string) => {
  if (!mongoose.isValidObjectId(value)) {
    throw ApiError.validation(`Invalid ${field}`);
  }
};

const loadCheckoutCourses = async (
  courseIds: mongoose.Types.ObjectId[]
): Promise<CheckoutCourse[]> => {
  const courses = await Course.find({
    _id: { $in: courseIds },
  })
    .select("courseName thumbnail price")
    .lean();

  return courses.map((course) => ({
    _id: course._id.toString(),
    courseName: course.courseName as string,
    thumbnail: course.thumbnail as string | undefined,
    price: course.price as number,
  }));
};

const toCheckoutResponse = async (
  order: IOrder
): Promise<CheckoutResponse> => {
  if (!order.checkoutSignature || !order.providerPaymentId) {
    throw ApiError.server("Checkout session is incomplete");
  }

  return {
    orderId: order._id.toString(),
    providerOrderId: order.providerOrderId,
    paymentId: order.providerPaymentId,
    signature: order.checkoutSignature,
    amount: order.amount,
    currency: order.currency,
    isDemo: order.isDemo,
    status: order.status,
    courses: await loadCheckoutCourses(order.courses),
  };
};

const findReusableOrder = async (
  userId: string,
  courseIds: mongoose.Types.ObjectId[],
  provider: string
): Promise<IOrder | null> => {
  const since = new Date(Date.now() - PENDING_ORDER_REUSE_MS);
  return Order.findOne({
    user: userId,
    status: "pending",
    provider,
    courses: { $all: courseIds, $size: courseIds.length },
    createdAt: { $gte: since },
  }).sort({ createdAt: -1 });
};

export const createCheckout = async (
  userId: string,
  input: CheckoutInput,
  idempotencyKey?: string
): Promise<CheckoutResponse> => {
  const uniqueCourseIds = [...new Set(input.courses)];

  if (uniqueCourseIds.length !== input.courses.length) {
    throw ApiError.validation("Duplicate courses are not allowed");
  }
  if (uniqueCourseIds.length === 0) {
    throw ApiError.validation("Select at least one course");
  }
  if (uniqueCourseIds.length > MAX_COURSES_PER_ORDER) {
    throw ApiError.validation(
      `You can purchase at most ${MAX_COURSES_PER_ORDER} courses at once`
    );
  }

  for (const courseId of uniqueCourseIds) {
    assertObjectId(courseId, "course id");
  }

  const normalizedKey = idempotencyKey?.trim();
  if (normalizedKey && !/^[A-Za-z0-9_-]{8,100}$/.test(normalizedKey)) {
    throw ApiError.validation("Invalid Idempotency-Key header");
  }

  if (normalizedKey) {
    const existing = await Order.findOne({ idempotencyKey: normalizedKey });
    if (existing) {
      if (existing.user.toString() !== userId) {
        throw ApiError.conflict("This checkout already belongs to another user");
      }
      return toCheckoutResponse(existing);
    }
  }

  const user = await User.findById(userId)
    .select("email firstName lastName")
    .lean();
  if (!user) {
    throw ApiError.unauthorized("User not found");
  }

  const provider = getPaymentProvider();
  const courseObjectIds = uniqueCourseIds.map(
    (id) => new mongoose.Types.ObjectId(id)
  );

  const courses = await Course.find({
    _id: { $in: courseObjectIds },
    status: "Published",
  });

  if (courses.length !== uniqueCourseIds.length) {
    throw ApiError.notFound("One or more courses are not available");
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const alreadyEnrolled = courses.some((course) =>
    course.studentsEnrolled.some((studentId) =>
      studentId.equals(userObjectId)
    )
  );
  if (alreadyEnrolled) {
    throw ApiError.conflict("You are already enrolled in one of these courses");
  }

  // Never trust a price sent by the browser: the total comes from MongoDB.
  const amount = courses.reduce(
    (total, course) => total + toMinorUnits(course.price as number),
    0
  );
  const currency = env.PAYMENT_CURRENCY;

  const reusable = await findReusableOrder(userId, courseObjectIds, provider.name);
  if (reusable) {
    return toCheckoutResponse(reusable);
  }

  const order = new Order({
    user: userObjectId,
    courses: courseObjectIds,
    amount,
    currency,
    status: "pending",
    provider: provider.name,
    providerOrderId: `pending_${crypto.randomUUID()}`,
    idempotencyKey: normalizedKey || undefined,
    isDemo: provider.isDemo,
  });

  const session = await provider.createCheckout({
    orderId: order._id.toString(),
    amount,
    currency,
    customer: {
      id: userId,
      email: user.email as string,
      firstName: user.firstName as string,
      lastName: user.lastName as string,
    },
    courses: courses.map((course) => ({
      id: course._id.toString(),
      name: course.courseName as string,
      price: course.price as number,
    })),
  });

  order.providerOrderId = session.providerOrderId;
  order.providerPaymentId = session.paymentId;
  order.checkoutSignature = session.signature;

  try {
    await order.save();
  } catch (error) {
    if (isDuplicateKeyError(error) && normalizedKey) {
      const existing = await Order.findOne({ idempotencyKey: normalizedKey });
      if (existing && existing.user.toString() === userId) {
        return toCheckoutResponse(existing);
      }
    }
    throw error;
  }

  try {
    await Payment.create({
      order: order._id,
      user: userObjectId,
      courses: courseObjectIds,
      amount,
      currency,
      status: "pending",
      provider: provider.name,
      providerOrderId: session.providerOrderId,
      providerPaymentId: session.paymentId,
      isDemo: provider.isDemo,
    });
  } catch (error) {
    await Order.deleteOne({ _id: order._id });
    throw error;
  }

  return toCheckoutResponse(order);
};

const sendReceiptOnce = async (order: IOrder): Promise<void> => {
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, confirmationEmailSentAt: { $exists: false } },
    { $set: { confirmationEmailSentAt: new Date() } }
  );
  if (!claimed) return;

  try {
    const user = await User.findById(order.user).select(
      "email firstName lastName"
    );
    if (!user) return;

    await sendEmail(
      user.email,
      order.isDemo
        ? "Nextdemy demo payment receipt"
        : "Nextdemy payment receipt",
      paymentSuccess({
        amount: formatMoney(
          fromMinorUnits(order.amount),
          order.currency,
          "en-EG"
        ),
        paymentId: order.providerPaymentId ?? "N/A",
        orderId: order._id.toString(),
        name: `${user.firstName} ${user.lastName}`,
        demo: order.isDemo,
      })
    );
  } catch (error) {
    // Allow a later retry, but never surface an email failure as a failed
    // payment after the order has already been paid.
    await Order.updateOne(
      { _id: order._id },
      { $unset: { confirmationEmailSentAt: 1 } }
    );
    logger.error(
      { orderId: order._id.toString() },
      "Payment receipt email failed"
    );
  }
};

const enrollStudent = async (order: IOrder): Promise<string[]> => {
  const enrolledCourseIds: string[] = [];

  for (const courseId of order.courses) {
    const course = await Course.findById(courseId);
    if (!course) continue;

    const enrollment = await Course.updateOne(
      { _id: courseId, studentsEnrolled: { $ne: order.user } },
      { $addToSet: { studentsEnrolled: order.user } }
    );

    await User.updateOne(
      { _id: order.user },
      { $addToSet: { courses: courseId } }
    );

    await CourseProgress.updateOne(
      { user: order.user, course: courseId },
      { $setOnInsert: { user: order.user, course: courseId } },
      { upsert: true }
    );

    enrolledCourseIds.push(courseId.toString());

    // Only the request that actually added the enrollment sends the email.
    if (enrollment.modifiedCount === 1) {
      const student = await User.findById(order.user).select(
        "email firstName lastName"
      );
      if (student) {
        try {
          await sendEmail(
            student.email,
            `You are enrolled in ${course.courseName}`,
            courseEnrollmentEmail(
              course.courseName as string,
              `${student.firstName} ${student.lastName}`,
              (course.courseDescription as string) ?? "",
              (course.thumbnail as string) ?? ""
            )
          );
        } catch (error) {
          logger.error(
            { orderId: order._id.toString(), courseId: courseId.toString() },
            "Enrollment email failed"
          );
        }
      }
    }
  }

  await Order.updateOne(
    { _id: order._id },
    { $set: { enrollmentCompletedAt: new Date() } }
  );

  return enrolledCourseIds;
};

const markPaymentSucceeded = async (
  order: IOrder,
  paymentId: string,
  signature?: string
): Promise<void> => {
  await Payment.updateOne(
    { order: order._id, status: { $ne: "success" } },
    {
      $set: {
        status: "success",
        providerPaymentId: paymentId,
        ...(signature ? { providerSignature: signature } : {}),
        paidAt: new Date(),
      },
    }
  );
};

const finalizePaidOrder = async (order: IOrder): Promise<string[]> => {
  const enrolledCourseIds = await enrollStudent(order);
  await sendReceiptOnce(order);
  return enrolledCourseIds;
};

export const verifyPayment = async (
  userId: string,
  input: VerifyPaymentInput
): Promise<VerifyPaymentResponse> => {
  assertObjectId(input.orderId, "order id");

  const order = await Order.findOne({
    _id: input.orderId,
    user: userId,
  });

  if (!order) {
    throw ApiError.notFound("Order not found");
  }

  if (order.providerOrderId !== input.providerOrderId) {
    throw ApiError.validation("Payment does not match this order");
  }

  if (order.status === "paid") {
    // A previous request may have committed the order and crashed before the
    // payment audit row was updated. Reconcile it before returning success.
    await markPaymentSucceeded(
      order,
      order.providerPaymentId ?? input.paymentId,
      order.checkoutSignature
    );

    if (!order.enrollmentCompletedAt) {
      await finalizePaidOrder(order);
    }
    return {
      orderId: order._id.toString(),
      status: "paid",
      enrolledCourseIds: order.courses.map((id) => id.toString()),
    };
  }

  if (order.status !== "pending") {
    throw ApiError.conflict(`This order is already ${order.status}`);
  }

  if (order.providerPaymentId !== input.paymentId) {
    throw ApiError.validation("Payment session does not match this order");
  }

  const provider = getPaymentProvider();
  const verification = await provider.verifyPayment({
    providerOrderId: order.providerOrderId,
    paymentId: input.paymentId,
    signature: input.signature,
    amount: order.amount,
    currency: order.currency,
  });

  if (verification.status !== "succeeded") {
    const nextStatus =
      verification.status === "cancelled" ? "cancelled" : "failed";

    await Order.updateOne(
      { _id: order._id, status: "pending" },
      {
        $set: {
          status: nextStatus,
          failureReason: verification.reason,
        },
      }
    );
    await Payment.updateOne(
      { order: order._id, status: "pending" },
      {
        $set: {
          status: "failed",
          failureReason: verification.reason,
        },
      }
    );

    throw ApiError.paymentRequired(verification.reason);
  }

  // Only one concurrent verification can move the order from pending to paid.
  const paidOrder = await Order.findOneAndUpdate(
    { _id: order._id, status: "pending" },
    {
      $set: {
        status: "paid",
        paidAt: new Date(),
        providerPaymentId: input.paymentId,
      },
    },
    { new: true }
  );

  if (!paidOrder) {
    const current = await Order.findById(order._id);
    if (current?.status === "paid") {
      if (!current.enrollmentCompletedAt) {
        await finalizePaidOrder(current);
      }
      return {
        orderId: current._id.toString(),
        status: "paid",
        enrolledCourseIds: current.courses.map((id) => id.toString()),
      };
    }
    throw ApiError.conflict("Order could not be confirmed");
  }

  await markPaymentSucceeded(paidOrder, input.paymentId, input.signature);

  const enrolledCourseIds = await finalizePaidOrder(paidOrder);

  return {
    orderId: paidOrder._id.toString(),
    status: "paid",
    enrolledCourseIds,
  };
};

export const cancelCheckout = async (
  userId: string,
  orderId: string
): Promise<void> => {
  assertObjectId(orderId, "order id");

  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) {
    throw ApiError.notFound("Order not found");
  }
  if (order.status === "paid") {
    throw ApiError.conflict("A paid order cannot be cancelled");
  }
  if (order.status !== "pending") {
    return;
  }

  await Order.updateOne(
    { _id: order._id, status: "pending" },
    { $set: { status: "cancelled", failureReason: "Cancelled by user" } }
  );
  await Payment.updateOne(
    { order: order._id, status: "pending" },
    { $set: { status: "failed", failureReason: "Cancelled by user" } }
  );
};

export const sendPaymentSuccessEmail = async (
  userId: string,
  orderId: string
): Promise<void> => {
  assertObjectId(orderId, "order id");

  const order = await Order.findOne({
    _id: orderId,
    user: userId,
    status: "paid",
  });
  if (!order) {
    throw ApiError.paymentRequired(
      "A successful payment is required before sending a receipt"
    );
  }

  await sendReceiptOnce(order);
};

export const getPaymentHistory = async (
  userId: string,
  options?: { status?: string; limit?: number }
): Promise<PaymentRecord[]> => {
  const query: Record<string, unknown> = { user: userId };
  if (options?.status) {
    query.status = options.status;
  }

  const payments = await Payment.find(query)
    .populate("courses", "courseName thumbnail price")
    .sort({ createdAt: -1 })
    .limit(Math.min(options?.limit || 50, 100))
    .lean();

  return payments.map((payment) => ({
    _id: payment._id.toString(),
    orderId: payment.order.toString(),
    providerOrderId: payment.providerOrderId,
    providerPaymentId: payment.providerPaymentId,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    provider: payment.provider,
    isDemo: payment.isDemo,
    courses: (
      payment.courses as unknown as {
        _id: mongoose.Types.ObjectId;
        courseName: string;
        thumbnail?: string;
        price: number;
      }[]
    ).map((course) => ({
      _id: course._id.toString(),
      courseName: course.courseName,
      thumbnail: course.thumbnail,
      price: course.price,
    })),
    createdAt: new Date(payment.createdAt).toISOString(),
    updatedAt: new Date(payment.updatedAt).toISOString(),
  }));
};

export const getInstructorEarnings = async (
  instructorId: string
): Promise<InstructorEarningsResponse> => {
  const instructorCourses = await Course.find(
    { instructor: instructorId },
    "_id"
  ).lean();
  const courseIds = instructorCourses.map((course) => course._id);

  const payments = await Payment.find({
    courses: { $in: courseIds },
    status: "success",
  }).lean();

  const totalEarnings = payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  return {
    totalEarnings: fromMinorUnits(totalEarnings),
    totalTransactions: payments.length,
    currency: payments[0]?.currency ?? env.PAYMENT_CURRENCY,
  };
};
