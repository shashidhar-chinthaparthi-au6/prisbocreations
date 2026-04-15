"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { formatInrFromPaise } from "@/lib/format";
import type { ProductSuggestion } from "@/lib/product-suggestion";

type Props = {
  id: string;
  name?: string;
  placeholder?: string;
  defaultValue?: string;
  /** Header: rounded-full compact; page: full-width field */
  variant?: "header" | "page";
  className?: string;
};

const MIN_CHARS = 1;
const DEBOUNCE_MS = 180;

export function SearchSuggestInput({
  id,
  name = "q",
  placeholder = "Search…",
  defaultValue = "",
  variant = "header",
  className = "",
}: Props) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState(defaultValue);
  const [items, setItems] = useState<ProductSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  const [panelBox, setPanelBox] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    setQ(defaultValue);
    setItems([]);
    setOpen(false);
    setHighlight(-1);
    setPanelBox(null);
  }, [defaultValue]);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < MIN_CHARS) {
      setItems([]);
      setOpen(false);
      setHighlight(-1);
      return;
    }

    const ac = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/v1/products/suggest?q=${encodeURIComponent(trimmed)}`,
          { signal: ac.signal },
        );
        const json = (await res.json()) as { ok?: boolean; data?: ProductSuggestion[] };
        if (!json.ok || !Array.isArray(json.data)) {
          setItems([]);
          return;
        }
        setItems(json.data);
        setOpen(true);
        setHighlight(-1);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setItems([]);
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [q]);

  const updatePanelPosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPanelBox({
      top: r.bottom + 4,
      left: r.left,
      width: r.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open || items.length === 0) {
      setPanelBox(null);
      return;
    }
    updatePanelPosition();
    const el = inputRef.current;
    const ro = el ? new ResizeObserver(() => updatePanelPosition()) : null;
    if (el && ro) ro.observe(el);
    const onScrollOrResize = () => updatePanelPosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, items.length, updatePanelPosition]);

  useEffect(() => {
    function onDocPointerDown(e: MouseEvent) {
      const t = e.target as Node;
      if (containerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
      setHighlight(-1);
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, []);

  const inputClass =
    variant === "header"
      ? "min-h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3.5 py-2 text-[0.9375rem] text-slate-900 shadow-[inset_0_1px_1px_rgba(15,23,42,0.04)] placeholder:text-slate-500 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/25 sm:min-h-12 sm:px-4 sm:text-base md:min-h-[3rem]"
      : "min-h-12 w-full rounded-xl border border-sand-deep px-4 py-3 text-base text-ink shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

  function goProduct(slug: string) {
    setOpen(false);
    router.push(`/product/${slug}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? items.length - 1 : h - 1));
    } else if (e.key === "Enter" && highlight >= 0 && items[highlight]) {
      e.preventDefault();
      goProduct(items[highlight].slug);
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlight(-1);
    }
  }

  const showPanel = open && items.length > 0 && panelBox !== null;
  const listClassName =
    "max-h-[min(20rem,70vh)] overflow-auto rounded-xl border border-sand-deep bg-white py-1 text-sm shadow-lg";

  const listBody = (
    <>
      {items.map((item, i) => (
        <li key={item.slug} role="presentation">
          <Link
            href={`/product/${item.slug}`}
            role="option"
            aria-selected={i === highlight}
            className={`flex items-center gap-3 px-3 py-2.5 hover:bg-sand/50 ${
              i === highlight ? "bg-sand/50" : ""
            }`}
            onMouseEnter={() => setHighlight(i)}
            onClick={() => setOpen(false)}
          >
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-sand-deep">
              {item.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary CDN URLs
                <img
                  src={item.thumb}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{item.name}</p>
              <p className="truncate text-xs text-ink-muted">
                {item.hasPackOptions ? (
                  <>
                    From {formatInrFromPaise(item.displayPricePaise)} · {item.sku}
                  </>
                ) : (
                  <>
                    {formatInrFromPaise(item.displayPricePaise)} · {item.sku}
                  </>
                )}
              </p>
            </div>
          </Link>
        </li>
      ))}
      <li role="presentation" className="border-t border-sand-deep">
        <Link
          href={`/search?q=${encodeURIComponent(q.trim())}`}
          className="block px-3 py-2.5 text-center text-xs font-medium text-accent hover:bg-sand/40"
          onClick={() => setOpen(false)}
        >
          See all results for &ldquo;{q.trim()}&rdquo;
        </Link>
      </li>
    </>
  );

  return (
    <div ref={containerRef} className={`relative min-w-0 ${className}`}>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder={placeholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => {
          if (items.length > 0) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className={inputClass}
      />
      {showPanel && typeof document !== "undefined"
        ? createPortal(
            <ul
              ref={panelRef}
              id={listId}
              role="listbox"
              className={listClassName}
              style={{
                position: "fixed",
                top: panelBox.top,
                left: panelBox.left,
                width: panelBox.width,
                zIndex: 300,
              }}
            >
              {listBody}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
