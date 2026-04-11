"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { uploadCustomerImageToS3 } from "@/lib/api/customer-upload-client";
import { MAX_CUSTOMER_IMAGE_BYTES } from "@/lib/media-upload";
import { formatInrFromPaise } from "@/lib/format";
import { Spinner } from "@/components/ui/Spinner";
import { isHtmlContentEmpty } from "@/lib/html-content-empty";

export type PurchaseProductOption = {
  key: string;
  label: string;
  pricePaise: number;
  stock: number;
  /** Sanitized HTML; when set and non-empty, replaces base description for this pack. */
  descriptionHtml?: string;
};

export type PurchaseColorVariant = {
  key: string;
  label: string;
};

export type PurchaseProduct = {
  id: string;
  slug: string;
  name: string;
  pricePaise: number;
  stock: number;
  image?: string;
  options?: PurchaseProductOption[];
  allowCustomerCustomization?: boolean;
  customizationInstructions?: string;
  customizationTextLabel?: string;
  customizationTextPlaceholder?: string;
  customizationTextMaxLength?: number;
  customizationImageRequired?: boolean;
  customizationTextRequired?: boolean;
};

function parseQty(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Math.floor(Number(t));
  return Number.isFinite(n) ? n : null;
}

export function ProductPurchaseClient({
  product,
  descriptionHtml,
  tags = [],
  colorVariants,
  selectedColorKey,
  onColorKeyChange,
  cartThumbnailUrl,
}: {
  product: PurchaseProduct;
  /** Sanitized HTML from the server (TipTap output). */
  descriptionHtml: string;
  tags?: string[];
  /** When set with handlers, shopper must pick a colour (gallery driven by parent). */
  colorVariants?: PurchaseColorVariant[];
  selectedColorKey?: string;
  onColorKeyChange?: (key: string) => void;
  /** Hero image for cart row when colour changes visible gallery. */
  cartThumbnailUrl?: string;
}) {
  const { add } = useCart();
  const colors = useMemo(() => colorVariants ?? [], [colorVariants]);
  const options = useMemo(() => product.options ?? [], [product.options]);
  const [selectedKey, setSelectedKey] = useState(options[0]?.key ?? "");
  const [qtyStr, setQtyStr] = useState("1");
  const [cartMsg, setCartMsg] = useState<string | null>(null);

  const customize = Boolean(product.allowCustomerCustomization);
  const imgReq = product.customizationImageRequired !== false;
  const txtReq = product.customizationTextRequired === true;
  const maxNotes = Math.min(
    2000,
    Math.max(1, product.customizationTextMaxLength ?? 500),
  );
  const textLabel = product.customizationTextLabel?.trim() || "Notes / text to print";
  const textPlaceholder = product.customizationTextPlaceholder?.trim() ?? "";

  const [customerNotes, setCustomerNotes] = useState("");
  const [customerImageUrl, setCustomerImageUrl] = useState("");
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [customErr, setCustomErr] = useState<string | null>(null);

  useEffect(() => {
    if (!options.length) return;
    setSelectedKey((k) => (options.some((o) => o.key === k) ? k : options[0].key));
  }, [options]);

  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const selected = useMemo(
    () => options.find((o) => o.key === selectedKey),
    [options, selectedKey],
  );

  const displayDescriptionHtml = useMemo(() => {
    if (options.length === 0) return descriptionHtml;
    const ov = selected?.descriptionHtml;
    if (ov && !isHtmlContentEmpty(ov)) return ov;
    return descriptionHtml;
  }, [descriptionHtml, options.length, selected?.descriptionHtml]);

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

  function customizationMessage(): string | null {
    if (!customize) return null;
    const img = customerImageUrl.trim();
    const notes = customerNotes.trim();
    if (notes.length > maxNotes) {
      return `Notes are too long (max ${maxNotes} characters).`;
    }
    if (imgReq && !img) return "Please upload a reference image.";
    if (txtReq && !notes) return "Please enter the requested text.";
    if (!imgReq && !txtReq && !img && !notes) {
      return "Add an image and/or notes for this personalised product.";
    }
    return null;
  }

  async function onPickImage(file: File | null) {
    setUploadErr(null);
    if (!file) return;
    if (filePreview) URL.revokeObjectURL(filePreview);
    const local = URL.createObjectURL(file);
    setFilePreview(local);
    setCustomerImageUrl("");
    setUploadBusy(true);
    try {
      const url = await uploadCustomerImageToS3(file);
      setCustomerImageUrl(url);
      setFilePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : "Upload failed");
      setCustomerImageUrl("");
    } finally {
      setUploadBusy(false);
    }
  }

  function clearImage() {
    setUploadErr(null);
    setCustomerImageUrl("");
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
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

      {colors.length > 0 && selectedColorKey !== undefined && onColorKeyChange ? (
        <fieldset className="mt-6 space-y-2">
          <legend className="text-sm font-medium text-ink">Choose colour</legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <label
                key={c.key}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition ${
                  selectedColorKey === c.key
                    ? "border-accent bg-sand/40 font-medium text-ink"
                    : "border-sand-deep text-ink-muted hover:border-sand-deep/80"
                }`}
              >
                <input
                  type="radio"
                  name="product-color"
                  value={c.key}
                  checked={selectedColorKey === c.key}
                  onChange={() => onColorKeyChange(c.key)}
                  className="sr-only"
                />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {options.length > 0 ? (
        <fieldset className="mt-6 space-y-2">
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

      <div
        key={options.length > 0 ? `${selectedKey}-desc` : "product-desc"}
        suppressHydrationWarning
        className="product-description prose prose-slate mt-6 max-w-none leading-relaxed text-ink-muted prose-headings:font-display prose-headings:text-ink prose-p:text-ink-muted prose-strong:text-ink prose-li:marker:text-ink-muted prose-blockquote:border-sand-deep prose-blockquote:text-ink-muted prose-a:text-accent"
        dangerouslySetInnerHTML={{ __html: displayDescriptionHtml }}
      />
      {tags.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-sand-deep px-3 py-1 text-xs text-ink-muted"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}

      {customize ? (
        <div className="mt-8 space-y-3 rounded-2xl border border-sand-deep bg-sand/30 p-4">
          <h2 className="text-sm font-semibold text-ink">Your personalisation</h2>
          {product.customizationInstructions?.trim() ? (
            <p className="text-sm text-ink-muted whitespace-pre-wrap">
              {product.customizationInstructions.trim()}
            </p>
          ) : (
            <p className="text-sm text-ink-muted">
              Upload a reference image if needed, and add any text we should use (e.g. name to
              print).
            </p>
          )}
          <div className="space-y-2">
              <label className="block text-xs font-medium text-ink-muted">
                Reference image{imgReq ? " (required)" : " (optional)"}
              </label>
              <p className="text-[11px] text-ink-muted">
                JPEG, PNG, WebP, or GIF — up to{" "}
                {Math.round(MAX_CUSTOMER_IMAGE_BYTES / (1024 * 1024))} MB.
              </p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                disabled={uploadBusy}
                className="block w-full text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
              />
              {uploadBusy ? (
                <p className="inline-flex items-center gap-2 text-xs text-ink-muted">
                  <Spinner size="sm" />
                  Uploading…
                </p>
              ) : null}
              {uploadErr ? (
                <p className="text-xs text-rose" role="alert">
                  {uploadErr}
                </p>
              ) : null}
              {(customerImageUrl || filePreview) && (
                <div className="relative mt-2 inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={customerImageUrl || filePreview || ""}
                    alt="Your upload preview"
                    className="max-h-48 max-w-full rounded-lg border border-sand-deep object-contain"
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="mt-2 text-xs text-rose hover:underline"
                  >
                    Remove image
                  </button>
                </div>
              )}
          </div>
          <label className="block text-xs font-medium text-ink-muted">
            {textLabel}
            {txtReq ? "" : " (optional)"}
            <textarea
              value={customerNotes}
              maxLength={maxNotes}
              placeholder={textPlaceholder}
              rows={3}
              onChange={(e) => setCustomerNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border border-sand-deep bg-white px-3 py-2 text-sm text-ink"
            />
          </label>
          <p className="text-xs text-ink-muted">
            {customerNotes.length}/{maxNotes} characters
          </p>
        </div>
      ) : null}

      <div className="mt-8 space-y-3">
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

        {customErr ? (
          <p className="text-sm text-rose" role="alert">
            {customErr}
          </p>
        ) : null}

        <button
          type="button"
          disabled={maxStock < 1 || qtyInvalid || uploadBusy}
          onClick={() => {
            if (options.length > 0 && !selected) return;
            if (qtyInvalid || qtyNum === null) return;
            if (customize) {
              const msg = customizationMessage();
              if (msg) {
                setCustomErr(msg);
                return;
              }
              setCustomErr(null);
            }
            const colorLabel =
              colors.length && selectedColorKey
                ? colors.find((c) => c.key === selectedColorKey)?.label
                : undefined;
            add({
              productId: product.id,
              slug: product.slug,
              name: product.name,
              pricePaise: unitPricePaise,
              image: cartThumbnailUrl ?? product.image,
              optionKey: selected?.key,
              optionLabel: selected?.label,
              ...(colors.length && selectedColorKey
                ? { colorKey: selectedColorKey, colorLabel }
                : {}),
              quantity: qtyNum,
              ...(customize
                ? {
                    customerImageUrl: customerImageUrl.trim() || undefined,
                    customerNotes: customerNotes.trim() || undefined,
                  }
                : {}),
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
