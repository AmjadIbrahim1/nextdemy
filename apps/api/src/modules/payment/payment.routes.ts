import express, { type Router } from "express";
import {
  auth,
  isInstructor,
  isStudent,
} from "@/shared/middlewares/auth-middlewares";
import { paymentLimiter } from "@/shared/middlewares/rate-limiter";
import * as PaymentController from "./controllers/payment.controller";

const router: Router = express.Router();

/**
 * POST /checkout
 * Creates a server-priced order and a demo checkout session.
 */
router.post(
  "/checkout",
  auth,
  isStudent,
  paymentLimiter,
  PaymentController.createCheckout
);

/**
 * POST /verifyPayment
 * Verifies the provider signature and grants course access exactly once.
 */
router.post(
  "/verifyPayment",
  auth,
  isStudent,
  paymentLimiter,
  PaymentController.verifyPayment
);

/**
 * POST /cancel
 * Cancels a pending demo checkout without granting access.
 */
router.post(
  "/cancel",
  auth,
  isStudent,
  paymentLimiter,
  PaymentController.cancelCheckout
);

/**
 * POST /sendPaymentSuccessEmail
 * Sends a receipt for a paid order at most once.
 */
router.post(
  "/sendPaymentSuccessEmail",
  auth,
  paymentLimiter,
  PaymentController.sendPaymentSuccessEmail
);

router.get("/history", auth, PaymentController.getPaymentHistory);

router.get(
  "/instructor-earnings",
  auth,
  isInstructor,
  PaymentController.getInstructorEarnings
);

export default router;
