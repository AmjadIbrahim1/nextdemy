import mongoose from "mongoose";

const OTPSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  otp: {
    type: String,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 5, // MongoDB TTL: the document is deleted after 5 minutes.
  },
});

OTPSchema.index({ email: 1, createdAt: -1 });

export default mongoose.model("OTP", OTPSchema);
