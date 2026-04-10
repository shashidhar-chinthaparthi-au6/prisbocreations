"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/fetch-client";
import { AdminMultiImageField } from "@/components/admin/AdminMultiImageField";
import { formatInrFromPaise } from "@/lib/format";

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
};

type CategoryRow = { _id: string; name: string; slug: string };
type SubRow = { _id: string; categoryId: string; name: string; slug: string };

type EditForm = {
  subcategoryId: string;
  name: string;
  slug: string;
  description: string;
  priceRupees: string;
  sku: string;
  stock: string;
  images: string;
  tags: string;
  isActive: boolean;
};

const emptyEdit: EditForm = {
  subcategoryId: "",
  name: "",
  slug: "",
  description: "",
  priceRupees: "",
  sku: "",
  stock: "0",
  images: "",
  tags: "",
  isActive: true,
};

export function AdminProductsClient() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    subcategoryId: "",
    name: "",
    slug: "",
    description: "",
    priceRupees: "",
    sku: "",
    stock: "50",
    images: "",
    tags: "",
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
      slug: p.slug,
      description: p.description ?? "",
      priceRupees: (p.pricePaise / 100).toFixed(2),
      sku: p.sku,
      stock: String(p.stock),
      images: p.images.join(", "),
      tags: (p.tags ?? []).join(", "),
      isActive: p.isActive,
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
    const images = editForm.images
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await apiFetch(`/api/v1/admin/products/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          subcategoryId: editForm.subcategoryId,
          name: editForm.name,
          slug: editForm.slug,
          description: editForm.description,
          pricePaise,
          sku: editForm.sku,
          stock: Number(editForm.stock) || 0,
          images,
          tags: editForm.tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          isActive: editForm.isActive,
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
    try {
      await apiFetch("/api/v1/admin/products", {
        method: "POST",
        body: JSON.stringify({
          subcategoryId: form.subcategoryId,
          name: form.name,
          slug: form.slug,
          description: form.description,
          pricePaise,
          sku: form.sku,
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
        }),
      });
      setForm({
        subcategoryId: form.subcategoryId,
        name: "",
        slug: "",
        description: "",
        priceRupees: "",
        sku: "",
        stock: "50",
        images: "",
        tags: "",
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
        {(
          [
            ["name", "Name"],
            ["slug", "Slug"],
            ["sku", "SKU"],
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
        <label className="block text-xs text-ink-muted">
          Description
          <textarea
            required
            className="mt-1 w-full rounded border border-sand-deep px-2 py-2 text-sm"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </label>
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
                  <td className="px-4 py-3">{formatInrFromPaise(p.pricePaise)}</td>
                  <td className="px-4 py-3">{p.stock}</td>
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
                      {(
                        [
                          ["name", "Name"],
                          ["slug", "Slug"],
                          ["sku", "SKU"],
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
                      <label className="block text-xs text-ink-muted">
                        Description
                        <textarea
                          required
                          className="mt-1 w-full rounded border border-sand-deep bg-white px-2 py-2 text-sm"
                          rows={3}
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, description: e.target.value }))
                          }
                        />
                      </label>
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
