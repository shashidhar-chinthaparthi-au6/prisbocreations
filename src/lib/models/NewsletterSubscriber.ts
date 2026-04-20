import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const NewsletterSubscriberSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    source: { type: String, default: "storefront" },
  },
  { timestamps: true },
);

export type NewsletterSubscriberDoc = InferSchemaType<typeof NewsletterSubscriberSchema> & {
  _id: mongoose.Types.ObjectId;
};

const NAME = "NewsletterSubscriber";
if (mongoose.models[NAME]) delete mongoose.models[NAME];
Reflect.deleteProperty(mongoose.connection.models as Record<string, unknown>, NAME);

export const NewsletterSubscriber: Model<NewsletterSubscriberDoc> = mongoose.model<NewsletterSubscriberDoc>(
  NAME,
  NewsletterSubscriberSchema,
);
