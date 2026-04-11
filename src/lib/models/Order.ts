import mongoose, { Schema, type InferSchemaType, type Model, type Types } from "mongoose";

const OrderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    sku: { type: String, required: true },
    unitPricePaise: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    imageUrl: { type: String },
    optionKey: { type: String },
    optionLabel: { type: String },
  },
  { _id: false }
);

const ShippingSchema = new Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false, index: true },
    guestEmail: { type: String, lowercase: true, trim: true },
    items: { type: [OrderItemSchema], required: true },
    subtotalPaise: { type: Number, required: true },
    totalPaise: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["pending", "paid", "processing", "shipped", "cancelled"],
      default: "pending",
      index: true,
    },
    shipping: { type: ShippingSchema, required: true },
    paymentMethod: {
      type: String,
      enum: ["online", "cod"],
      default: "online",
    },
    razorpayOrderId: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

export type OrderDoc = InferSchemaType<typeof OrderSchema> & {
  _id: mongoose.Types.ObjectId;
  userId?: Types.ObjectId;
};

export const Order: Model<OrderDoc> =
  mongoose.models.Order || mongoose.model<OrderDoc>("Order", OrderSchema);
