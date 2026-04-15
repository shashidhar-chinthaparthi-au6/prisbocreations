/** Line total including per-unit gift wrap add-on when present. */
export function orderLineTotalPaise(it: {
  unitPricePaise: number;
  quantity: number;
  giftWrapPaise?: number | null;
}): number {
  const wrap =
    typeof it.giftWrapPaise === "number" && Number.isFinite(it.giftWrapPaise) && it.giftWrapPaise > 0
      ? it.giftWrapPaise
      : 0;
  return it.unitPricePaise * it.quantity + wrap * it.quantity;
}
