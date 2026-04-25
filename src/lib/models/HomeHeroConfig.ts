import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const HomeHeroSlideMongoose = new Schema(
  {
    image: { type: String, required: true },
    kicker: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
  },
  { _id: false },
);

const HomeHeroConfigSchema = new Schema(
  {
    singletonKey: { type: String, required: true, unique: true, default: "default" },
    slides: { type: [HomeHeroSlideMongoose], required: true },
  },
  { timestamps: true },
);

export type HomeHeroConfigDoc = InferSchemaType<typeof HomeHeroConfigSchema> & {
  _id: mongoose.Types.ObjectId;
};

const NAME = "HomeHeroConfig";
if (mongoose.models[NAME]) delete mongoose.models[NAME];
Reflect.deleteProperty(mongoose.connection.models as Record<string, unknown>, NAME);

export const HomeHeroConfig: Model<HomeHeroConfigDoc> = mongoose.model<HomeHeroConfigDoc>(
  NAME,
  HomeHeroConfigSchema,
);
