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
    colorKey: { type: String },
    colorLabel: { type: String },
    customerImageUrl: { type: String },
    customerNotes: { type: String },
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

/** Shiprocket logistics snapshot (optional). */
const ShiprocketSnapshotSchema = new Schema(
  {
    status: { type: String },
    channelOrderId: { type: String },
    shiprocketOrderId: { type: Number },
    shipmentId: { type: Number },
    awb: { type: String },
    courierId: { type: Number },
    courierName: { type: String },
    trackingUrl: { type: String },
    freightChargeRupees: { type: Number },
    codChargeRupees: { type: Number },
    totalShippingRupees: { type: Number },
    chargesBreakdown: { type: Schema.Types.Mixed },
    lastError: { type: String },
    rawCreate: { type: Schema.Types.Mixed },
    cancelledAt: { type: Date },
    /** Last Shiprocket shipment webhook (panel → Settings → Webhooks). */
    lastWebhookAt: { type: Date },
    webhookStatus: { type: String },
    webhookScans: {
      type: [
        {
          date: { type: String },
          activity: { type: String },
          location: { type: String },
        },
      ],
      default: undefined,
    },
  },
  { _id: false },
);

const OrderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false, index: true },
    guestEmail: { type: String, lowercase: true, trim: true },
    /** Human-readable id for invoices and guest lookup (sparse for legacy docs). */
    invoiceNumber: { type: String, trim: true, uppercase: true, sparse: true, unique: true },
    items: { type: [OrderItemSchema], required: true },
    subtotalPaise: { type: Number, required: true },
    /** Delivery (Shiprocket quote at order time), paise. */
    shippingPaise: { type: Number, default: 0, min: 0 },
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
    cancelReason: { type: String, trim: true },
    orderCancelledAt: { type: Date },
    /** Courier chosen at checkout (Shiprocket `courier_id` from serviceability). */
    shiprocketCourierId: { type: Number },
    shiprocket: { type: ShiprocketSnapshotSchema },
  },
  { timestamps: true }
);

export type OrderDoc = InferSchemaType<typeof OrderSchema> & {
  _id: mongoose.Types.ObjectId;
  userId?: Types.ObjectId;
};

if (mongoose.models.Order) {
  delete mongoose.models.Order;
}

export const Order: Model<OrderDoc> = mongoose.model<OrderDoc>("Order", OrderSchema);
