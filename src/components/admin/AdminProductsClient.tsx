"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/fetch-client";
import { AdminMultiImageField } from "@/components/admin/AdminMultiImageField";
import { AdminRichTextEditor } from "@/components/admin/AdminRichTextEditor";
import { isHtmlContentEmpty } from "@/lib/sanitize-html";
import { formatInrFromPaise } from "@/lib/format";
import { slugify } from "@/lib/slugify";
import type { ProductOption } from "@/lib/product-options";
import {
  minOptionPricePaise,
  productHasOptions,
  productOptionsFromDoc,
} from "@/lib/product-options";

type OptionRowForm = {
  key: string;
  label: string;
  priceRupees: string;
  stock: string;
  sku: string;
};

function emptyOptionRow(): OptionRowForm {
  return { key: "", label: "", priceRupees: "", stock: "0", sku: "" };
}

const OPTION_KEY_RX = /^[a-z0-9-]+$/;

function buildOptionsPayload(
  rows: OptionRowForm[],
):
  | { ok: true; options: ProductOption[] }
  | { ok: false; error: string } {
  const active = rows.filter(
    (r) =>
      r.key.trim() ||
      r.label.trim() ||
      r.priceRupees.trim() ||
      r.sku.trim() ||
      (r.stock.trim() && r.stock !== "0"),
  );
  if (active.length === 0) return { ok: true, options: [] };
  const out: ProductOption[] = [];
  for (const r of active) {
    const key = r.key.trim();
    const label = r.label.trim();
    if (!OPTION_KEY_RX.test(key)) {
      return {
        ok: false,
        error:
          "Each pack needs a valid key: lowercase letters, numbers, and hyphens only (e.g. pack-30).",
      };
    }
    if (!label) return { ok: false, error: "Each pack needs a label (e.g. Pack of 30)." };
    const pricePaise = Math.round(Number(r.priceRupees) * 100);
    if (!Number.isFinite(pricePaise) || pricePaise <= 0) {
      return { ok: false, error: "Each pack needs a valid price in INR." };
    }
    const stock = Math.max(0, Math.floor(Number(r.stock)) || 0);
    const sku = r.sku.trim();
    out.push({ key, label, pricePaise, stock, ...(sku ? { sku } : {}) });
  }
  if (new Set(out.map((o) => o.key)).size !== out.length) {
    return { ok: false, error: "Duplicate pack keys. Use a unique key for each row." };
  }
  return { ok: true, options: out };
}

function rowsFromOptions(opts: ProductOption[] | undefined): OptionRowForm[] {
  if (!opts?.length) return [];
  return opts.map((o) => ({
    key: o.key,
    label: o.label,
    priceRupees: (o.pricePaise / 100).toFixed(2),
    stock: String(o.stock ?? 0),
    sku: o.sku?.trim() ?? "",
  }));
}

type ProductRow = {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  pricePaise: number;
  stock: number;
  isActive: boolean;
  images: string[];
  subcategoryId: string;
  description?: string;
  tags?: string[];
  options?: ProductOption[];
};

type CategoryRow = { _id: string; name: string; slug: string };
type SubRow = { _id: string; categoryId: string; name: string; slug: string };

type EditForm = {
  subcategoryId: string;
  name: string;
  description: string;
  priceRupees: string;
  stock: string;
  images: string;
  tags: string;
  isActive: boolean;
  optionRows: OptionRowForm[];
};

const emptyEdit: EditForm = {
  subcategoryId: "",
  name: "",
  description: "",
  priceRupees: "",
  stock: "0",
  images: "",
  tags: "",
  isActive: true,
  optionRows: [],
};

function PackOptionsEditor({
  rows,
  onChange,
}: {
  rows: OptionRowForm[];
  onChange: (next: OptionRowForm[]) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-sand-deep/70 bg-sand/25 p-3">
      <p className="text-xs font-medium text-ink">Packs / variants (optional)</p>
      <p className="text-xs text-ink-muted">
        Leave empty for a single price. Keys: lowercase letters, numbers, hyphens only (e.g.{" "}
        <span className="font-mono">pack-30</span>). Shoppers pick a pack on the product page; each
        row has its own price and stock.
      </p>
      {rows.length === 0 ? (
        <p className="text-xs text-ink-muted">No pack rows — base price and stock above apply.</p>
      ) : null}
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div
            key={i}
            className="grid gap-2 rounded border border-sand-deep bg-white p-2 sm:grid-cols-2 xl:grid-cols-12 xl:items-end"
          >
            <label className="xl:col-span-2 block text-xs text-ink-muted">
              Key
              <input
                className="mt-1 w-full rounded border border-sand-deep px-2 py-1.5 font-mono text-sm"
                value={r.key}
                placeholder="pack-30"
                onChange={(e) =>
                  onChange(rows.map((row, j) => (j === i ? { ...row, key: e.target.value } : row)))
                }
              />
            </label>
            <label className="xl:col-span-3 block text-xs text-ink-muted">
              Label
              <input
                className="mt-1 w-full rounded border border-sand-deep px-2 py-1.5 text-sm"
                value={r.label}
                placeholder="Pack of 30"
                onChange={(e) =>
                  onChange(rows.map((row, j) => (j === i ? { ...row, label: e.target.value } : row)))
                }
              />
            </label>
            <label className="xl:col-span-2 block text-xs text-ink-muted">
              Price (INR)
              <input
                className="mt-1 w-full rounded border border-sand-deep px-2 py-1.5 text-sm"
                value={r.priceRupees}
                placeholder="299"
                onChange={(e) =>
                  onChange(
                    rows.map((row, j) =>
                      j === i ? { ...row, priceRupees: e.target.value } : row,
                    ),
                  )
                }
              />
            </label>
            <label className="xl:col-span-2 block text-xs text-ink-muted">
              Stock
              <input
                className="mt-1 w-full rounded border border-sand-deep px-2 py-1.5 text-sm"
                value={r.stock}
                onChange={(e) =>
                  onChange(rows.map((row, j) => (j === i ? { ...row, stock: e.target.value } : row)))
                }
              />
            </label>
            <label className="xl:col-span-2 block text-xs text-ink-muted">
              SKU (optional)
              <input
                className="mt-1 w-full rounded border border-sand-deep px-2 py-1.5 font-mono text-sm"
                value={r.sku}
                onChange={(e) =>
                  onChange(rows.map((row, j) => (j === i ? { ...row, sku: e.target.value } : row)))
                }
              />
            </label>
            <div className="flex items-end xl:col-span-1">
              <button
                type="button"
                className="w-full rounded border border-sand-deep py-1.5 text-xs text-rose hover:bg-rose/5"
                onClick={() => onChange(rows.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 pt-1">
        <button
          type="button"
          className="text-xs font-medium text-accent hover:underline"
          onClick={() => onChange([...rows, emptyOptionRow()])}
        >
          + Add pack row
        </button>
        {rows.length > 0 ? (
          <button
            type="button"
            className="text-xs text-ink-muted hover:underline"
            onClick={() => onChange([])}
          >
            Clear all packs
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function AdminProductsClient() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    subcategoryId: "",
    name: "",
    description: "",
    priceRupees: "",
    stock: "50",
    images: "",
    tags: "",
    optionRows: [] as OptionRowForm[],
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyEdit);
  const [editMsg, setEditMsg] = useState<string | null>(null);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<CategoryRow[]>("/api/v1/categories"),
  });

  const { data: subcategories } = useQuery({
    queryKey: ["admin-subcategories"],
    queryFn: () => apiFetch<SubRow[]>("/api/v1/admin/subcategories"),
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => apiFetch<ProductRow[]>("/api/v1/admin/products"),
  });

  const subOptions = useMemo(() => {
    const catName = new Map<string, string>();
    categories?.forEach((c) => catName.set(c._id, c.name));
    return (subcategories ?? [])
      .map((s) => ({
        ...s,
        label: `${catName.get(s.categoryId) ?? "?"} › ${s.name}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categories, subcategories]);

  function startEdit(p: ProductRow) {
    setEditingId(p._id);
    setEditMsg(null);
    setEditForm({
      subcategoryId: p.subcategoryId,
      name: p.name,
      description: p.description ?? "",
      priceRupees: (p.pricePaise / 100).toFixed(2),
      stock: String(p.stock),
      images: p.images.join(", "),
      tags: (p.tags ?? []).join(", "),
      isActive: p.isActive,
      optionRows: rowsFromOptions(p.options),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyEdit);
    setEditMsg(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditMsg(null);
    const pricePaise = Math.round(Number(editForm.priceRupees) * 100);
    if (!editForm.subcategoryId || !pricePaise || pricePaise <= 0) {
      setEditMsg("Subcategory and a valid price are required.");
      return;
    }
    if (isHtmlContentEmpty(editForm.description)) {
      setEditMsg("Description is required.");
      return;
    }
    const images = editForm.images
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const builtOpts = buildOptionsPayload(editForm.optionRows);
    if (!builtOpts.ok) {
      setEditMsg(builtOpts.error);
      return;
    }
    try {
      await apiFetch(`/api/v1/admin/products/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          subcategoryId: editForm.subcategoryId,
          name: editForm.name,
          description: editForm.description,
          pricePaise,
          stock: Number(editForm.stock) || 0,
          images,
          tags: editForm.tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          isActive: editForm.isActive,
          options: builtOpts.options,
        }),
      });
      await qc.invalidateQueries({ queryKey: ["admin-products"] });
      cancelEdit();
    } catch (err) {
      setEditMsg(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const pricePaise = Math.round(Number(form.priceRupees) * 100);
    if (!form.subcategoryId || !pricePaise) {
      setMsg("Subcategory and price required");
      return;
    }
    if (isHtmlContentEmpty(form.description)) {
      setMsg("Description is required");
      return;
    }
    const builtOpts = buildOptionsPayload(form.optionRows);
    if (!builtOpts.ok) {
      setMsg(builtOpts.error);
      return;
    }
    try {
      await apiFetch("/api/v1/admin/products", {
        method: "POST",
        body: JSON.stringify({
          subcategoryId: form.subcategoryId,
          name: form.name,
          description: form.description,
          pricePaise,
          stock: Number(form.stock) || 0,
          images: form.images
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          tags: form.tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          isActive: true,
          ...(builtOpts.options.length ? { options: builtOpts.options } : {}),
        }),
      });
      setForm({
        subcategoryId: form.subcategoryId,
        name: "",
        description: "",
        priceRupees: "",
        stock: "50",
        images: "",
        tags: "",
        optionRows: [],
      });
      await qc.invalidateQueries({ queryKey: ["admin-products"] });
      setMsg("Product created");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    if (editingId === id) cancelEdit();
    await apiFetch(`/api/v1/admin/products/${id}`, { method: "DELETE" });
    await qc.invalidateQueries({ queryKey: ["admin-products"] });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <form
        onSubmit={createProduct}
        className="space-y-3 rounded-2xl border border-sand-deep bg-white p-6 shadow-sm"
      >
        <h3 className="font-display text-lg text-ink">New product</h3>
        {msg ? <p className="text-sm text-accent">{msg}</p> : null}
        <label className="block text-xs text-ink-muted">
          Subcategory
          <select
            required
            className="mt-1 w-full rounded border border-sand-deep px-2 py-2 text-sm text-ink"
            value={form.subcategoryId}
            onChange={(e) => setForm((f) => ({ ...f, subcategoryId: e.target.value }))}
          >
            <option value="">Select…</option>
            {subOptions.map((s) => (
              <option key={s._id} value={s._id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-ink-muted">
          Name
          <input
            required
            className="mt-1 w-full rounded border border-sand-deep px-2 py-2 text-sm"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </label>
        <p className="text-xs text-ink-muted">
          URL slug (auto):{" "}
          <span className="font-mono text-ink">/product/{slugify(form.name)}</span>
        </p>
        <p className="text-xs text-ink-muted">
          SKU is generated when you create the product (e.g. <span className="font-mono">PRB-…</span>).
        </p>
        {(
          [
            ["priceRupees", "Price (INR)"],
            ["stock", "Stock"],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="block text-xs text-ink-muted">
            {label}
            <input
              required={k !== "stock"}
              className="mt-1 w-full rounded border border-sand-deep px-2 py-2 text-sm"
              value={form[k]}
              onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
            />
          </label>
        ))}
        <div className="block text-xs text-ink-muted">
          <span className="mb-1 block">Description</span>
          <AdminRichTextEditor
            id="admin-product-description-new"
            value={form.description}
            onChange={(description) => setForm((f) => ({ ...f, description }))}
          />
        </div>
        <AdminMultiImageField
          label="Product media — images or video (MP4, WebM, MOV); images can be cropped before upload"
          value={form.images}
          onChange={(images) => setForm((f) => ({ ...f, images }))}
        />
        <label className="block text-xs text-ink-muted">
          Tags (comma-separated)
          <input
            className="mt-1 w-full rounded border border-sand-deep px-2 py-2 text-sm"
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
          />
        </label>
        <PackOptionsEditor
          rows={form.optionRows}
          onChange={(optionRows) => setForm((f) => ({ ...f, optionRows }))}
        />
        <button
          type="submit"
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          Create
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-sand-deep bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-sand-deep bg-sand/50 text-xs uppercase text-ink-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-ink-muted">
                  Loading…
                </td>
              </tr>
            ) : null}
            {products?.flatMap((p) => {
              const row = (
                <tr key={p._id} className="border-b border-sand-deep/80">
                  <td className="px-4 py-3">
                    <span className={p.isActive ? "text-ink" : "text-ink-muted line-through"}>
                      {p.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3">
                    {productHasOptions(p) ? (
                      <>
                        <span className="text-xs text-ink-muted">From </span>
                        {formatInrFromPaise(minOptionPricePaise(p))}
                      </>
                    ) : (
                      formatInrFromPaise(p.pricePaise)
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {productHasOptions(p) ? (
                      <span className="text-ink-muted">
                        {productOptionsFromDoc(p).length} packs
                        <span className="mt-0.5 block text-xs text-ink-muted/90">
                          base stock {p.stock}
                        </span>
                      </span>
                    ) : (
                      p.stock
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="text-xs font-medium text-accent hover:underline"
                        onClick={() => (editingId === p._id ? cancelEdit() : startEdit(p))}
                      >
                        {editingId === p._id ? "Close" : "Edit"}
                      </button>
                      <button
                        type="button"
                        className="text-xs text-rose hover:underline"
                        onClick={() => remove(p._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
              if (editingId !== p._id) return [row];
              const editRow = (
                <tr key={`${p._id}-edit`} className="border-b border-sand-deep bg-sand/20">
                  <td colSpan={5} className="px-4 py-4">
                    <form onSubmit={saveEdit} className="space-y-3">
                      <p className="text-xs font-medium text-ink">Edit product</p>
                      {editMsg ? <p className="text-sm text-rose">{editMsg}</p> : null}
                      <label className="block text-xs text-ink-muted">
                        Subcategory
                        <select
                          required
                          className="mt-1 w-full rounded border border-sand-deep bg-white px-2 py-2 text-sm text-ink"
                          value={editForm.subcategoryId}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, subcategoryId: e.target.value }))
                          }
                        >
                          {subOptions.map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-xs text-ink-muted">
                        Name
                        <input
                          required
                          className="mt-1 w-full rounded border border-sand-deep bg-white px-2 py-2 text-sm"
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        />
                      </label>
                      <p className="text-xs text-ink-muted">
                        URL slug (auto):{" "}
                        <span className="font-mono text-ink">/product/{slugify(editForm.name)}</span>
                      </p>
                      <p className="text-xs text-ink-muted">
                        SKU (does not change):{" "}
                        <span className="font-mono text-ink">{p.sku}</span>
                      </p>
                      {(
                        [
                          ["priceRupees", "Price (INR)"],
                          ["stock", "Stock"],
                        ] as const
                      ).map(([k, label]) => (
                        <label key={k} className="block text-xs text-ink-muted">
                          {label}
                          <input
                            required={k !== "stock"}
                            className="mt-1 w-full rounded border border-sand-deep bg-white px-2 py-2 text-sm"
                            value={editForm[k]}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, [k]: e.target.value }))
                            }
                          />
                        </label>
                      ))}
                      <div className="block text-xs text-ink-muted">
                        <span className="mb-1 block">Description</span>
                        <AdminRichTextEditor
                          id="admin-product-description-edit"
                          value={editForm.description}
                          onChange={(description) =>
                            setEditForm((f) => ({ ...f, description }))
                          }
                        />
                      </div>
                      <AdminMultiImageField
                        label="Product media"
                        value={editForm.images}
                        onChange={(images) => setEditForm((f) => ({ ...f, images }))}
                      />
                      <label className="block text-xs text-ink-muted">
                        Tags (comma-separated)
                        <input
                          className="mt-1 w-full rounded border border-sand-deep bg-white px-2 py-2 text-sm"
                          value={editForm.tags}
                          onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
                        />
                      </label>
                      <PackOptionsEditor
                        rows={editForm.optionRows}
                        onChange={(optionRows) => setEditForm((f) => ({ ...f, optionRows }))}
                      />
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                        <input
                          type="checkbox"
                          checked={editForm.isActive}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, isActive: e.target.checked }))
                          }
                          className="rounded border-sand-deep accent-accent"
                        />
                        Active (visible on storefront)
                      </label>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="submit"
                          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
                        >
                          Save changes
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-sand-deep bg-white px-4 py-2 text-sm text-ink"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </td>
                </tr>
              );
              return [row, editRow];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
