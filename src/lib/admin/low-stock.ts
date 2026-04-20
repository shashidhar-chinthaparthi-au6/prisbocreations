export function getLowStockThreshold(): number {
  const raw = process.env.NEXT_PUBLIC_LOW_STOCK_THRESHOLD;
  const n = raw ? Number(raw) : 5;
  return Number.isFinite(n) && n >= 0 ? n : 5;
}
