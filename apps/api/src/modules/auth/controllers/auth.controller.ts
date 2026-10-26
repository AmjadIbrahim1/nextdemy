import {
  changePasswordSchema,
  loginSchema,
  resetPasswordSchema,
  resetPasswordTokenSchema,
  sendOtpSchema,
  signupSchema,
} from "@workspace/shared-types";
import type { Request, Response } from "express";
import env from "@/configs/env";
import { ApiError } from "@/shared/utils/api-error";
import { ApiResponse } from "@/shared/utils/api-response";
import { asyncHandler } from "@/shared/utils/async-handler";
import * as AuthService from "../services/auth.service";

const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.IS_PRODUCTION || env.COOKIE_SAME_SITE === "none",
  sameSite: env.COOKIE_SAME_SITE,
  maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  path: "/",
});

export const sendotp = asyncHandler(async (req: Request, res: Response) => {
  const { email } = sendOtpSchema.parse(req.body);
  await AuthService.sendOtp(email); // No longer returns OTP
  return ApiResponse.ok(res, "OTP Sent Successfully to your email.");
});

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const user = await AuthService.signup(signupSchema.parse(req.body));
  return ApiResponse.created(res, "User registered successfully", user);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { accessToken, refreshToken, user } = await AuthService.login(
    loginSchema.parse(req.body)
  );
  res.cookie("refreshToken", refreshToken, refreshCookieOptions());
  return ApiResponse.ok(res, "User Login Success", { accessToken, user });
});

export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const { refreshToken: token } = req.cookies;
    if (!token) {
      throw ApiError.unauthorized("Refresh token not found");
    }
    const { accessToken, refreshToken } = await AuthService.refreshToken(token);
    res.cookie("refreshToken", refreshToken, refreshCookieOptions());
    return ApiResponse.ok(res, "Access token refreshed", { accessToken });
  }
);

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await AuthService.logout(req.user.id);
  const { maxAge: _maxAge, ...clearOptions } = refreshCookieOptions();
  res.clearCookie("refreshToken", clearOptions);
  return ApiResponse.ok(res, "User logged out successfully");
});

export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    await AuthService.changePassword(
      req.user.id,
      changePasswordSchema.parse(req.body)
    );
    return ApiResponse.ok(res, "Password updated successfully");
  }
);

export const resetPasswordToken = asyncHandler(
  async (req: Request, res: Response) => {
    await AuthService.resetPasswordToken(
      resetPasswordTokenSchema.parse(req.body)
    );
    return ApiResponse.ok(
      res,
      "Email Sent Successfully, Please Check Your Email to Continue Further"
    );
  }
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    await AuthService.resetPassword(resetPasswordSchema.parse(req.body));
    return ApiResponse.ok(res, "Password reset successful.");
  }
);
