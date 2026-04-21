import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ReviewVoteSchema = new Schema(
  {
    reviewId: { type: Schema.Types.ObjectId, ref: "Review", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    ipAddress: { type: String, trim: true, default: null },
    isHelpful: { type: Boolean, required: true },
  },
  { timestamps: true },
);

ReviewVoteSchema.index(
  { reviewId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $exists: true, $ne: null } } },
);
ReviewVoteSchema.index(
  { reviewId: 1, ipAddress: 1 },
  { unique: true, partialFilterExpression: { ipAddress: { $exists: true, $nin: [null, ""] } } },
);

export type ReviewVoteDoc = InferSchemaType<typeof ReviewVoteSchema> & { _id: mongoose.Types.ObjectId };

const NAME = "ReviewVote";
if (mongoose.models[NAME]) delete mongoose.models[NAME];
Reflect.deleteProperty(mongoose.connection.models as Record<string, unknown>, NAME);

export const ReviewVote: Model<ReviewVoteDoc> = mongoose.model<ReviewVoteDoc>(NAME, ReviewVoteSchema);
