import type mongoose from "mongoose";

export type OrderNotifyPayload = {
  _id: mongoose.Types.ObjectId | string;
  invoiceNumber?: string;
  status?: string;
  paymentMethod?: string;
  totalPaise: number;
  subtotalPaise?: number;
  shippingPaise?: number;
  discountPaise?: number;
  estimatedDelivery?: string;
  guestEmail?: string | null;
  userId?: mongoose.Types.ObjectId | null;
  shipping: {
    fullName: string;
    phone: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  items?: Array<{
    name: string;
    quantity: number;
    unitPricePaise?: number;
    imageUrl?: string;
    optionLabel?: string;
    colorLabel?: string;
  }>;
  cancelReason?: string;
  shiprocket?: { awb?: string; trackingUrl?: string; courierName?: string };
};
