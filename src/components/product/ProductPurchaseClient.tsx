"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { uploadCustomerImageToS3 } from "@/lib/api/customer-upload-client";
import { MAX_CUSTOMER_IMAGE_BYTES } from "@/lib/media-upload";
import { formatInrFromPaise } from "@/lib/format";
import { GIFT_WRAP_PAISE } from "@/lib/gift-wrap";
import { Spinner } from "@/components/ui/Spinner";
import { isHtmlContentEmpty } from "@/lib/html-content-empty";

export type PurchaseProductOption = {
  key: string;
  label: string;
  pricePaise: number;
  stock: number;
  /** Sanitized HTML; when set and non-empty, replaces base description for this pack. */
  descriptionHtml?: string;
  /** Per-pack structured content when product has multiple packs. */
  specificationRows?: { key: string; value: string }[];
  featureLines?: string[];
  highlightLines?: string[];
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

const FONT_OPTIONS = [
  { value: "sans", label: "Modern sans" },
  { value: "serif", label: "Classic serif" },
  { value: "script", label: "Script style" },
] as const;

function parseQty(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Math.floor(Number(t));
  return Number.isFinite(n) ? n : null;
}

function deliveryHintForPincode(pin: string): string | null {
  const p = pin.replace(/\D/g, "");
  if (p.length !== 6) return null;
  return "Orders usually leave our studio in 1–2 business days. After dispatch, most metros arrive in roughly 4–6 business days; other pincodes can take a little longer. You’ll get tracking by email.";
}

const SECTION_PROSE =
  "prose prose-slate mt-8 max-w-none leading-relaxed text-ink-muted prose-headings:font-display prose-headings:text-ink prose-p:text-ink-muted prose-strong:text-ink prose-li:marker:text-ink-muted prose-blockquote:border-sand-deep prose-blockquote:text-ink-muted prose-a:text-accent";

export function ProductPurchaseClient({
  product,
  descriptionHtml,
  specificationRows = [],
  featureLines = [],
  highlightLines = [],
  legacySpecificationsHtml = "",
  legacyFeaturesHtml = "",
  legacyHighlightsHtml = "",
  tags = [],
  colorVariants,
  selectedColorKey,
  onColorKeyChange,
  cartThumbnailUrl,
}: {
  product: PurchaseProduct;
  /** Sanitized HTML from the server (TipTap output). */
  descriptionHtml: string;
  specificationRows?: { key: string; value: string }[];
  featureLines?: string[];
  highlightLines?: string[];
  /** Legacy rich HTML when structured fields are empty (older products). */
  legacySpecificationsHtml?: string;
  legacyFeaturesHtml?: string;
  legacyHighlightsHtml?: string;
  tags?: string[];
  /** When set with handlers, shopper must pick a colour (gallery driven by parent). */
  colorVariants?: PurchaseColorVariant[];
  selectedColorKey?: string;
  onColorKeyChange?: (key: string) => void;
  /** Hero image for cart row when colour changes visible gallery. */
  cartThumbnailUrl?: string;
}) {
  const router = useRouter();
  const { add } = useCart();
  const colors = useMemo(() => colorVariants ?? [], [colorVariants]);
  const options = useMemo(() => product.options ?? [], [product.options]);
  const visibleOptions = useMemo(() => {
    if (!colors.length || !selectedColorKey || !options.length) return options;
    const prefix = `${selectedColorKey}__`;
    const filtered = options.filter((o) => o.key.startsWith(prefix));
    return filtered.length ? filtered : options;
  }, [colors.length, selectedColorKey, options]);
  const [selectedKey, setSelectedKey] = useState(visibleOptions[0]?.key ?? "");
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
  const [fontKey, setFontKey] = useState<(typeof FONT_OPTIONS)[number]["value"]>("sans");
  const [customerImageUrl, setCustomerImageUrl] = useState("");
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [customErr, setCustomErr] = useState<string | null>(null);

  const [deliveryPin, setDeliveryPin] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [giftWrap, setGiftWrap] = useState(false);

  useEffect(() => {
    if (!visibleOptions.length) return;
    setSelectedKey((k) =>
      visibleOptions.some((o) => o.key === k) ? k : visibleOptions[0].key,
    );
  }, [visibleOptions]);

  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const selected = useMemo(
    () => visibleOptions.find((o) => o.key === selectedKey),
    [visibleOptions, selectedKey],
  );

  const displaySpecificationRows = useMemo(() => {
    if (visibleOptions.length === 0) return specificationRows;
    const ov = selected?.specificationRows;
    if (ov && ov.length > 0) return ov;
    return specificationRows;
  }, [visibleOptions.length, selected?.specificationRows, specificationRows]);

  const displayFeatureLines = useMemo(() => {
    if (visibleOptions.length === 0) return featureLines;
    const ov = selected?.featureLines;
    if (ov && ov.length > 0) return ov;
    return featureLines;
  }, [visibleOptions.length, selected?.featureLines, featureLines]);

  const displayHighlightLines = useMemo(() => {
    if (visibleOptions.length === 0) return highlightLines;
    const ov = selected?.highlightLines;
    if (ov && ov.length > 0) return ov;
    return highlightLines;
  }, [visibleOptions.length, selected?.highlightLines, highlightLines]);

  const displayDescriptionHtml = useMemo(() => {
    if (visibleOptions.length === 0) return descriptionHtml;
    const ov = selected?.descriptionHtml;
    if (ov && !isHtmlContentEmpty(ov)) return ov;
    return descriptionHtml;
  }, [descriptionHtml, visibleOptions.length, selected?.descriptionHtml]);

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

  const notesForSubmit = useMemo(() => {
    const base = customerNotes.trim();
    if (!customize) return base;
    const label = FONT_OPTIONS.find((f) => f.value === fontKey)?.label ?? fontKey;
    const line = `Type style: ${label}`;
    if (!base) return line;
    return `${base}\n— ${line} —`;
  }, [customize, customerNotes, fontKey]);

  function customizationMessage(): string | null {
    if (!customize) return null;
    const img = customerImageUrl.trim();
    const notes = notesForSubmit;
    const userPart = customerNotes.trim();
    if (userPart.length > maxNotes) {
      return `Notes are too long (max ${maxNotes} characters).`;
    }
    if (notes.length > maxNotes + 120) {
      return `Combined text is too long — shorten your message slightly.`;
    }
    if (imgReq && !img) return "Please upload a reference image.";
    if (txtReq && !userPart) return "Please enter the requested text.";
    if (!imgReq && !txtReq && !img && !userPart) {
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

  const deliveryHint = useMemo(() => deliveryHintForPincode(deliveryPin), [deliveryPin]);

  const buildPayload = useCallback(() => {
    const colorLabel =
      colors.length && selectedColorKey
        ? colors.find((c) => c.key === selectedColorKey)?.label
        : undefined;
    return {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      pricePaise: unitPricePaise,
      image: cartThumbnailUrl ?? product.image,
      optionKey: selected?.key,
      optionLabel: selected?.label,
      ...(colors.length && selectedColorKey ? { colorKey: selectedColorKey, colorLabel } : {}),
      quantity: qtyNum!,
      ...(customize
        ? {
            customerImageUrl: customerImageUrl.trim() || undefined,
            customerNotes: notesForSubmit.trim() || undefined,
          }
        : {}),
      ...(isGift && giftMessage.trim() ? { giftMessage: giftMessage.trim() } : {}),
      ...(giftWrap ? { giftWrap: true as const } : {}),
    };
  }, [
    colors,
    selectedColorKey,
    product,
    unitPricePaise,
    cartThumbnailUrl,
    selected?.key,
    selected?.label,
    customize,
    customerImageUrl,
    notesForSubmit,
    isGift,
    giftMessage,
    giftWrap,
    qtyNum,
  ]);

  function tryAddToCart(opts: { openDrawer: boolean; buyNow?: boolean }) {
    if (visibleOptions.length > 0 && !selected) return;
    if (qtyInvalid || qtyNum === null) return;
    if (customize) {
      const msg = customizationMessage();
      if (msg) {
        setCustomErr(msg);
        return;
      }
      setCustomErr(null);
    }
    add(buildPayload(), { openDrawer: opts.openDrawer });
    if (opts.buyNow) {
      router.push("/checkout");
      return;
    }
    setCartMsg("Added to your cart");
    setTimeout(() => setCartMsg(null), 2200);
  }

  const stepShell =
    "rounded-2xl border border-accent/25 bg-gradient-to-b from-white to-sand/40 p-4 shadow-sm ring-1 ring-sand-deep/60";

  return (
    <>
      <p className="mt-3 text-2xl font-semibold text-ink">
        {visibleOptions.length > 0 ? (
          formatInrFromPaise(unitPricePaise)
        ) : (
          formatInrFromPaise(product.pricePaise)
        )}
      </p>
      {visibleOptions.length === 0 ? (
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

      {visibleOptions.length > 0 ? (
        <fieldset className="mt-6 space-y-2">
          <legend className="text-sm font-medium text-ink">Choose option</legend>
          <div className="flex flex-col gap-2">
            {visibleOptions.map((o) => (
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

      {customize ? (
        <div className="mt-8 space-y-5">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-lg text-ink">Make it yours</h2>
            <span className="text-xs font-medium uppercase tracking-wide text-accent">Step 1–3</span>
          </div>
          <ol className="space-y-4">
            <li className={stepShell}>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">Step 1</p>
              <h3 className="mt-1 text-sm font-semibold text-ink">Upload your photo</h3>
              {product.customizationInstructions?.trim() ? (
                <p className="mt-1 text-xs text-ink-muted whitespace-pre-wrap">
                  {product.customizationInstructions.trim()}
                </p>
              ) : (
                <p className="mt-1 text-xs text-ink-muted">
                  Clear, well-lit photos print best. You can crop on your phone before uploading.
                </p>
              )}
              <div className="mt-3 space-y-2">
                <label className="block text-xs font-medium text-ink-muted">
                  Reference image{imgReq ? " (required)" : " (optional)"}
                </label>
                <p className="text-[11px] text-ink-muted">
                  JPEG, PNG, WebP, or GIF — up to {Math.round(MAX_CUSTOMER_IMAGE_BYTES / (1024 * 1024))}{" "}
                  MB.
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
            </li>
            <li className={stepShell}>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">Step 2</p>
              <h3 className="mt-1 text-sm font-semibold text-ink">Name &amp; text to print</h3>
              <label className="mt-3 block text-xs font-medium text-ink-muted">
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
              <p className="mt-1 text-xs text-ink-muted">
                {customerNotes.length}/{maxNotes} characters
              </p>
            </li>
            <li className={stepShell}>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">Step 3</p>
              <h3 className="mt-1 text-sm font-semibold text-ink">Choose font style</h3>
              <p className="mt-1 text-xs text-ink-muted">
                We&apos;ll match this as closely as the product allows.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {FONT_OPTIONS.map((f) => (
                  <label
                    key={f.value}
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium sm:text-sm ${
                      fontKey === f.value
                        ? "border-accent bg-sand/50 text-ink"
                        : "border-sand-deep text-ink-muted hover:border-sand-deep/80"
                    }`}
                  >
                    <input
                      type="radio"
                      name="font-pref"
                      value={f.value}
                      checked={fontKey === f.value}
                      onChange={() => setFontKey(f.value)}
                      className="sr-only"
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </li>
          </ol>
        </div>
      ) : null}

      <div className="mt-8 rounded-2xl border border-sand-deep bg-white/80 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Check delivery timing</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Enter your delivery pincode for a quick estimate (final date depends on courier updates).
        </p>
        <label className="mt-3 block text-xs font-medium text-ink-muted">
          Pincode
          <input
            type="text"
            inputMode="numeric"
            maxLength={8}
            value={deliveryPin}
            onChange={(e) => setDeliveryPin(e.target.value)}
            placeholder="e.g. 560001"
            className="mt-1 w-full max-w-[12rem] rounded-lg border border-sand-deep bg-white px-3 py-2 font-mono text-sm text-ink"
          />
        </label>
        {deliveryHint ? (
          <p className="mt-3 rounded-lg bg-sand/60 px-3 py-2 text-xs leading-relaxed text-ink-muted">
            {deliveryHint}
          </p>
        ) : (
          <p className="mt-2 text-xs text-ink-muted">Use the 6-digit pincode you&apos;ll ship to.</p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-sand-deep bg-sand/25 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={isGift}
            onChange={(e) => {
              setIsGift(e.target.checked);
              if (!e.target.checked) {
                setGiftMessage("");
                setGiftWrap(false);
              }
            }}
            className="mt-1 accent-accent"
          />
          <span>
            <span className="text-sm font-medium text-ink">This order is a gift</span>
            <span className="mt-0.5 block text-xs text-ink-muted">
              Add a message for the packing slip. Optional gift wrap adds{" "}
              {formatInrFromPaise(GIFT_WRAP_PAISE)} per item.
            </span>
          </span>
        </label>
        {isGift ? (
          <div className="mt-4 space-y-3 border-t border-sand-deep/80 pt-4">
            <label className="block text-xs font-medium text-ink-muted">
              Gift message (printed for your recipient)
              <textarea
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="e.g. Happy anniversary, Ammu & Kiran — with love"
                className="mt-1 w-full rounded-lg border border-sand-deep bg-white px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-sand-deep bg-white px-3 py-2">
              <input
                type="checkbox"
                checked={giftWrap}
                onChange={(e) => setGiftWrap(e.target.checked)}
                className="mt-1 accent-accent"
              />
              <span className="text-sm text-ink">
                <span className="font-medium">Premium gift wrapping</span>
                <span className="ml-1 text-emerald-800">+{formatInrFromPaise(GIFT_WRAP_PAISE)}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  Kraft paper, ribbon, and a handwritten tag where possible.
                </span>
              </span>
            </label>
          </div>
        ) : null}
      </div>

      <div
        key={visibleOptions.length > 0 ? `${selectedKey}-desc` : "product-desc"}
        suppressHydrationWarning
        className="product-description prose prose-slate mt-8 max-w-none leading-relaxed text-ink-muted prose-headings:font-display prose-headings:text-ink prose-p:text-ink-muted prose-strong:text-ink prose-li:marker:text-ink-muted prose-blockquote:border-sand-deep prose-blockquote:text-ink-muted prose-a:text-accent"
        dangerouslySetInnerHTML={{ __html: displayDescriptionHtml }}
      />
      {displayFeatureLines.length > 0 ? (
        <section className="border-t border-sand-deep/80 pt-8" aria-labelledby="product-features-heading">
          <h2 id="product-features-heading" className="font-display text-xl text-ink">
            Features
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-muted marker:text-ink-muted">
            {displayFeatureLines.map((line, i) => (
              <li key={`f-${i}`}>{line}</li>
            ))}
          </ul>
        </section>
      ) : !isHtmlContentEmpty(legacyFeaturesHtml) ? (
        <section className="border-t border-sand-deep/80 pt-8" aria-labelledby="product-features-heading">
          <h2 id="product-features-heading" className="font-display text-xl text-ink">
            Features
          </h2>
          <div
            suppressHydrationWarning
            className={SECTION_PROSE}
            dangerouslySetInnerHTML={{ __html: legacyFeaturesHtml }}
          />
        </section>
      ) : null}
      {displaySpecificationRows.length > 0 ? (
        <section
          className="border-t border-sand-deep/80 pt-8"
          aria-labelledby="product-specifications-heading"
        >
          <h2 id="product-specifications-heading" className="font-display text-xl text-ink">
            Specifications
          </h2>
          <dl className="mt-3 divide-y divide-sand-deep/80 rounded-lg border border-sand-deep/80 bg-white/60 text-sm">
            {displaySpecificationRows.map((row, i) => (
              <div
                key={`spec-${i}-${row.key}`}
                className="grid gap-0.5 px-3 py-2.5 sm:grid-cols-[minmax(0,10rem)_1fr] sm:gap-4"
              >
                <dt className="font-medium text-ink">{row.key}</dt>
                <dd className="text-ink-muted">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : !isHtmlContentEmpty(legacySpecificationsHtml) ? (
        <section
          className="border-t border-sand-deep/80 pt-8"
          aria-labelledby="product-specifications-heading"
        >
          <h2 id="product-specifications-heading" className="font-display text-xl text-ink">
            Specifications
          </h2>
          <div
            suppressHydrationWarning
            className={SECTION_PROSE}
            dangerouslySetInnerHTML={{ __html: legacySpecificationsHtml }}
          />
        </section>
      ) : null}
      {displayHighlightLines.length > 0 ? (
        <section className="border-t border-sand-deep/80 pt-8" aria-labelledby="product-highlights-heading">
          <h2 id="product-highlights-heading" className="font-display text-xl text-ink">
            Highlights
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-muted marker:text-ink-muted">
            {displayHighlightLines.map((line, i) => (
              <li key={`h-${i}`}>{line}</li>
            ))}
          </ul>
        </section>
      ) : !isHtmlContentEmpty(legacyHighlightsHtml) ? (
        <section className="border-t border-sand-deep/80 pt-8" aria-labelledby="product-highlights-heading">
          <h2 id="product-highlights-heading" className="font-display text-xl text-ink">
            Highlights
          </h2>
          <div
            suppressHydrationWarning
            className={SECTION_PROSE}
            dangerouslySetInnerHTML={{ __html: legacyHighlightsHtml }}
          />
        </section>
      ) : null}
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

      <div className="mt-8 hidden space-y-3 md:block">
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
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            disabled={maxStock < 1 || qtyInvalid || uploadBusy}
            onClick={() => tryAddToCart({ openDrawer: false })}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add to cart
          </button>
          <button
            type="button"
            disabled={maxStock < 1 || qtyInvalid || uploadBusy}
            onClick={() => tryAddToCart({ openDrawer: false, buyNow: true })}
            className="rounded-full border-2 border-accent bg-white px-6 py-3 text-sm font-semibold text-accent hover:bg-sand/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Buy now
          </button>
        </div>
        {cartMsg ? <p className="text-sm text-accent">{cartMsg}</p> : null}
      </div>

      <div className="mt-4 space-y-3 md:hidden">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-ink-muted" htmlFor="product-qty-mobile">
            Qty
          </label>
          <input
            id="product-qty-mobile"
            type="number"
            inputMode="numeric"
            min={1}
            value={qtyStr}
            onChange={(e) => setQtyStr(e.target.value)}
            className="w-24 rounded-lg border border-sand-deep bg-white px-3 py-2 text-sm"
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
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-sand-deep bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur-md md:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-ink-muted">{product.name}</p>
            <p className="font-display text-lg font-semibold text-ink">
              {formatInrFromPaise(unitPricePaise)}
              {giftWrap ? (
                <span className="ml-1 text-xs font-normal text-ink-muted">
                  + wrap {formatInrFromPaise(GIFT_WRAP_PAISE * (qtyNum ?? 1))}
                </span>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            disabled={maxStock < 1 || qtyInvalid || uploadBusy}
            onClick={() => tryAddToCart({ openDrawer: false })}
            className="shrink-0 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-accent-light disabled:opacity-50"
          >
            Add to cart
          </button>
          <button
            type="button"
            disabled={maxStock < 1 || qtyInvalid || uploadBusy}
            onClick={() => tryAddToCart({ openDrawer: false, buyNow: true })}
            className="shrink-0 rounded-full border-2 border-accent bg-white px-4 py-3 text-sm font-semibold text-accent disabled:opacity-50"
          >
            Buy now
          </button>
        </div>
      </div>
    </>
  );
}
