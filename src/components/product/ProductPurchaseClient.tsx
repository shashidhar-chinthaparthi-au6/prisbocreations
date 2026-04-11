"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { formatInrFromPaise } from "@/lib/format";

export type PurchaseProductOption = {
  key: string;
  label: string;
  pricePaise: number;
  stock: number;
};

export type PurchaseProduct = {
  id: string;
  slug: string;
  name: string;
  pricePaise: number;
  stock: number;
  image?: string;
  options?: PurchaseProductOption[];
};

function parseQty(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Math.floor(Number(t));
  return Number.isFinite(n) ? n : null;
}

export function ProductPurchaseClient({
  product,
  children,
}: {
  product: PurchaseProduct;
  children?: React.ReactNode;
}) {
  const { add } = useCart();
  const options = useMemo(() => product.options ?? [], [product.options]);
  const [selectedKey, setSelectedKey] = useState(options[0]?.key ?? "");
  const [qtyStr, setQtyStr] = useState("1");
  const [cartMsg, setCartMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!options.length) return;
    setSelectedKey((k) => (options.some((o) => o.key === k) ? k : options[0].key));
  }, [options]);

  const selected = useMemo(
    () => options.find((o) => o.key === selectedKey),
    [options, selectedKey],
  );

  const unitPricePaise = selected ? selected.pricePaise : product.pricePaise;
  const maxStock = selected ? selected.stock : product.stock;

  useEffect(() => {
    setQtyStr((prev) => {
      const q = parseQty(prev);
      const base = q !== null && q >= 1 ? q : 1;
      return String(Math.min(base, Math.max(1, maxStock)));
    });
  }, [maxStock, selectedKey]);

  const qtyNum = parseQty(qtyStr);
  const qtyTooHigh = qtyNum !== null && qtyNum > maxStock;
  const qtyTooLow = qtyNum !== null && qtyNum < 1;
  const qtyEmpty = qtyStr.trim() === "";
  const qtyInvalid =
    qtyEmpty || qtyNum === null || qtyTooLow || qtyTooHigh || maxStock < 1;

  let qtyHint: string | null = null;
  if (maxStock < 1) {
    qtyHint = "This option is out of stock.";
  } else if (qtyEmpty) {
    qtyHint = "Enter a quantity.";
  } else if (qtyNum === null) {
    qtyHint = "Enter a whole number.";
  } else if (qtyTooLow) {
    qtyHint = "Quantity must be at least 1.";
  } else if (qtyTooHigh) {
    qtyHint = `Only ${maxStock} available for this option.`;
  }

  return (
    <>
      <p className="mt-3 text-2xl font-semibold text-ink">
        {options.length > 0 ? (
          formatInrFromPaise(unitPricePaise)
        ) : (
          formatInrFromPaise(product.pricePaise)
        )}
      </p>
      {options.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">In stock: {product.stock}</p>
      ) : null}

      {children}

      <div className="mt-8 space-y-3">
        {options.length > 0 ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">Choose option</legend>
            <div className="flex flex-col gap-2">
              {options.map((o) => (
                <label
                  key={o.key}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${
                    selectedKey === o.key
                      ? "border-accent bg-sand/40"
                      : "border-sand-deep hover:border-sand-deep/80"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="pack"
                      value={o.key}
                      checked={selectedKey === o.key}
                      onChange={() => setSelectedKey(o.key)}
                      className="accent-accent"
                    />
                    <span className="text-ink">{o.label}</span>
                  </span>
                  <span className="shrink-0 text-ink-muted">
                    {formatInrFromPaise(o.pricePaise)}
                    <span className="ml-2 text-xs">({o.stock} in stock)</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <label className="text-sm text-ink-muted" htmlFor="product-qty">
            Qty
          </label>
          <input
            id="product-qty"
            type="number"
            inputMode="numeric"
            min={1}
            value={qtyStr}
            onChange={(e) => setQtyStr(e.target.value)}
            aria-invalid={qtyInvalid && qtyStr.trim() !== ""}
            className="w-24 rounded-lg border border-sand-deep bg-white px-3 py-2 text-sm sm:w-28"
          />
        </div>
        {qtyHint ? (
          <p className="text-sm text-rose" role="alert">
            {qtyHint}
          </p>
        ) : null}

        <button
          type="button"
          disabled={maxStock < 1 || qtyInvalid}
          onClick={() => {
            if (options.length > 0 && !selected) return;
            if (qtyInvalid || qtyNum === null) return;
            add({
              productId: product.id,
              slug: product.slug,
              name: product.name,
              pricePaise: unitPricePaise,
              image: product.image,
              optionKey: selected?.key,
              optionLabel: selected?.label,
              quantity: qtyNum,
            });
            setCartMsg("Added to cart");
            setTimeout(() => setCartMsg(null), 2000);
          }}
          className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
        >
          Add to cart
        </button>
        {cartMsg ? <p className="text-sm text-accent">{cartMsg}</p> : null}
      </div>
    </>
  );
}
