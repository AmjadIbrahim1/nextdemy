import type {
  ChangePasswordInput,
  LoginInput,
  ResetPasswordInput,
  ResetPasswordTokenInput,
  SignupInput,
} from "@workspace/shared-types";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import otpGenerator from "otp-generator";
import env from "@/configs/env";
import { otpTemplate } from "@/mail/templates/email-verification-mail-template";
import { passwordUpdated } from "@/mail/templates/password-update-mail-template";
import Profile from "@/modules/profile/models/profile.model";
import { ApiError } from "@/shared/utils/api-error";
import { logger } from "@/shared/utils/logger";
import { sendEmail } from "@/shared/utils/send-mail";
import OTP from "../models/otp.model";
import User from "../models/user.model";

const OTP_COOLDOWN_MS = 30_000;

export const sendOtp = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  const checkUserPresent = await User.findOne({ email: normalizedEmail });
  if (checkUserPresent) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const latestOtp = await OTP.findOne({ email: normalizedEmail }).sort({
    createdAt: -1,
  });
  if (
    latestOtp &&
    Date.now() - new Date(latestOtp.createdAt as Date).getTime() <
      OTP_COOLDOWN_MS
  ) {
    throw ApiError.tooManyRequests(
      "Please wait before requesting another verification code"
    );
  }

  let otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
    digits: true,
  });

  let result = await OTP.findOne({ otp });
  while (result) {
    otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
      digits: true,
    });
    result = await OTP.findOne({ otp });
  }

  const otpDocument = await OTP.create({ email: normalizedEmail, otp });

  try {
    await sendEmail(
      normalizedEmail,
      "Your Nextdemy verification code",
      otpTemplate(otp)
    );
  } catch (error) {
    // Never leave a usable OTP behind when delivery fails.
    await OTP.deleteOne({ _id: otpDocument._id });
    throw error;
  }
};

export const signup = async (body: SignupInput) => {
  const {
    firstName,
    lastName,
    email,
    password,
    accountType,
    contactNumber,
    otp,
  } = body;

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw ApiError.conflict("User already exists. Please sign in to continue.");
  }

  const otpResponse = await OTP.find({ email: normalizedEmail })
    .sort({ createdAt: -1 })
    .limit(1);

  if (otpResponse.length === 0) {
    throw ApiError.validation("The OTP is not valid");
  }
  if (otp !== otpResponse[0].otp) {
    throw ApiError.validation("The OTP is not valid");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const approved = accountType === "Instructor" ? false : true;

  const profileDetails = await Profile.create({
    gender: null,
    dateOfBirth: null,
    about: null,
    contactNumber: null,
  });

  const user = await User.create({
    firstName,
    lastName,
    email: normalizedEmail,
    contactNumber,
    password: hashedPassword,
    accountType,
    approved,
    additionalDetails: profileDetails._id,    image: `https://api.dicebear.com/6.x/initials/svg?seed=${encodeURIComponent(`${firstName} ${lastName}`)}`,
  });

  await OTP.deleteOne({ _id: otpResponse[0]._id });

  return user;
};

export const login = async (body: LoginInput) => {
  const { email, password } = body;
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail })
    .select("+password")
    .populate("additionalDetails");
  if (!user) {
    throw ApiError.unauthorized(
      "No account found with this email. Please sign up first."
    );
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw ApiError.unauthorized("Password is incorrect");
  }

  const payload = {
    email: user.email,
    id: user._id,
    accountType: user.accountType,
  };
  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });

  await User.updateOne({ _id: user._id }, { $set: { token: refreshToken } });

  const safeUser = user.toObject() as Record<string, unknown>;
  delete safeUser.password;
  delete safeUser.token;

  return { accessToken, refreshToken, user: safeUser };
};

export const refreshToken = async (token: string) => {
  let decoded: { id: string };
  try {
    decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: string };
  } catch (_error) {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const user = await User.findById(decoded.id).select("+token");
  if (!user || !user.token || user.token !== token) {
    throw ApiError.unauthorized("Refresh token is no longer valid");
  }

  const payload = {
    email: user.email,
    id: user._id,
    accountType: user.accountType,
  };
  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });
  const rotatedRefreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });

  await User.updateOne(
    { _id: user._id },
    { $set: { token: rotatedRefreshToken } }
  );

  return { accessToken, refreshToken: rotatedRefreshToken };
};

export const logout = async (userId: string) => {
  await User.updateOne({ _id: userId }, { $unset: { token: 1 } });
};

export const changePassword = async (
  userId: string,
  body: ChangePasswordInput
) => {
  const userDetails = await User.findById(userId).select("+password");
  if (!userDetails) {
    throw ApiError.notFound("User not found");
  }

  const { oldPassword, newPassword } = body;

  const isPasswordMatch = await bcrypt.compare(
    oldPassword,
    userDetails.password
  );

  if (oldPassword === newPassword) {
    throw ApiError.validation("New Password cannot be same as Old Password");
  }

  if (!isPasswordMatch) {
    throw ApiError.unauthorized("The password is incorrect");
  }

  const encryptedPassword = await bcrypt.hash(newPassword, 10);
  const updatedUserDetails = await User.findByIdAndUpdate(
    userId,
    { password: encryptedPassword, $unset: { token: 1 } },
    { new: true }
  );

  try {
    await sendEmail(
      updatedUserDetails?.email || "",
      "Nextdemy - Password updated",
      passwordUpdated(
        updatedUserDetails?.email || "",
        `${updatedUserDetails?.firstName} ${updatedUserDetails?.lastName}`
      )
    );
  } catch (error) {
    // The password change already committed; a failed notification must not
    // turn a successful change into an error response.
    logger.error({ error }, "Password updated but notification email failed");
  }
};

export const resetPasswordToken = async (body: ResetPasswordTokenInput) => {
  const { email } = body;
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw ApiError.validation(
      `This Email: ${email} is not Registered With Us Enter a Valid Email `
    );
  }

  const token = crypto.randomBytes(20).toString("hex");

  await User.findOneAndUpdate(
    { email: normalizedEmail },
    {
      token,
      resetPasswordExpires: Date.now() + 3_600_000, // 1hr
    },
    { new: true }
  );

  const url = `${env.UPDATE_PASSWORD_BASE_URL}/${token}`;

  await sendEmail(
    normalizedEmail,
    "Password reset",
    `Your Link for email verification is ${url}. Please click this url to reset your password.`
  );
};

export const resetPassword = async (body: ResetPasswordInput) => {
  const { password, token } = body;

  const userDetails = await User.findOne({ token });
  if (!userDetails?.resetPasswordExpires) {
    throw ApiError.validation("Invalid token or token has expired.");
  }

  if (userDetails.resetPasswordExpires.getTime() <= Date.now()) {
    throw ApiError.forbidden(
      "Token has expired. Please regenerate your token."
    );
  }

  const encryptedPassword = await bcrypt.hash(password, 10);

  await User.findOneAndUpdate(
    { token },
    {
      password: encryptedPassword,
      token: undefined,
      resetPasswordExpires: undefined,
    },
    { new: true }
  );
};
