import type { TrackingStage } from "@/lib/trackingStatus";

export type TrackEventRow = {
  status: string;
  stage: TrackingStage;
  location?: string | null;
  description?: string | null;
  eventAt: string;
};

/** Public + account tracking API payload (client-safe). */
export type TrackPayload = {
  orderNumber: string;
  status: string;
  paymentMethod: string;
  placedAt: string;
  estimatedDelivery: string | null;
  awbCode: string | null;
  courierName: string;
  items: Array<{
    name: string;
    variant?: string;
    size?: string;
    quantity: number;
    imageUrl: string | null;
  }>;
  shippingAddress: Record<string, string>;
  events: TrackEventRow[];
  currentStage: TrackingStage;
  totalPaise: number;
  subtotalPaise: number;
  shippingPaise: number;
  discountPaise: number;
  lastUpdatedAt: string;
  cacheAgeHours: number;
  lastFetchAttemptFailed: boolean;
  flowStages: TrackingStage[];
  /** Present when order was placed without a linked user account. */
  isGuestOrder?: boolean;
};
