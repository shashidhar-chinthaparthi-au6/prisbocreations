import { Coupon } from "@/lib/models/Coupon";

export async function validateCouponCode(
  code: string,
  subtotalPaise: number,
): Promise<{ valid: boolean; discountPaise: number; message: string }> {
  const c = code.trim().toUpperCase();
  if (!c) return { valid: false, discountPaise: 0, message: "Enter a coupon code" };

  const doc = await Coupon.findOne({ code: c }).lean();
  if (!doc || !doc.isActive) {
    return { valid: false, discountPaise: 0, message: "Invalid or expired coupon" };
  }
  if (doc.expiresAt && doc.expiresAt.getTime() < Date.now()) {
    return { valid: false, discountPaise: 0, message: "This coupon has expired" };
  }
  if (doc.maxUses != null && doc.usedCount >= doc.maxUses) {
    return { valid: false, discountPaise: 0, message: "This coupon is no longer available" };
  }
  if (doc.minOrderValuePaise != null && subtotalPaise < doc.minOrderValuePaise) {
    const minR = Math.ceil(doc.minOrderValuePaise / 100);
    return {
      valid: false,
      discountPaise: 0,
      message: `Minimum order ₹${minR} required for this coupon`,
    };
  }

  let discountPaise = 0;
  if (doc.type === "PERCENT") {
    discountPaise = Math.floor((subtotalPaise * doc.value) / 100);
  } else {
    discountPaise = Math.round(doc.value * 100);
  }
  discountPaise = Math.min(discountPaise, subtotalPaise);
  if (discountPaise <= 0) {
    return { valid: false, discountPaise: 0, message: "Coupon cannot be applied to this cart" };
  }

  return {
    valid: true,
    discountPaise,
    message:
      doc.type === "PERCENT"
        ? `${doc.value}% off applied`
        : `₹${Math.round(doc.value)} off applied`,
  };
}

/** Call once after an order is successfully persisted. */
export async function incrementCouponUseCount(code: string): Promise<void> {
  const c = code.trim().toUpperCase();
  if (!c) return;
  await Coupon.updateOne({ code: c }, { $inc: { usedCount: 1 } }).catch(() => {});
}
