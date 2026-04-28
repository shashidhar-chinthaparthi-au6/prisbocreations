import mongoose, { Schema, type InferSchemaType, type Model, type Types } from "mongoose";

const TEN_D_MS = 10 * 24 * 60 * 60 * 1000;

const AssistantMessageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true, maxlength: 32000 },
    applyHref: { type: String, default: null },
    filterSummary: { type: String, default: null },
  },
  { _id: false },
);

const AssistantConversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    messages: { type: [AssistantMessageSchema], default: [] },
  },
  { timestamps: true },
);

export type AssistantConversationDoc = InferSchemaType<typeof AssistantConversationSchema> & {
  _id: mongoose.Types.ObjectId;
  userId: Types.ObjectId;
  updatedAt: Date;
};

const NAME = "AssistantConversation";

if (mongoose.models[NAME]) delete mongoose.models[NAME];
Reflect.deleteProperty(mongoose.connection.models as Record<string, unknown>, NAME);

export const AssistantConversation =
  mongoose.model<AssistantConversationDoc>(NAME, AssistantConversationSchema);

/** True if Mongoose updatedAt marks the thread stale (no activity beyond retention). */
export function isAssistantThreadStale(updatedAt: Date): boolean {
  return Date.now() - updatedAt.getTime() > TEN_D_MS;
}

export { TEN_D_MS };
