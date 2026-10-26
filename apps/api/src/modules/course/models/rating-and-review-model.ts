import mongoose from "mongoose";

// Define the RatingAndReview schema
const ratingAndReviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  rating: {
    type: Number,
    required: true,
  },
  review: {
    type: String,
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Course",
    index: true,
  },
});

ratingAndReviewSchema.index({ user: 1, course: 1 }, { unique: true });
ratingAndReviewSchema.index({ course: 1, createdAt: -1 });

// Export the RatingAndReview model
export default mongoose.model("RatingAndReview", ratingAndReviewSchema);
