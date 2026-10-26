import mongoose from "mongoose";

// Define the user schema using the Mongoose Schema constructor
const userSchema = new mongoose.Schema(
  {
    // Define the name field with type String, required, and trimmed
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    // Define the email field with type String, required, and trimmed
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    // Define the password field with type String and required
    password: {
      type: String,
      required: true,
      // Never selected by default; login and password-change opt in explicitly.
      select: false,
    },
    // Define the role field with type String and enum values of "Admin", "Student", or "Instructor"
    accountType: {
      type: String,
      enum: ["Admin", "Student", "Instructor"],
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    approved: {
      type: Boolean,
      default: true,
    },
    additionalDetails: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Profile",
    },
    courses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    image: {
      type: String,
      required: true,
    },
    courseProgress: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CourseProgress",
      },
    ],
    token: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  // Add timestamps for when the document is created and last modified
  { timestamps: true }
);

// Defense in depth: even an accidental document serialization must not leak
// credentials. `select: false` above is the primary guard.
const removeSensitiveFields = (
  _doc: unknown,
  ret: Record<string, unknown>
) => {
  delete ret.password;
  delete ret.token;
  return ret;
};

userSchema.set("toJSON", { transform: removeSensitiveFields });
userSchema.set("toObject", { transform: removeSensitiveFields });

// Export the Mongoose model for the user schema, using the name "User"
export default mongoose.model("User", userSchema);
