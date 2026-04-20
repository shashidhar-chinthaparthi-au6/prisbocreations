"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { adminFetchJson, AdminApiError } from "@/lib/admin/admin-fetch";
import { useAdminToast } from "@/components/admin/layout/AdminShell";
import { AdminBreadcrumb } from "@/components/admin/layout/AdminBreadcrumb";
import { resolveTemplate, formatInr } from "@/lib/admin/template-resolve";
import { useProductWizard, type SchemaFieldLite } from "./useProductWizard";

const STEPS = [
  "Category",
  "Basics",
  "Colours",
  "Images",
  "Sizes",
  "Description",
  "Specs",
  "Manufacturer",
  "Review",
];

type CatTree = {
  _id: string;
  name: string;
  subcategories: { _id: string; name: string; schemaFieldCount?: number }[];
};

function isOid(s: string): boolean {
  return /^[a-f\d]{24}$/i.test(s);
}

function buildPatch(state: ReturnType<typeof useProductWizard.getState>) {
  const colourVariants = state.variants.map((v) => {
    const imgs = state.variantImages[v.tempId] ?? [];
    const sortedImgs = [...imgs].sort((a, b) => a.displayOrder - b.displayOrder);
    const sizeStocks: { size: string; stock: number; priceOverride: number | null; isActive: boolean }[] =
      [];
    if (state.sizesNotApplicable) {
      const cell = state.stockMatrix[v.tempId]?.["OS"] ?? { stock: 0, priceOverride: null };
      sizeStocks.push({
        size: "OS",
        stock: cell.stock,
        priceOverride: cell.priceOverride,
        isActive: true,
      });
    } else {
      for (const sz of state.selectedSizes) {
        const cell = state.stockMatrix[v.tempId]?.[sz] ?? { stock: 0, priceOverride: null };
        sizeStocks.push({
          size: sz,
          stock: cell.stock,
          priceOverride: cell.priceOverride,
          isActive: true,
        });
      }
    }
    return {
      ...(isOid(v.tempId) ? { _id: v.tempId } : {}),
      displayName: v.displayName,
      hexCode: v.hexCode,
      skuSuffix: v.skuSuffix.slice(0, 12).toUpperCase(),
      basePrice: v.basePrice,
      mrp: v.mrp,
      isActive: v.isActive,
      images: sortedImgs.map((im, idx) => ({
        ...(im.serverImageId && isOid(im.serverImageId) ? { _id: im.serverImageId } : {}),
        url: im.url,
        isPrimary: im.isPrimary,
        displayOrder: idx,
      })),
      sizeStocks,
    };
  });

  return {
    categoryId: state.categoryId,
    subcategoryId: state.subcategoryId,
    name: state.name,
    brand: state.brand,
    skuBase: state.skuBase.trim().toUpperCase(),
    packOf: state.packOf,
    hasColourVariants: state.hasColourVariants,
    hasSizePricing: state.hasSizePricing,
    sizesNotApplicable: state.sizesNotApplicable,
    descriptionTemplate: state.descriptionTemplate,
    specValues: state.specValues,
    genericName: state.genericName || undefined,
    countryOfOrigin: state.countryOfOrigin,
    manufacturerName: state.manufacturerName || undefined,
    manufacturerAddress: state.manufacturerAddress || undefined,
    packerSameAsMfr: state.packerSameAsMfr,
    packerAddress: state.packerSameAsMfr ? undefined : state.packerAddress || undefined,
    colourVariants,
  };
}

export function ProductWizardClient({ editProductId }: { editProductId?: string }) {
  const router = useRouter();
  const toast = useAdminToast();
  const w = useProductWizard();
  const [hydrated, setHydrated] = useState(false);
  const [skuOk, setSkuOk] = useState<boolean | null>(null);
  const [activeVariantTab, setActiveVariantTab] = useState(0);
  const [previewVariantIdx, setPreviewVariantIdx] = useState(0);

  useEffect(() => {
    void Promise.resolve(useProductWizard.persist.rehydrate()).finally(() => setHydrated(true));
  }, []);

  const { data: tree } = useSWR<CatTree[]>(
    "/api/admin/categories",
    (u) => adminFetchJson<CatTree[]>(u),
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    if (!editProductId || !hydrated) return;
    (async () => {
      try {
        const bundle = await adminFetchJson<{
          product: Record<string, unknown>;
          schemaFields: SchemaFieldLite[];
        }>(`/api/admin/products/${editProductId}`);
        const { hydrateFromProduct, setField } = useProductWizard.getState();
        hydrateFromProduct({
          product: bundle.product,
          schemaFields: (bundle.schemaFields ?? []).map((f) => ({
            key: f.key,
            label: f.label,
            fieldType: f.fieldType,
            options: f.options ?? [],
            isHighlight: f.isHighlight,
            isRequired: f.isRequired,
          })),
        });
        const cvs = (bundle.product.colourVariants ?? []) as { _id?: string }[];
        if (cvs[0]?._id) {
          const m: Record<string, Record<string, { stock: number; priceOverride: number | null }>> = {};
          for (const cv of cvs) {
            const tid = String(cv._id);
            m[tid] = {};
            const sts = (cv as { sizeStocks?: { size?: string; stock?: number; priceOverride?: number | null }[] })
              .sizeStocks ?? [];
            for (const ss of sts) {
              const sz = String(ss.size ?? "");
              m[tid][sz] = {
                stock: Number(ss.stock ?? 0),
                priceOverride:
                  ss.priceOverride != null && Number.isFinite(ss.priceOverride) ?
                    Number(ss.priceOverride)
                  : null,
              };
            }
          }
          setField("stockMatrix", m);
        }
      } catch (e) {
        toast({ type: "error", message: e instanceof AdminApiError ? e.message : "Load failed" });
      }
    })();
  }, [editProductId, hydrated, toast]);

  const selectedCat = useMemo(
    () => tree?.find((c) => String(c._id) === w.categoryId),
    [tree, w.categoryId],
  );

  async function ensureProductId(): Promise<string | null> {
    if (w.productId) return w.productId;
    if (!w.subcategoryId || !w.name.trim() || !w.brand.trim() || !w.skuBase.trim()) {
      toast({ type: "warning", message: "Fill name, brand, and SKU before saving." });
      return null;
    }
    try {
      const created = await adminFetchJson<Record<string, unknown>>("/api/admin/products", {
        method: "POST",
        body: JSON.stringify({
          subcategoryId: w.subcategoryId,
          name: w.name.trim(),
          brand: w.brand.trim(),
          skuBase: w.skuBase.trim(),
        }),
      });
      const id = String(created._id ?? "");
      const st = useProductWizard.getState();
      st.hydrateFromProduct({
        product: created,
        schemaFields: st.schema,
      });
      return id;
    } catch (e) {
      toast({ type: "error", message: e instanceof AdminApiError ? e.message : "Create failed" });
      return null;
    }
  }

  async function saveDraft() {
    const id = await ensureProductId();
    if (!id) return;
    try {
      await adminFetchJson(`/api/admin/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...buildPatch(w), status: "DRAFT" }),
      });
      toast({ type: "success", message: "Draft saved" });
    } catch (e) {
      toast({ type: "error", message: e instanceof AdminApiError ? e.message : "Save failed" });
    }
  }

  function adjustStep(delta: number) {
    let s = w.currentStep + delta;
    if (delta > 0) {
      if (s === 2 && !w.hasColourVariants) s = 3;
      if (s === 4 && w.sizesNotApplicable) s = 5;
    } else {
      if (s === 3 && !w.hasColourVariants) s = 1;
      if (s === 4 && w.sizesNotApplicable) s = 3;
    }
    w.setStep(Math.max(0, Math.min(STEPS.length - 1, s)));
  }

  async function onNext() {
    if (w.currentStep === 1) {
      if (!w.name.trim() || !w.brand.trim() || !w.skuBase.trim()) {
        toast({ type: "warning", message: "Name, brand, and SKU are required." });
        return;
      }
      const id = await ensureProductId();
      if (!id) return;
      try {
        await adminFetchJson(`/api/admin/products/${id}`, {
          method: "PATCH",
          body: JSON.stringify(buildPatch(w)),
        });
      } catch (e) {
        toast({ type: "error", message: e instanceof AdminApiError ? e.message : "Save failed" });
        return;
      }
    }
    if (w.currentStep >= 2 && w.productId) {
      try {
        await adminFetchJson(`/api/admin/products/${w.productId}`, {
          method: "PATCH",
          body: JSON.stringify(buildPatch(w)),
        });
      } catch (e) {
        toast({ type: "error", message: e instanceof AdminApiError ? e.message : "Save failed" });
        return;
      }
    }
    adjustStep(1);
  }

  const requiredSpecsOk = useMemo(() => {
    for (const f of w.schema) {
      if (!f.isRequired) continue;
      const v = w.specValues[f.key];
      if (v === null || v === undefined || v === "") return false;
    }
    return true;
  }, [w.schema, w.specValues]);

  async function publish() {
    if (!requiredSpecsOk) {
      toast({ type: "error", message: "Fill all required specification fields." });
      return;
    }
    const id = w.productId ?? (await ensureProductId());
    if (!id) return;
    try {
      await adminFetchJson(`/api/admin/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...buildPatch(w),
          status: "PUBLISHED",
          publishedAt: new Date().toISOString(),
        }),
      });
      toast({ type: "success", message: "Published" });
      w.reset();
      router.push("/admin/products");
    } catch (e) {
      toast({ type: "error", message: e instanceof AdminApiError ? e.message : "Publish failed" });
    }
  }

  const variants = w.hasColourVariants ? w.variants : w.variants.slice(0, 1);
  const vIdx = Math.min(activeVariantTab, Math.max(0, variants.length - 1));
  const vCur = variants[vIdx];

  async function uploadFile(file: File) {
    if (!vCur || !w.productId) return;
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/admin/uploads", { method: "POST", body: fd, credentials: "include" });
    const j = (await res.json()) as { ok?: boolean; data?: { url: string }; error?: string };
    if (!res.ok || !j.ok || !j.data?.url) {
      toast({ type: "error", message: j.error ?? "Upload failed" });
      return;
    }
    const url = j.data.url;
    const list = [...(w.variantImages[vCur.tempId] ?? [])];
    list.push({
      url,
      isPrimary: list.length === 0,
      displayOrder: list.length,
    });
    w.setField("variantImages", { ...w.variantImages, [vCur.tempId]: list });
  }

  if (!hydrated) {
    return <div className="text-zinc-500">Loading wizard…</div>;
  }

  return (
    <div>
      <AdminBreadcrumb
        items={[
          { label: "Admin", href: "/admin/products" },
          { label: "Products", href: "/admin/products" },
          { label: editProductId ? "Edit" : "New" },
        ]}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{editProductId ? "Edit product" : "New product"}</h1>
        <button
          type="button"
          className="h-9 rounded-lg border border-zinc-300 px-4 text-sm hover:bg-zinc-50"
          onClick={() => saveDraft()}
        >
          Save draft
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-1">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              i === w.currentStep ? "bg-zinc-900 text-white"
              : i < w.currentStep ? "bg-zinc-200 text-zinc-800"
              : "bg-zinc-100 text-zinc-400"
            }`}
            disabled={i > w.currentStep}
            onClick={() => i <= w.currentStep && w.setStep(i)}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        {w.currentStep === 0 ?
          <div className="space-y-4">
            <label className="block text-sm">
              Category
              <select
                className="mt-1 h-9 w-full max-w-md rounded-lg border border-zinc-200 px-3"
                value={w.categoryId}
                onChange={(e) => {
                  w.setField("categoryId", e.target.value);
                  w.setField("subcategoryId", "");
                  w.setField("schema", []);
                }}
              >
                <option value="">Select…</option>
                {tree?.map((c) => (
                  <option key={c._id} value={String(c._id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Subcategory
              <select
                className="mt-1 h-9 w-full max-w-md rounded-lg border border-zinc-200 px-3"
                value={w.subcategoryId}
                onChange={async (e) => {
                  const sid = e.target.value;
                  w.setField("subcategoryId", sid);
                  if (!sid) {
                    w.setField("schema", []);
                    return;
                  }
                  try {
                    const rows = await adminFetchJson<SchemaFieldLite[]>(
                      `/api/admin/subcategories/${sid}/schema`,
                    );
                    w.setField(
                      "schema",
                      rows.map((r) => ({
                        key: r.key,
                        label: r.label,
                        fieldType: r.fieldType,
                        options: r.options ?? [],
                        isHighlight: r.isHighlight,
                        isRequired: r.isRequired,
                      })),
                    );
                  } catch {
                    w.setField("schema", []);
                  }
                }}
              >
                <option value="">Select…</option>
                {selectedCat?.subcategories.map((s) => (
                  <option key={s._id} value={String(s._id)}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            {w.schema.length > 0 ?
              <p className="text-sm text-zinc-600">
                Schema loaded — {w.schema.filter((x) => x.isHighlight).length} highlight fields,{" "}
                {w.schema.filter((x) => !x.isHighlight).length} spec fields, {w.schema.length}{" "}
                variables.
                <Link
                  href={`/admin/setup/schema/${w.subcategoryId}`}
                  target="_blank"
                  className="ml-2 text-accent hover:underline"
                >
                  Edit schema ↗
                </Link>
              </p>
            : null}
          </div>
        : null}

        {w.currentStep === 1 ?
          <div className="space-y-4">
            <label className="block text-sm">
              Product name
              <input
                className="mt-1 h-9 w-full max-w-md rounded-lg border border-zinc-200 px-3"
                value={w.name}
                onChange={(e) => w.setField("name", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Brand
              <input
                className="mt-1 h-9 w-full max-w-md rounded-lg border border-zinc-200 px-3"
                value={w.brand}
                onChange={(e) => w.setField("brand", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              SKU base
              <input
                className="mt-1 h-9 w-full max-w-md rounded-lg border border-zinc-200 px-3 font-mono uppercase"
                value={w.skuBase}
                onChange={(e) => w.setField("skuBase", e.target.value.toUpperCase())}
                onBlur={async () => {
                  if (!w.skuBase.trim()) return;
                  try {
                    const q = new URLSearchParams({ skuBase: w.skuBase.trim() });
                    if (w.productId) q.set("excludeProductId", w.productId);
                    const r = await adminFetchJson<{ available: boolean }>(
                      `/api/admin/products/check-sku?${q}`,
                    );
                    setSkuOk(r.available);
                  } catch {
                    setSkuOk(null);
                  }
                }}
              />
              {skuOk === false ?
                <span className="mt-1 block text-xs text-rose-600">SKU already in use</span>
              : null}
              {skuOk === true ?
                <span className="mt-1 block text-xs text-emerald-600">Available</span>
              : null}
            </label>
            <label className="block text-sm">
              Pack of
              <input
                type="number"
                min={1}
                className="mt-1 h-9 w-full max-w-md rounded-lg border border-zinc-200 px-3"
                value={w.packOf}
                onChange={(e) => w.setField("packOf", Math.max(1, Number(e.target.value) || 1))}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={w.hasColourVariants}
                onChange={(e) => {
                  w.setField("hasColourVariants", e.target.checked);
                  if (!e.target.checked) {
                    w.setField("variants", [
                      {
                        tempId: crypto.randomUUID(),
                        displayName: "Default",
                        hexCode: "#111111",
                        skuSuffix: "DEF",
                        basePrice: 0,
                        mrp: 0,
                        isActive: true,
                      },
                    ]);
                  }
                }}
              />
              Has multiple colour variants
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={w.hasSizePricing}
                onChange={(e) => w.setField("hasSizePricing", e.target.checked)}
              />
              Different price per size
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={w.sizesNotApplicable}
                onChange={(e) => w.setField("sizesNotApplicable", e.target.checked)}
              />
              Sizes not applicable (one size)
            </label>
          </div>
        : null}

        {w.currentStep === 2 && w.hasColourVariants ?
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {w.variants.map((v, i) => (
                <button
                  key={v.tempId}
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs ${
                    i === vIdx ? "bg-zinc-900 text-white" : "bg-zinc-100"
                  }`}
                  onClick={() => setActiveVariantTab(i)}
                >
                  {v.displayName || `Variant ${i + 1}`}
                </button>
              ))}
              <button
                type="button"
                className="rounded-full border border-dashed border-zinc-300 px-3 py-1 text-xs"
                onClick={() => {
                  w.setField("variants", [
                    ...w.variants,
                    {
                      tempId: crypto.randomUUID(),
                      displayName: "",
                      hexCode: "#000000",
                      skuSuffix: "",
                      basePrice: 0,
                      mrp: 0,
                      isActive: true,
                    },
                  ]);
                }}
              >
                + Add colour
              </button>
            </div>
            {vCur ?
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  Display name
                  <input
                    className="mt-1 h-9 w-full rounded-lg border border-zinc-200 px-3"
                    value={vCur.displayName}
                    onChange={(e) => {
                      const next = [...w.variants];
                      next[vIdx] = { ...vCur, displayName: e.target.value };
                      w.setField("variants", next);
                    }}
                  />
                </label>
                <label className="text-sm">
                  Hex
                  <input
                    type="color"
                    className="mt-1 h-9 w-full max-w-[120px]"
                    value={vCur.hexCode}
                    onChange={(e) => {
                      const next = [...w.variants];
                      next[vIdx] = { ...vCur, hexCode: e.target.value };
                      w.setField("variants", next);
                    }}
                  />
                </label>
                <label className="text-sm">
                  SKU suffix (max 6)
                  <input
                    className="mt-1 h-9 w-full rounded-lg border border-zinc-200 px-3 font-mono uppercase"
                    maxLength={6}
                    value={vCur.skuSuffix}
                    onChange={(e) => {
                      const next = [...w.variants];
                      next[vIdx] = { ...vCur, skuSuffix: e.target.value.toUpperCase() };
                      w.setField("variants", next);
                    }}
                  />
                </label>
                <label className="text-sm">
                  Base ₹
                  <input
                    type="number"
                    className="mt-1 h-9 w-full rounded-lg border border-zinc-200 px-3"
                    value={vCur.basePrice}
                    onChange={(e) => {
                      const next = [...w.variants];
                      next[vIdx] = { ...vCur, basePrice: Number(e.target.value) };
                      w.setField("variants", next);
                    }}
                  />
                </label>
                <label className="text-sm">
                  MRP ₹
                  <input
                    type="number"
                    className="mt-1 h-9 w-full rounded-lg border border-zinc-200 px-3"
                    value={vCur.mrp}
                    onChange={(e) => {
                      const next = [...w.variants];
                      next[vIdx] = { ...vCur, mrp: Number(e.target.value) };
                      w.setField("variants", next);
                    }}
                  />
                </label>
              </div>
            : null}
          </div>
        : null}

        {w.currentStep === 3 ?
          <div className="space-y-4">
            {w.hasColourVariants ?
              <div className="flex flex-wrap gap-2">
                {variants.map((v, i) => (
                  <button
                    key={v.tempId}
                    type="button"
                    className={`rounded-full px-3 py-1 text-xs ${
                      i === vIdx ? "bg-zinc-900 text-white" : "bg-zinc-100"
                    }`}
                    onClick={() => setActiveVariantTab(i)}
                  >
                    {v.displayName} ({(w.variantImages[v.tempId] ?? []).length})
                  </button>
                ))}
              </div>
            : null}
            <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 text-sm text-zinc-500">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadFile(f);
                }}
              />
              Drop or click to upload (JPG/PNG/WebP, max 5MB)
            </label>
            <div className="flex flex-wrap gap-2">
              {(vCur ? w.variantImages[vCur.tempId] ?? [] : []).map((im, idx) => (
                <div key={`${im.url}-${idx}`} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.url} alt="" className="h-full w-full object-cover" />
                  {im.isPrimary ?
                    <span className="absolute left-1 top-1 rounded bg-black/70 px-1 text-[10px] text-white">
                      Primary
                    </span>
                  : null}
                </div>
              ))}
            </div>
          </div>
        : null}

        {w.currentStep === 4 && !w.sizesNotApplicable ?
          <div className="space-y-4">
            <p className="text-sm font-medium">Sizes</p>
            <div className="flex flex-wrap gap-2">
              {["XS", "S", "M", "L", "XL", "XXL", "3XL"].map((sz) => (
                <label key={sz} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={w.selectedSizes.includes(sz)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        w.setField("selectedSizes", [...w.selectedSizes, sz]);
                      } else {
                        w.setField(
                          "selectedSizes",
                          w.selectedSizes.filter((x) => x !== sz),
                        );
                      }
                    }}
                  />
                  {sz}
                </label>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left">Colour</th>
                    {w.selectedSizes.map((sz) => (
                      <th key={sz} className="px-2 py-1">
                        {sz} stock
                      </th>
                    ))}
                    {w.hasSizePricing ?
                      w.selectedSizes.map((sz) => (
                        <th key={`${sz}-p`} className="px-2 py-1">
                          {sz} ₹
                        </th>
                      ))
                    : null}
                  </tr>
                </thead>
                <tbody>
                  {variants
                    .filter((x) => x.isActive)
                    .map((v) => (
                      <tr key={v.tempId}>
                        <td className="px-2 py-1">{v.displayName}</td>
                        {w.selectedSizes.map((sz) => (
                          <td key={sz} className="px-2 py-1">
                            <input
                              type="number"
                              min={0}
                              className="h-8 w-20 rounded border px-1"
                              value={w.stockMatrix[v.tempId]?.[sz]?.stock ?? 0}
                              onChange={(e) => {
                                const n = Math.max(0, Number(e.target.value) || 0);
                                const m = { ...w.stockMatrix };
                                m[v.tempId] = {
                                  ...m[v.tempId],
                                  [sz]: {
                                    ...(m[v.tempId]?.[sz] ?? { stock: 0, priceOverride: null }),
                                    stock: n,
                                  },
                                };
                                w.setField("stockMatrix", m);
                              }}
                            />
                          </td>
                        ))}
                        {w.hasSizePricing ?
                          w.selectedSizes.map((sz) => (
                            <td key={`${sz}-p`} className="px-2 py-1">
                              <input
                                type="number"
                                className="h-8 w-20 rounded border px-1"
                                placeholder="override"
                                value={w.stockMatrix[v.tempId]?.[sz]?.priceOverride ?? ""}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const po = raw === "" ? null : Number(raw);
                                  const m = { ...w.stockMatrix };
                                  m[v.tempId] = {
                                    ...m[v.tempId],
                                    [sz]: {
                                      ...(m[v.tempId]?.[sz] ?? { stock: 0, priceOverride: null }),
                                      priceOverride: po,
                                    },
                                  };
                                  w.setField("stockMatrix", m);
                                }}
                              />
                            </td>
                          ))
                        : null}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        : null}

        {w.currentStep === 5 ?
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {w.schema.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-xs"
                  onClick={() => {
                    const ta = document.getElementById("tpl") as HTMLTextAreaElement | null;
                    if (!ta) return;
                    const ins = `{{${f.key}}}`;
                    const start = ta.selectionStart ?? ta.value.length;
                    const next = ta.value.slice(0, start) + ins + ta.value.slice(start);
                    w.setField("descriptionTemplate", next);
                  }}
                >
                  {`{{${f.key}}}`}
                </button>
              ))}
              {(["color", "price", "mrp", "brand", "sku"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  className="rounded-full bg-zinc-900 px-2 py-0.5 font-mono text-xs text-white"
                  onClick={() => {
                    const ta = document.getElementById("tpl") as HTMLTextAreaElement | null;
                    if (!ta) return;
                    const ins = `{{${k}}}`;
                    const start = ta.selectionStart ?? ta.value.length;
                    w.setField(
                      "descriptionTemplate",
                      ta.value.slice(0, start) + ins + ta.value.slice(start),
                    );
                  }}
                >
                  {`{{${k}}}`}
                </button>
              ))}
            </div>
            <textarea
              id="tpl"
              className="min-h-[120px] w-full rounded-lg border border-zinc-200 p-3 font-mono text-sm"
              value={w.descriptionTemplate}
              onChange={(e) => w.setField("descriptionTemplate", e.target.value)}
            />
            <p className="text-xs text-zinc-500">
              Shared across variants. Use built-ins{" "}
              <code className="rounded bg-zinc-100 px-1">{`{{color}} {{price}}`}</code> etc.
            </p>
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-sm">
              <label className="mb-2 block text-xs text-zinc-500">
                Preview variant
                <select
                  className="ml-2 rounded border px-2 py-1"
                  value={previewVariantIdx}
                  onChange={(e) => setPreviewVariantIdx(Number(e.target.value))}
                >
                  {variants.map((vv, i) => (
                    <option key={vv.tempId} value={i}>
                      {vv.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <p className="whitespace-pre-wrap text-zinc-800">
                {resolveTemplate(
                  w.descriptionTemplate,
                  w.specValues,
                  {
                    displayName: variants[previewVariantIdx]?.displayName ?? "",
                    basePrice: variants[previewVariantIdx]?.basePrice ?? 0,
                    mrp: variants[previewVariantIdx]?.mrp ?? 0,
                    skuSuffix: variants[previewVariantIdx]?.skuSuffix ?? "",
                  },
                  w.brand,
                  w.skuBase,
                  w.schema.map((s) => ({ key: s.key, label: s.label })),
                )}
              </p>
            </div>
          </div>
        : null}

        {w.currentStep === 6 ?
          <div className="space-y-6">
            <div className="flex justify-end">
              <Link
                href={`/admin/setup/schema/${w.subcategoryId}`}
                target="_blank"
                className="text-xs text-accent hover:underline"
              >
                Edit schema fields ↗
              </Link>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-700">Highlights</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {w.schema
                  .filter((f) => f.isHighlight)
                  .map((f) => (
                    <label key={f.key} className="text-sm">
                      {f.label}
                      <span className="ml-1 font-mono text-[10px] text-zinc-400">{f.key}</span>
                      <FieldInput f={f} />
                    </label>
                  ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-700">Specifications</h3>
              <div className="grid gap-3 md:grid-cols-3">
                {w.schema
                  .filter((f) => !f.isHighlight)
                  .map((f) => (
                    <label key={f.key} className="text-sm">
                      {f.label}
                      <span className="ml-1 font-mono text-[10px] text-zinc-400">{f.key}</span>
                      <FieldInput f={f} />
                    </label>
                  ))}
              </div>
            </div>
          </div>
        : null}

        {w.currentStep === 7 ?
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm md:col-span-2">
              Generic name
              <input
                className="mt-1 h-9 w-full rounded-lg border px-3"
                value={w.genericName}
                onChange={(e) => w.setField("genericName", e.target.value)}
              />
            </label>
            <label className="text-sm md:col-span-2">
              Country of origin
              <input
                className="mt-1 h-9 w-full rounded-lg border px-3"
                value={w.countryOfOrigin}
                onChange={(e) => w.setField("countryOfOrigin", e.target.value)}
              />
            </label>
            <label className="text-sm md:col-span-2">
              Manufacturer name
              <input
                className="mt-1 h-9 w-full rounded-lg border px-3"
                value={w.manufacturerName}
                onChange={(e) => w.setField("manufacturerName", e.target.value)}
              />
            </label>
            <label className="text-sm md:col-span-2">
              Manufacturer address
              <textarea
                className="mt-1 w-full rounded-lg border px-3 py-2"
                rows={3}
                value={w.manufacturerAddress}
                onChange={(e) => w.setField("manufacturerAddress", e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={w.packerSameAsMfr}
                onChange={(e) => w.setField("packerSameAsMfr", e.target.checked)}
              />
              Packer same as manufacturer
            </label>
            {!w.packerSameAsMfr ?
              <label className="text-sm md:col-span-2">
                Packer address
                <textarea
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  rows={2}
                  value={w.packerAddress}
                  onChange={(e) => w.setField("packerAddress", e.target.value)}
                />
              </label>
            : null}
          </div>
        : null}

        {w.currentStep === 8 ?
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3 text-sm">
              <p>
                <strong>{w.name}</strong> · {w.brand} · {w.skuBase}
              </p>
              <p className="text-zinc-600">
                {selectedCat?.name} →{" "}
                {selectedCat?.subcategories.find((s) => String(s._id) === w.subcategoryId)?.name}
              </p>
              <p>
                Prices:{" "}
                {formatInr(Math.min(...variants.map((v) => v.basePrice || 0)))} –{" "}
                {formatInr(Math.max(...variants.map((v) => v.basePrice || 0)))}
              </p>
              <ul className="list-inside list-disc text-zinc-600">
                <li className={variants.every((v) => (w.variantImages[v.tempId] ?? []).length > 0) ? "text-emerald-700" : "text-amber-700"}>
                  Images
                </li>
                <li className={requiredSpecsOk ? "text-emerald-700" : "text-rose-700"}>
                  Required specs
                </li>
                <li className={w.descriptionTemplate.trim() ? "text-emerald-700" : "text-amber-700"}>
                  Description template
                </li>
                <li
                  className={
                    w.manufacturerName.trim() && w.manufacturerAddress.trim() ?
                      "text-emerald-700"
                    : "text-amber-700"
                  }
                >
                  Manufacturer
                </li>
              </ul>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={w.publishNow}
                  onChange={(e) => w.setField("publishNow", e.target.checked)}
                />
                Publish immediately on save
              </label>
            </div>
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
              <h3 className="mb-2 text-sm font-medium">Highlights preview</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {w.schema
                  .filter((f) => f.isHighlight)
                  .map((f) => (
                    <div key={f.key}>
                      <span className="text-zinc-500">{f.label}</span>
                      <p className="font-medium">{String(w.specValues[f.key] ?? "—")}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        : null}

        <div className="mt-8 flex justify-between border-t border-zinc-100 pt-4">
          <button
            type="button"
            className="h-9 rounded-lg border border-zinc-300 px-4 text-sm"
            disabled={w.currentStep === 0}
            onClick={() => adjustStep(-1)}
          >
            ← Back
          </button>
          <div className="flex gap-2">
            {w.currentStep < STEPS.length - 1 ?
              <button
                type="button"
                className="h-9 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white"
                onClick={() => onNext()}
              >
                Next →
              </button>
            : (
              <>
                <button
                  type="button"
                  className="h-9 rounded-lg border border-zinc-300 px-4 text-sm"
                  onClick={() => saveDraft()}
                >
                  Save as draft
                </button>
                <button
                  type="button"
                  disabled={!requiredSpecsOk}
                  className="h-9 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-40"
                  onClick={() => publish()}
                >
                  Publish
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldInput({ f }: { f: SchemaFieldLite }) {
  const w = useProductWizard();
  const val = w.specValues[f.key];
  if (f.fieldType === "boolean") {
    return (
      <select
        className="mt-1 h-9 w-full rounded-lg border px-2"
        value={val === true ? "yes" : val === false ? "no" : ""}
        onChange={(e) => {
          const v = e.target.value === "yes" ? true : e.target.value === "no" ? false : null;
          w.setField("specValues", { ...w.specValues, [f.key]: v as boolean });
        }}
      >
        <option value="">—</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    );
  }
  if (f.fieldType === "number") {
    return (
      <input
        type="number"
        className="mt-1 h-9 w-full rounded-lg border px-2"
        value={typeof val === "number" ? val : ""}
        onChange={(e) =>
          w.setField("specValues", {
            ...w.specValues,
            [f.key]: e.target.value === "" ? null : Number(e.target.value),
          })
        }
      />
    );
  }
  if (f.fieldType === "select") {
    return (
      <select
        className="mt-1 h-9 w-full rounded-lg border px-2"
        value={typeof val === "string" ? val : ""}
        onChange={(e) =>
          w.setField("specValues", { ...w.specValues, [f.key]: e.target.value })
        }
      >
        <option value="">—</option>
        {f.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      className="mt-1 h-9 w-full rounded-lg border px-2"
      value={typeof val === "string" ? val : val != null ? String(val) : ""}
      onChange={(e) =>
        w.setField("specValues", { ...w.specValues, [f.key]: e.target.value })
      }
    />
  );
}
