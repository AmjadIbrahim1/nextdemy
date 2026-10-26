import "./setup-env";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import app from "@/app";
import { connectDB } from "@/configs/db";
import OTP from "@/modules/auth/models/otp.model";
import User from "@/modules/auth/models/user.model";
import Category from "@/modules/course/models/category-model";
import Course from "@/modules/course/models/course-model";
import CourseProgress from "@/modules/course/models/course-progress-model";
import RatingAndReview from "@/modules/course/models/rating-and-review-model";
import Section from "@/modules/course/models/section-model";
import SubSection from "@/modules/course/models/sub-section-model";
import { Order } from "@/modules/payment/models/order.model";
import { Payment } from "@/modules/payment/models/payment.model";
import Profile from "@/modules/profile/models/profile.model";

let server: ReturnType<typeof app.listen>;
let baseUrl: string;

const createUser = async (
  email: string,
  accountType: "Student" | "Instructor" = "Student"
) => {
  const profile = await Profile.create({ about: null });
  return User.create({
    firstName: accountType === "Student" ? "Test" : "Teacher",
    lastName: "User",
    email,
    password: await bcrypt.hash("Password123!", 10),
    accountType,
    approved: true,
    additionalDetails: profile._id,
    image: "https://example.com/avatar.png",
  });
};

const accessTokenFor = (user: {
  _id: mongoose.Types.ObjectId;
  email: string;
  accountType: string;
}) =>
  jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      accountType: user.accountType,
    },
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: "15m" }
  );

const jsonRequest = async (
  path: string,
  options: RequestInit = {}
): Promise<{ status: number; body: any; headers: Headers }> => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    },
  });

  return {
    status: response.status,
    body: await response.json(),
    headers: response.headers,
  };
};

const createPublishedCourse = async () => {
  const instructor = await createUser("instructor@test.local", "Instructor");
  const category = await Category.create({
    name: "Test Category",
    slug: "test-category",
    description: "Integration test category",
  });

  const course = await Course.create({
    courseName: "Integration Test Course",
    courseDescription: "A course used by the integration test suite.",
    whatYouWillLearn: "Test the payment flow",
    price: 1499,
    tag: ["test"],
    category: category._id,
    instructor: instructor._id,
    thumbnail: "https://example.com/thumb.png",
    status: "Published",
    studentsEnrolled: [],
    ratingAndReviews: [],
    courseContent: [],
  });

  return { course, instructor, category };
};

beforeAll(async () => {
  await connectDB();
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => {
    if (server.listening) return resolve();
    server.once("listening", () => resolve());
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
});

beforeEach(async () => {
  await Promise.all([
    OTP.deleteMany({}),
    Payment.deleteMany({}),
    Order.deleteMany({}),
    CourseProgress.deleteMany({}),
    RatingAndReview.deleteMany({}),
    Course.deleteMany({}),
    Category.deleteMany({}),
    Section.deleteMany({}),
    SubSection.deleteMany({}),
    Profile.deleteMany({}),
    User.deleteMany({}),
  ]);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await mongoose.disconnect();
});

describe("authentication", () => {
  it("registers with a persisted OTP, logs in, refreshes, and logs out", async () => {
    const email = "new.student@test.local";

    const otpResponse = await jsonRequest("/api/v2/auth/sendotp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    expect(otpResponse.status).toBe(200);

    const otpDocument = await OTP.findOne({ email }).sort({ createdAt: -1 });
    expect(otpDocument).not.toBeNull();

    const signupResponse = await jsonRequest("/api/v2/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        firstName: "New",
        lastName: "Student",
        email,
        password: "Password123!",
        confirmPassword: "Password123!",
        accountType: "Student",
        otp: otpDocument?.otp,
      }),
    });
    expect(signupResponse.status).toBe(201);
    expect(await OTP.countDocuments({ email })).toBe(0);

    const loginResponse = await jsonRequest("/api/v2/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: "Password123!" }),
    });
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.data.accessToken).toBeString();
    expect(loginResponse.body.data.user.password).toBeUndefined();

    const cookie = loginResponse.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("refreshToken=");
    const refreshCookie = cookie.split(";")[0];

    const profileResponse = await jsonRequest(
      "/api/v2/profile/getUserDetails",
      {
        headers: {
          Authorization: `Bearer ${loginResponse.body.data.accessToken}`,
        },
      }
    );
    expect(profileResponse.status).toBe(200);

    const refreshResponse = await jsonRequest("/api/v2/auth/refresh-token", {
      method: "POST",
      headers: { Cookie: refreshCookie },
      body: "{}",
    });
    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.data.accessToken).toBeString();

    const newCookie = refreshResponse.headers.get("set-cookie") ?? "";
    const newRefreshCookie = newCookie.split(";")[0];

    const logoutResponse = await jsonRequest("/api/v2/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refreshResponse.body.data.accessToken}`,
        Cookie: newRefreshCookie,
      },
      body: "{}",
    });
    expect(logoutResponse.status).toBe(200);

    const afterLogoutRefresh = await jsonRequest(
      "/api/v2/auth/refresh-token",
      {
        method: "POST",
        headers: { Cookie: newRefreshCookie },
        body: "{}",
      }
    );
    expect(afterLogoutRefresh.status).toBe(401);
  });

  it("rejects an unauthenticated profile request and a foreign origin", async () => {
    const profileResponse = await jsonRequest(
      "/api/v2/profile/getUserDetails"
    );
    expect(profileResponse.status).toBe(401);

    const originResponse = await jsonRequest("/api/v2/health", {
      headers: { Origin: "https://evil.example" },
    });
    expect(originResponse.status).toBe(403);
  });
});

describe("mock payment flow", () => {
  it("creates a server-priced order, rejects a bad signature, and enrolls once", async () => {
    const { course } = await createPublishedCourse();
    const student = await createUser("student@test.local");
    const token = accessTokenFor(student);
    const authorization = { Authorization: `Bearer ${token}` };

    const checkoutResponse = await jsonRequest("/api/v2/payment/checkout", {
      method: "POST",
      headers: { ...authorization, "Idempotency-Key": "checkout-test-0001" },
      body: JSON.stringify({ courses: [course._id.toString()] }),
    });

    expect(checkoutResponse.status).toBe(200);
    const checkout = checkoutResponse.body.data;
    expect(checkout.amount).toBe(149900);
    expect(checkout.currency).toBe("EGP");
    expect(checkout.isDemo).toBe(true);
    expect(checkout.signature).toBeString();

    const badSignature = await jsonRequest(
      "/api/v2/payment/verifyPayment",
      {
        method: "POST",
        headers: authorization,
        body: JSON.stringify({
          orderId: checkout.orderId,
          providerOrderId: checkout.providerOrderId,
          paymentId: checkout.paymentId,
          signature: "tampered",
        }),
      }
    );
    expect(badSignature.status).toBe(402);

    const stillUnenrolled = await Course.findById(course._id);
    expect(stillUnenrolled?.studentsEnrolled).toHaveLength(0);
    expect(await Payment.countDocuments({ status: "success" })).toBe(0);

    // A tampered signature invalidates that order. Start a fresh attempt.
    const secondCheckoutResponse = await jsonRequest(
      "/api/v2/payment/checkout",
      {
        method: "POST",
        headers: {
          ...authorization,
          "Idempotency-Key": "checkout-test-0002",
        },
        body: JSON.stringify({ courses: [course._id.toString()] }),
      }
    );
    expect(secondCheckoutResponse.status).toBe(200);
    const secondCheckout = secondCheckoutResponse.body.data;

    const verify = () =>
      jsonRequest("/api/v2/payment/verifyPayment", {
        method: "POST",
        headers: authorization,
        body: JSON.stringify({
          orderId: secondCheckout.orderId,
          providerOrderId: secondCheckout.providerOrderId,
          paymentId: secondCheckout.paymentId,
          signature: secondCheckout.signature,
        }),
      });

    const verified = await verify();
    expect(verified.status).toBe(200);
    expect(verified.body.data.status).toBe("paid");

    // Replaying the same verification must not enroll the student twice.
    const replayed = await verify();
    expect(replayed.status).toBe(200);

    const enrolledCourse = await Course.findById(course._id);
    expect(enrolledCourse?.studentsEnrolled).toHaveLength(1);
    expect(
      await CourseProgress.countDocuments({
        course: course._id,
        user: student._id,
      })
    ).toBe(1);
    expect(
      await Payment.countDocuments({
        order: secondCheckout.orderId,
        status: "success",
      })
    ).toBe(1);

    const repeatPurchase = await jsonRequest("/api/v2/payment/checkout", {
      method: "POST",
      headers: authorization,
      body: JSON.stringify({ courses: [course._id.toString()] }),
    });
    expect(repeatPurchase.status).toBe(409);
  });

  it("reuses an idempotency key and isolates orders between users", async () => {
    const { course } = await createPublishedCourse();
    const student = await createUser("student.two@test.local");
    const other = await createUser("student.three@test.local");
    const token = accessTokenFor(student);
    const otherToken = accessTokenFor(other);
    const body = JSON.stringify({ courses: [course._id.toString()] });

    const first = await jsonRequest("/api/v2/payment/checkout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Idempotency-Key": "checkout-idempotent-0001",
      },
      body,
    });
    const second = await jsonRequest("/api/v2/payment/checkout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Idempotency-Key": "checkout-idempotent-0001",
      },
      body,
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.data.orderId).toBe(first.body.data.orderId);

    const checkout = first.body.data;
    const foreignVerification = await jsonRequest(
      "/api/v2/payment/verifyPayment",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${otherToken}` },
        body: JSON.stringify({
          orderId: checkout.orderId,
          providerOrderId: checkout.providerOrderId,
          paymentId: checkout.paymentId,
          signature: checkout.signature,
        }),
      }
    );
    expect(foreignVerification.status).toBe(404);

    const mismatchedSession = await jsonRequest(
      "/api/v2/payment/verifyPayment",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          orderId: checkout.orderId,
          providerOrderId: checkout.providerOrderId,
          paymentId: "mock_pay_not_the_session",
          signature: checkout.signature,
        }),
      }
    );
    expect(mismatchedSession.status).toBe(400);

    expect(
      await CourseProgress.countDocuments({
        course: course._id,
        user: other._id,
      })
    ).toBe(0);
  });

  it("collapses concurrent checkouts with the same idempotency key", async () => {
    const { course } = await createPublishedCourse();
    const student = await createUser("student.concurrent@test.local");
    const token = accessTokenFor(student);
    const headers = {
      Authorization: `Bearer ${token}`,
      "Idempotency-Key": "checkout-concurrent-0001",
    };
    const body = JSON.stringify({ courses: [course._id.toString()] });

    const [first, second] = await Promise.all([
      jsonRequest("/api/v2/payment/checkout", {
        method: "POST",
        headers,
        body,
      }),
      jsonRequest("/api/v2/payment/checkout", {
        method: "POST",
        headers,
        body,
      }),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.data.orderId).toBe(second.body.data.orderId);
    expect(
      await Order.countDocuments({
        idempotencyKey: "checkout-concurrent-0001",
      })
    ).toBe(1);
  });

  it("does not let a non-student start a checkout", async () => {
    const { course, instructor } = await createPublishedCourse();
    const token = accessTokenFor(instructor);

    const response = await jsonRequest("/api/v2/payment/checkout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ courses: [course._id.toString()] }),
    });

    expect(response.status).toBe(401);
  });
});
