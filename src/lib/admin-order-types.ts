/** Admin orders list/detail — matches API payload after listOrdersAdmin enrichment. */

export type AdminOrderItem = {
  productId?: string;
  name: string;
  slug: string;
  sku: string;
  unitPricePaise: number;
  quantity: number;
  imageUrl?: string;
  optionKey?: string;
  optionLabel?: string;
  colorKey?: string;
  colorLabel?: string;
  customerImageUrl?: string;
  customerNotes?: string;
  giftWrapPaise?: number;
  giftMessage?: string;
};

export type AdminOrderShipping = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type AdminOrderFull = {
  _id: string;
  invoiceNumber?: string;
  status: string;
  totalPaise: number;
  subtotalPaise: number;
  shippingPaise?: number;
  currency?: string;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
  guestEmail?: string;
  customerEmail?: string;
  paymentMethod?: string;
  razorpayOrderId?: string;
  notes?: string;
  cancelReason?: string;
  orderCancelledAt?: string | Date;
  shiprocketCourierId?: number;
  shipping?: AdminOrderShipping;
  items: AdminOrderItem[];
  shiprocket?: Record<string, unknown> | null;
};
