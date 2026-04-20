import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const TrackingEventSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    status: { type: String, required: true },
    location: { type: String },
    description: { type: String },
    eventAt: { type: Date, required: true },
  },
  { timestamps: true },
);

TrackingEventSchema.index({ orderId: 1, status: 1, eventAt: 1 }, { unique: true });

export type TrackingEventDoc = InferSchemaType<typeof TrackingEventSchema> & {
  _id: mongoose.Types.ObjectId;
};

if (mongoose.models.TrackingEvent) {
  delete mongoose.models.TrackingEvent;
}

export const TrackingEvent: Model<TrackingEventDoc> = mongoose.model<TrackingEventDoc>(
  "TrackingEvent",
  TrackingEventSchema,
);
