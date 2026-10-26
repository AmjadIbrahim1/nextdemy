import {
  cancelPaymentSchema,
  checkoutSchema,
  sendPaymentSuccessEmailSchema,
  verifyPaymentSchema,
} from "@workspace/shared-types";
import type { Request, Response } from "express";
import { ApiResponse } from "@/shared/utils/api-response";
import { asyncHandler } from "@/shared/utils/async-handler";
import * as PaymentService from "../services/payment.service";

export const createCheckout = asyncHandler(
  async (req: Request, res: Response) => {
    const data = checkoutSchema.parse(req.body);
    const idempotencyKey = req.header("Idempotency-Key") ?? undefined;
    const checkout = await PaymentService.createCheckout(
      req.user.id,
      data,
      idempotencyKey
    );
    return ApiResponse.ok(res, "Checkout session created", checkout);
  }
);

export const verifyPayment = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await PaymentService.verifyPayment(
      req.user.id,
      verifyPaymentSchema.parse(req.body)
    );
    return ApiResponse.ok(res, "Payment verified", result);
  }
);

export const cancelCheckout = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = cancelPaymentSchema.parse(req.body);
    await PaymentService.cancelCheckout(req.user.id, orderId);
    return ApiResponse.ok(res, "Checkout cancelled");
  }
);

export const sendPaymentSuccessEmail = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = sendPaymentSuccessEmailSchema.parse(req.body);
    await PaymentService.sendPaymentSuccessEmail(req.user.id, orderId);
    return ApiResponse.ok(res, "Payment receipt sent");
  }
);

export const getPaymentHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const { status, limit } = req.query;
    const payments = await PaymentService.getPaymentHistory(req.user.id, {
      status: status as string | undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return ApiResponse.ok(res, "Payment history retrieved", payments);
  }
);

export const getInstructorEarnings = asyncHandler(
  async (req: Request, res: Response) => {
    const earnings = await PaymentService.getInstructorEarnings(req.user.id);
    return ApiResponse.ok(res, "Earnings retrieved", earnings);
  }
);
