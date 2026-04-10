"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/api/fetch-client";
import { AdminMultiImageField } from "@/components/admin/AdminMultiImageField";

type CategoryRow = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
  images: string[];
};

function parseImageUrls(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

type EditForm = {
  name: string;
  slug: string;
  description: string;
  sortOrder: string;
  imagesCsv: string;
};

const emptyEdit: EditForm = {
  name: "",
  slug: "",
  description: "",
  sortOrder: "0",
  imagesCsv: "",
};

export function AdminCategoriesClient() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    sortOrder: "0",
    imagesCsv: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyEdit);
  const [editMsg, setEditMsg] = useState<string | null>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => apiFetch<CategoryRow[]>("/api/v1/admin/categories"),
  });

  function startEdit(c: CategoryRow) {
    setEditingId(c._id);
    setEditMsg(null);
    setEditForm({
      name: c.name,
      slug: c.slug,
      description: c.description ?? "",
      sortOrder: String(c.sortOrder ?? 0),
      imagesCsv: c.images.join(", "),
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
    if (images.length === 0) {
      setEditMsg("Keep at least one image.");
      return;
    }
    try {
      await apiFetch(`/api/v1/admin/categories/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name,
          slug: editForm.slug,
          description: editForm.description,
          sortOrder: Number(editForm.sortOrder) || 0,
          images,
        }),
      });
      await qc.invalidateQueries({ queryKey: ["admin-categories"] });
      await qc.invalidateQueries({ queryKey: ["categories"] });
      cancelEdit();
    } catch (err) {
      setEditMsg(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const images = parseImageUrls(form.imagesCsv);
    if (images.length === 0) {
      setMsg("Add at least one image (upload or paste URLs).");
      return;
    }
    try {
      await apiFetch("/api/v1/admin/categories", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          description: form.description,
          sortOrder: Number(form.sortOrder) || 0,
          images,
        }),
      });
      setForm({ name: "", slug: "", description: "", sortOrder: "0", imagesCsv: "" });
      await qc.invalidateQueries({ queryKey: ["admin-categories"] });
      await qc.invalidateQueries({ queryKey: ["categories"] });
      setMsg("Category created");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete category and its products?")) return;
    if (editingId === id) cancelEdit();
    await apiFetch(`/api/v1/admin/categories/${id}`, { method: "DELETE" });
    await qc.invalidateQueries({ queryKey: ["admin-categories"] });
    await qc.invalidateQueries({ queryKey: ["categories"] });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <form
        onSubmit={create}
        className="space-y-3 rounded-2xl border border-sand-deep bg-white p-6 shadow-sm"
      >
        <h3 className="font-display text-lg text-ink">New category</h3>
        {msg ? <p className="text-sm text-accent">{msg}</p> : null}
        {(
          [
            ["name", "Name"],
            ["slug", "Slug"],
            ["sortOrder", "Sort order"],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="block text-xs text-ink-muted">
            {label}
            <input
              required={k !== "sortOrder"}
              className="mt-1 w-full rounded border border-sand-deep px-2 py-2 text-sm"
              value={form[k]}
              onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
            />
          </label>
        ))}
        <AdminMultiImageField
          label="Images (at least one required)"
          imagesOnly
          value={form.imagesCsv}
          onChange={(imagesCsv) => setForm((f) => ({ ...f, imagesCsv }))}
        />
        <label className="block text-xs text-ink-muted">
          Description
          <textarea
            className="mt-1 w-full rounded border border-sand-deep px-2 py-2 text-sm"
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          Create
        </button>
      </form>

      <ul className="space-y-3">
        {isLoading ? <li className="text-ink-muted">Loading…</li> : null}
        {rows?.map((c) => (
          <li
            key={c._id}
            className="rounded-xl border border-sand-deep bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{c.name}</p>
                <p className="text-xs text-ink-muted">{c.slug}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className="text-xs font-medium text-accent hover:underline"
                  onClick={() => (editingId === c._id ? cancelEdit() : startEdit(c))}
                >
                  {editingId === c._id ? "Close" : "Edit"}
                </button>
                <button
                  type="button"
                  className="text-xs text-rose hover:underline"
                  onClick={() => remove(c._id)}
                >
                  Delete
                </button>
              </div>
            </div>
            {editingId === c._id ? (
              <form onSubmit={saveEdit} className="mt-4 space-y-3 border-t border-sand-deep pt-4">
                <p className="text-xs font-medium text-ink">Edit category</p>
                {editMsg ? <p className="text-sm text-rose">{editMsg}</p> : null}
                {(
                  [
                    ["name", "Name"],
                    ["slug", "Slug"],
                    ["sortOrder", "Sort order"],
                  ] as const
                ).map(([k, label]) => (
                  <label key={k} className="block text-xs text-ink-muted">
                    {label}
                    <input
                      required={k !== "sortOrder"}
                      className="mt-1 w-full rounded border border-sand-deep px-2 py-2 text-sm"
                      value={editForm[k]}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, [k]: e.target.value }))
                      }
                    />
                  </label>
                ))}
                <AdminMultiImageField
                  label="Images (at least one required)"
                  imagesOnly
                  value={editForm.imagesCsv}
                  onChange={(imagesCsv) => setEditForm((f) => ({ ...f, imagesCsv }))}
                />
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
