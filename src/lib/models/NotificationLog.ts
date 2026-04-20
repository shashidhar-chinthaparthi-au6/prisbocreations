import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const NotificationLogSchema = new Schema(
  {
    orderId: { type: String, trim: true, index: true },
    userId: { type: String, trim: true, index: true },
    event: { type: String, required: true, trim: true, index: true },
    channel: { type: String, required: true, trim: true },
    recipient: { type: String, required: true, trim: true },
    status: { type: String, required: true, trim: true },
    error: { type: String, trim: true },
    sentAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

export type NotificationLogDoc = InferSchemaType<typeof NotificationLogSchema> & {
  _id: mongoose.Types.ObjectId;
};

if (mongoose.models.NotificationLog) {
  delete mongoose.models.NotificationLog;
}

export const NotificationLog: Model<NotificationLogDoc> = mongoose.model<NotificationLogDoc>(
  "NotificationLog",
  NotificationLogSchema,
);
