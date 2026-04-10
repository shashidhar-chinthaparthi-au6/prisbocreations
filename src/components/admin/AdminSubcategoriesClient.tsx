"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/fetch-client";
import { AdminMultiImageField } from "@/components/admin/AdminMultiImageField";
import { slugify } from "@/lib/slugify";

type SubRow = {
  _id: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
  images: string[];
};

type CategoryRow = { _id: string; name: string; slug: string };

function parseImageUrls(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

type EditForm = {
  categoryId: string;
  name: string;
  description: string;
  sortOrder: string;
  imagesCsv: string;
};

const emptyEdit: EditForm = {
  categoryId: "",
  name: "",
  description: "",
  sortOrder: "0",
  imagesCsv: "",
};

export function AdminSubcategoriesClient() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    categoryId: "",
    name: "",
    description: "",
    sortOrder: "0",
    imagesCsv: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyEdit);
  const [editMsg, setEditMsg] = useState<string | null>(null);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<CategoryRow[]>("/api/v1/categories"),
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-subcategories"],
    queryFn: () => apiFetch<SubRow[]>("/api/v1/admin/subcategories"),
  });

  const byCat = useMemo(() => {
    const m = new Map<string, string>();
    categories?.forEach((c) => m.set(c._id, c.name));
    return m;
  }, [categories]);

  const categorySlugById = useMemo(() => {
    const m = new Map<string, string>();
    categories?.forEach((c) => m.set(c._id, c.slug));
    return m;
  }, [categories]);

  function startEdit(s: SubRow) {
    setEditingId(s._id);
    setEditMsg(null);
    setEditForm({
      categoryId: s.categoryId,
      name: s.name,
      description: s.description ?? "",
      sortOrder: String(s.sortOrder ?? 0),
      imagesCsv: s.images.join(", "),
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
    const images = parseImageUrls(editForm.imagesCsv);
    try {
      await apiFetch(`/api/v1/admin/subcategories/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          categoryId: editForm.categoryId,
          name: editForm.name,
          description: editForm.description || undefined,
          sortOrder: Number(editForm.sortOrder) || 0,
          images,
        }),
      });
      await qc.invalidateQueries({ queryKey: ["admin-subcategories"] });
      await qc.invalidateQueries({ queryKey: ["admin-products"] });
      cancelEdit();
    } catch (err) {
      setEditMsg(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const images = parseImageUrls(form.imagesCsv);
    try {
      await apiFetch("/api/v1/admin/subcategories", {
        method: "POST",
        body: JSON.stringify({
          categoryId: form.categoryId,
          name: form.name,
          description: form.description || undefined,
          sortOrder: Number(form.sortOrder) || 0,
          ...(images.length ? { images } : {}),
        }),
      });
      setForm({
        categoryId: form.categoryId,
        name: "",
        description: "",
        sortOrder: "0",
        imagesCsv: "",
      });
      await qc.invalidateQueries({ queryKey: ["admin-subcategories"] });
      setMsg("Subcategory created");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this subcategory and all its products?")) return;
    if (editingId === id) cancelEdit();
    await apiFetch(`/api/v1/admin/subcategories/${id}`, { method: "DELETE" });
    await qc.invalidateQueries({ queryKey: ["admin-subcategories"] });
    await qc.invalidateQueries({ queryKey: ["admin-products"] });
  }

  const createParentSlug = categorySlugById.get(form.categoryId) ?? "category";
  const editParentSlug = categorySlugById.get(editForm.categoryId) ?? "category";

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <form
        onSubmit={create}
        className="space-y-3 rounded-2xl border border-sand-deep bg-white p-6 shadow-sm"
      >
        <h3 className="font-display text-lg text-ink">New subcategory</h3>
        <p className="text-xs text-ink-muted">
          Products are listed under category → subcategory on the storefront.
        </p>
        {msg ? <p className="text-sm text-accent">{msg}</p> : null}
        <label className="block text-xs text-ink-muted">
          Parent category
          <select
            required
            className="mt-1 w-full rounded border border-sand-deep px-2 py-2 text-sm"
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
          >
            <option value="">Select…</option>
            {categories?.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
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
          <span className="font-mono text-ink">
            /category/{createParentSlug}/{slugify(form.name)}
          </span>
        </p>
        <label className="block text-xs text-ink-muted">
          Sort order
          <input
            className="mt-1 w-full rounded border border-sand-deep px-2 py-2 text-sm"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
          />
        </label>
        <label className="block text-xs text-ink-muted">
          Description
          <textarea
            className="mt-1 w-full rounded border border-sand-deep px-2 py-2 text-sm"
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </label>
        <AdminMultiImageField
          label="Images (optional)"
          imagesOnly
          value={form.imagesCsv}
          onChange={(imagesCsv) => setForm((f) => ({ ...f, imagesCsv }))}
        />
        <button
          type="submit"
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          Create
        </button>
      </form>

      <ul className="space-y-3">
        {isLoading ? <li className="text-ink-muted">Loading…</li> : null}
        {rows?.map((s) => (
          <li
            key={s._id}
            className="rounded-xl border border-sand-deep bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{s.name}</p>
                <p className="text-xs text-ink-muted">
                  {byCat.get(s.categoryId) ?? s.categoryId} · /{s.slug}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className="text-xs font-medium text-accent hover:underline"
                  onClick={() => (editingId === s._id ? cancelEdit() : startEdit(s))}
                >
                  {editingId === s._id ? "Close" : "Edit"}
                </button>
                <button
                  type="button"
                  className="text-xs text-rose hover:underline"
                  onClick={() => remove(s._id)}
                >
                  Delete
                </button>
              </div>
            </div>
            {editingId === s._id ? (
              <form onSubmit={saveEdit} className="mt-4 space-y-3 border-t border-sand-deep pt-4">
                <p className="text-xs font-medium text-ink">Edit subcategory</p>
                {editMsg ? <p className="text-sm text-rose">{editMsg}</p> : null}
                <label className="block text-xs text-ink-muted">
                  Parent category
                  <select
                    required
                    className="mt-1 w-full rounded border border-sand-deep px-2 py-2 text-sm"
                    value={editForm.categoryId}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, categoryId: e.target.value }))
                    }
                  >
                    {categories?.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-ink-muted">
                  Name
                  <input
                    required
                    className="mt-1 w-full rounded border border-sand-deep px-2 py-2 text-sm"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </label>
                <p className="text-xs text-ink-muted">
                  URL slug (auto):{" "}
                  <span className="font-mono text-ink">
                    /category/{editParentSlug}/{slugify(editForm.name)}
                  </span>
                </p>
                <label className="block text-xs text-ink-muted">
                  Sort order
                  <input
                    className="mt-1 w-full rounded border border-sand-deep px-2 py-2 text-sm"
                    value={editForm.sortOrder}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, sortOrder: e.target.value }))
                    }
                  />
                </label>
                <label className="block text-xs text-ink-muted">
                  Description
                  <textarea
                    className="mt-1 w-full rounded border border-sand-deep px-2 py-2 text-sm"
                    rows={2}
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, description: e.target.value }))
                    }
                  />
                </label>
                <AdminMultiImageField
                  label="Images (optional — leave empty for none)"
                  imagesOnly
                  value={editForm.imagesCsv}
                  onChange={(imagesCsv) => setEditForm((f) => ({ ...f, imagesCsv }))}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
                  >
                    Save changes
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-sand-deep px-4 py-2 text-sm text-ink"
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
