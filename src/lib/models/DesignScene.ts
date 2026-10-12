import mongoose, { Schema, type InferSchemaType, type Model, type Types } from "mongoose";

const DesignSceneSchema = new Schema(
  {
    /** Product photo the print sits on. */
    baseUrl: { type: String, default: "" },
    beforeUrl: { type: String, default: "" },
    afterUrl: { type: String, default: "" },
    /** One print window, or a list of them. Each covers a line of sample wording. */
    zone: { type: Schema.Types.Mixed, default: null },
    /** image = picture only, text = words only, both = picture and words. */
    designMode: { type: String, enum: ["image", "text", "both"], default: "both" },
    placeholder: { type: String, default: "Your design" },
    sampleText: { type: String, default: "" },
    sampleImageUrl: { type: String, default: "" },
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    /** Admin catalogue id, which may be a studio key rather than the Mongo id. */
    productKey: { type: String, default: "" },
    productName: { type: String, default: "" },
    useOnHome: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type DesignSceneDoc = InferSchemaType<typeof DesignSceneSchema> & {
  _id: mongoose.Types.ObjectId;
  productId?: Types.ObjectId;
};

const NAME = "DesignScene";
if (mongoose.models[NAME]) delete mongoose.models[NAME];
Reflect.deleteProperty(mongoose.connection.models as Record<string, unknown>, NAME);

export const DesignScene: Model<DesignSceneDoc> = mongoose.model<DesignSceneDoc>(NAME, DesignSceneSchema);
