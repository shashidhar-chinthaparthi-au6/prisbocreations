"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/api/fetch-client";
import { AdminMultiImageField } from "@/components/admin/AdminMultiImageField";
import { slugify } from "@/lib/slugify";
import { Spinner } from "@/components/ui/Spinner";

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
  description: string;
  sortOrder: string;
  imagesCsv: string;
};

const emptyEdit: EditForm = {
  name: "",
  description: "",
  sortOrder: "0",
  imagesCsv: "",
};

export function AdminCategoriesClient() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    sortOrder: "0",
    imagesCsv: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyEdit);
  const [editMsg, setEditMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => apiFetch<CategoryRow[]>("/api/v1/admin/categories"),
  });

  function startEdit(c: CategoryRow) {
    setEditingId(c._id);
    setEditMsg(null);
    setEditForm({
      name: c.name,
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
    setSavingEdit(true);
    try {
      await apiFetch(`/api/v1/admin/categories/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name,
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
    } finally {
      setSavingEdit(false);
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
    setCreating(true);
    try {
      await apiFetch("/api/v1/admin/categories", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          sortOrder: Number(form.sortOrder) || 0,
          images,
        }),
      });
      setForm({ name: "", description: "", sortOrder: "0", imagesCsv: "" });
      await qc.invalidateQueries({ queryKey: ["admin-categories"] });
      await qc.invalidateQueries({ queryKey: ["categories"] });
      setMsg("Category created");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete category and its products?")) return;
    if (editingId === id) cancelEdit();
    setDeletingId(id);
    try {
      await apiFetch(`/api/v1/admin/categories/${id}`, { method: "DELETE" });
      await qc.invalidateQueries({ queryKey: ["admin-categories"] });
      await qc.invalidateQueries({ queryKey: ["categories"] });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <form
        onSubmit={create}
        className="space-y-3 rounded-2xl border border-sand-deep bg-white p-6 shadow-sm"
      >
        <h3 className="font-display text-lg text-ink">New category</h3>
        {msg ? <p className="text-sm text-accent">{msg}</p> : null}
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
          URL slug (auto): <span className="font-mono text-ink">/category/{slugify(form.name)}</span>
        </p>
        <label className="block text-xs text-ink-muted">
          Sort order
          <input
            className="mt-1 w-full rounded border border-sand-deep px-2 py-2 text-sm"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
          />
        </label>
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
          disabled={creating}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {creating ? (
            <>
              <Spinner size="sm" className="text-white" />
              Creating…
            </>
          ) : (
            "Create"
          )}
        </button>
      </form>

      <ul className="space-y-3">
        {isLoading ? (
          <li className="inline-flex items-center gap-2 text-ink-muted">
            <Spinner size="sm" />
            Loading…
          </li>
        ) : null}
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
                  disabled={deletingId === c._id}
                  className="inline-flex items-center gap-1 text-xs text-rose hover:underline disabled:opacity-60"
                  onClick={() => remove(c._id)}
                >
                  {deletingId === c._id ? (
                    <>
                      <Spinner size="sm" />
                      Deleting…
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
            {editingId === c._id ? (
              <form onSubmit={saveEdit} className="mt-4 space-y-3 border-t border-sand-deep pt-4">
                <p className="text-xs font-medium text-ink">Edit category</p>
                {editMsg ? <p className="text-sm text-rose">{editMsg}</p> : null}
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
                  <span className="font-mono text-ink">/category/{slugify(editForm.name)}</span>
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
                    disabled={savingEdit}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {savingEdit ? (
                      <>
                        <Spinner size="sm" className="text-white" />
                        Saving…
                      </>
                    ) : (
                      "Save changes"
                    )}
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
