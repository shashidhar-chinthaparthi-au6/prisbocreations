import mongoose from "mongoose";
import { resolveCustomerTrackingUrl } from "@/lib/courier-tracking-url";
import { Order } from "@/lib/models/Order";
import { getShiprocketConfig, isShiprocketConfigured } from "@/lib/shiprocket-config";
import {
  shiprocketAssignAwb,
  shiprocketCancelOrders,
  shiprocketCreateAdhoc,
  shiprocketGeneratePickup,
  shiprocketServiceability,
} from "@/lib/services/shiprocketApi";

export type ShiprocketOrderLean = {
  _id: mongoose.Types.ObjectId;
  status: string;
  paymentMethod?: string;
  subtotalPaise: number;
  shippingPaise?: number;
  totalPaise: number;
  shipping: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    unitPricePaise: number;
  }>;
  guestEmail?: string;
  userId?: mongoose.Types.ObjectId;
  shiprocket?: Record<string, unknown> | null;
  shiprocketCourierId?: number | null;
};

function guestEmailForSr(o: ShiprocketOrderLean): string {
  const ge = o.guestEmail?.trim();
  if (ge) return ge;
  return "orders@prisbo.local";
}

function parseCreateResponse(body: Record<string, unknown>): {
  shipmentId: number | null;
  shiprocketOrderId: number | null;
  channelOrderId: string | null;
} {
  const data = (body.data as Record<string, unknown> | undefined) ?? body;
  const shipmentId = Number(data.shipment_id ?? body.shipment_id);
  const shiprocketOrderId = Number(
    data.order_id ?? body.order_id ?? data.id ?? body.id ?? (data as { orderId?: unknown }).orderId,
  );
  const channelOrderId =
    (data.channel_order_id != null ? String(data.channel_order_id) : null) ??
    (body.channel_order_id != null ? String(body.channel_order_id) : null);
  return {
    shipmentId: Number.isFinite(shipmentId) && shipmentId > 0 ? shipmentId : null,
    shiprocketOrderId: Number.isFinite(shiprocketOrderId) && shiprocketOrderId > 0 ? shiprocketOrderId : null,
    channelOrderId,
  };
}

function collectAssignLayers(body: Record<string, unknown>): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const push = (x: unknown) => {
    if (x && typeof x === "object" && !Array.isArray(x)) out.push(x as Record<string, unknown>);
  };
  push(body);
  push(body.data);
  push(body.response);
  const resp = body.response;
  if (resp && typeof resp === "object" && !Array.isArray(resp)) {
    push((resp as Record<string, unknown>).data);
    push((resp as Record<string, unknown>).payload);
  }
  const data = body.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    push((data as Record<string, unknown>).response);
  }
  return out;
}

function extractAwbFromLayers(layers: Record<string, unknown>[]): string | null {
  const keys = [
    "awb_code",
    "awb",
    "airway_bill_no",
    "airway_bill_number",
    "awb_number",
    "tracking_number",
    "lrnum",
  ];
  for (const data of layers) {
    for (const k of keys) {
      const v = data[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return null;
}

function extractCourierFromLayers(layers: Record<string, unknown>[]): string | null {
  const keys = ["courier_name", "courierName", "courier"];
  for (const data of layers) {
    for (const k of keys) {
      const v = data[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return null;
}

function parseAssignResponse(body: Record<string, unknown>): {
  awb: string | null;
  courierName: string | null;
  charges: Record<string, unknown>;
} {
  const layers = collectAssignLayers(body);
  const primary = layers[1] ?? layers[0] ?? body;
  const awb = extractAwbFromLayers(layers);
  const courierName = extractCourierFromLayers(layers);
  return {
    awb,
    courierName,
    charges: typeof primary === "object" && primary ? { ...primary } : {},
  };
}

function rupeesFromApi(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * After payment (online) or on COD placement: create Shiprocket order, assign AWB, request pickup.
 * Best-effort: failures are stored on `order.shiprocket.lastError` without throwing.
 */
export async function syncShiprocketForOrder(orderId: string): Promise<void> {
  if (!isShiprocketConfigured()) return;

  const order = (await Order.findById(orderId).lean()) as ShiprocketOrderLean | null;
  if (!order) return;

  const paidLike =
    order.status === "paid" ||
    order.status === "processing" ||
    order.status === "shipped";
  if (!paidLike) return;

  const existing = order.shiprocket as { shipmentId?: number; lastError?: string } | undefined;
  if (existing?.shipmentId) return;

  const cfg = getShiprocketConfig()!;

  try {
    const cod = order.paymentMethod === "cod";
    const deliveryPin = order.shipping.postalCode.replace(/\D/g, "").slice(0, 6);
    if (deliveryPin.length < 6) {
      await Order.findByIdAndUpdate(orderId, {
        shiprocket: { status: "failed", lastError: "Invalid delivery postal code" },
      });
      return;
    }

    const quotes = await shiprocketServiceability({
      deliveryPostcode: deliveryPin,
      weightKg: cfg.defaultWeightKg,
      cod,
    });
    if (!quotes.length) {
      await Order.findByIdAndUpdate(orderId, {
        shiprocket: {
          status: "failed",
          lastError: "No couriers available for this route / weight",
        },
      });
      return;
    }

    const selected =
      order.shiprocketCourierId && quotes.find((q) => q.courierId === order.shiprocketCourierId)
        ? quotes.find((q) => q.courierId === order.shiprocketCourierId)!
        : quotes[0]!;

    const subTotalRupees = order.subtotalPaise / 100;
    const shippingChargesRupees = (order.shippingPaise ?? 0) / 100;
    const channelOrderId = order._id.toString();

    const createBody = await shiprocketCreateAdhoc({
      channelOrderId,
      billing: {
        fullName: order.shipping.fullName,
        email: guestEmailForSr(order),
        phone: order.shipping.phone,
        address: order.shipping.line1,
        address2: order.shipping.line2,
        city: order.shipping.city,
        state: order.shipping.state,
        pincode: order.shipping.postalCode,
        country: order.shipping.country || "India",
      },
      paymentMethod: cod ? "COD" : "Prepaid",
      orderItems: order.items.map((it) => ({
        name: it.name,
        sku: it.sku || "SKU",
        units: it.quantity,
        sellingPriceRupees: it.unitPricePaise / 100,
      })),
      subTotalRupees,
      shippingChargesRupees,
    });

    const created = parseCreateResponse(createBody);
    if (!created.shipmentId) {
      await Order.findByIdAndUpdate(orderId, {
        shiprocket: {
          status: "failed",
          lastError: "Create order succeeded but shipment_id missing",
          rawCreate: createBody,
        },
      });
      return;
    }

    let awb: string | null = null;
    let courierName: string | null = selected.courierName;
    let assignCharges: Record<string, unknown> = {
      quoteFreight: selected.freightCharge,
      quoteCod: selected.codCharges,
      quoteTotal: selected.totalCharge,
    };

    try {
      const assignBody = await shiprocketAssignAwb(created.shipmentId, selected.courierId);
      const parsed = parseAssignResponse(assignBody);
      awb = parsed.awb;
      courierName = parsed.courierName ?? courierName;
      assignCharges = { ...assignCharges, ...parsed.charges };
      if (!awb && assignCharges && typeof assignCharges === "object") {
        awb = extractAwbFromLayers([assignCharges as Record<string, unknown>]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Assign AWB failed";
      await Order.findByIdAndUpdate(orderId, {
        shiprocket: {
          status: "created_no_awb",
          channelOrderId,
          shiprocketOrderId: created.shiprocketOrderId ?? undefined,
          shipmentId: created.shipmentId,
          courierId: selected.courierId,
          courierName: selected.courierName,
          freightChargeRupees: selected.freightCharge,
          codChargeRupees: selected.codCharges,
          totalShippingRupees: selected.totalCharge,
          chargesBreakdown: {
            ...assignCharges,
            orderItemsSubtotalRupees: subTotalRupees,
            storeDeliveryFeeRupees: shippingChargesRupees,
            storeOrderTotalRupees: subTotalRupees + shippingChargesRupees,
          },
          lastError: msg,
          rawCreate: createBody,
        },
      });
      return;
    }

    try {
      await shiprocketGeneratePickup([created.shipmentId]);
    } catch {
      // Pickup slot may still be bookable from panel; shipment exists
    }

    const freight = rupeesFromApi(assignCharges.freight_charge) || selected.freightCharge;
    const codCh = rupeesFromApi(assignCharges.cod_charges) || selected.codCharges;
    const totalShip = rupeesFromApi(assignCharges.total_charges) || freight + codCh;

    await Order.findByIdAndUpdate(orderId, {
      shiprocket: {
        status: "pickup_requested",
        channelOrderId,
        shiprocketOrderId: created.shiprocketOrderId ?? undefined,
        shipmentId: created.shipmentId,
        awb: awb ?? undefined,
        courierId: selected.courierId,
        courierName: courierName ?? selected.courierName,
        trackingUrl: awb
          ? resolveCustomerTrackingUrl(awb, {
              courierName: courierName ?? selected.courierName,
            })
          : undefined,
        freightChargeRupees: freight,
        codChargeRupees: codCh,
        totalShippingRupees: totalShip || freight + codCh,
        chargesBreakdown: {
          ...assignCharges,
          quotedFreightRupees: selected.freightCharge,
          quotedCodRupees: selected.codCharges,
          quotedTotalRupees: selected.totalCharge,
          orderItemsSubtotalRupees: subTotalRupees,
          storeDeliveryFeeRupees: shippingChargesRupees,
          storeOrderTotalRupees: subTotalRupees + shippingChargesRupees,
        },
        rawCreate: createBody,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Shiprocket sync failed";
    await Order.findByIdAndUpdate(orderId, {
      $set: { "shiprocket.lastError": msg, "shiprocket.status": "failed" },
    });
  }
}

export async function cancelShiprocketForOrder(order: ShiprocketOrderLean): Promise<void> {
  if (!isShiprocketConfigured()) return;
  const sr = order.shiprocket as { shiprocketOrderId?: number; status?: string } | undefined;
  const id = sr?.shiprocketOrderId;
  if (!id || sr?.status === "cancelled") return;
  try {
    await shiprocketCancelOrders([id]);
    await Order.findByIdAndUpdate(order._id.toString(), {
      $set: {
        "shiprocket.status": "cancelled",
        "shiprocket.cancelledAt": new Date(),
      },
    });
  } catch {
    // Surface in order notes optional — admin can retry from panel
  }
}
