"use client";

import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { adminFetchJson, AdminApiError } from "@/lib/admin/admin-fetch";
import { slugify } from "@/lib/slugify";
import { useAdminToast } from "@/components/admin/layout/AdminShell";

type SubRow = {
  _id: string;
  name: string;
  slug: string;
  categoryId: string;
  schemaFieldCount: number;
  displayOrder: number;
};

type CatRow = {
  _id: string;
  name: string;
  slug: string;
  sortOrder: number;
  displayOrder: number;
  productCount: number;
  subcategories: SubRow[];
};

function useCategoriesTree() {
  return useSWR<CatRow[]>(
    "/api/admin/categories",
    (url) => adminFetchJson<CatRow[]>(url),
    { revalidateOnFocus: false },
  );
}

function SortableRow({
  id,
  children,
  handleOnly,
}: {
  id: string;
  children: React.ReactNode;
  handleOnly?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch gap-2 rounded-lg bg-white">
      <button
        type="button"
        className="w-8 shrink-0 cursor-grab rounded-l-lg border border-r-0 border-zinc-200 bg-zinc-50 text-zinc-400 hover:bg-zinc-100 active:cursor-grabbing"
        {...attributes}
        {...(handleOnly ? listeners : {})}
        aria-label="Drag to reorder"
      >
        —
      </button>
      <div {...(handleOnly ? {} : listeners)} className="min-w-0 flex-1">
        {children}
      </div>
    </div>
  );
}

export function CategoriesPageClient() {
  const toast = useAdminToast();
  const { data, mutate, isLoading } = useCategoriesTree();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<"category" | "subcategory">("category");
  const [selCat, setSelCat] = useState<string | null>(null);
  const [selSub, setSelSub] = useState<string | null>(null);

  const [catForm, setCatForm] = useState({ name: "", slug: "", displayOrder: 0 });
  const [subForm, setSubForm] = useState({
    categoryId: "",
    name: "",
    slug: "",
    displayOrder: 0,
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const categoryOrderIds = useMemo(() => (data ?? []).map((c) => String(c._id)), [data]);

  const onDragEndCategories = useCallback(
    async (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id || !data) return;
      const oldIndex = data.findIndex((c) => String(c._id) === String(active.id));
      const newIndex = data.findIndex((c) => String(c._id) === String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(data, oldIndex, newIndex);
      const orderedIds = next.map((c) => String(c._id));
      try {
        await adminFetchJson("/api/admin/categories/reorder", {
          method: "POST",
          body: JSON.stringify({ orderedIds }),
        });
        await mutate();
        toast({ type: "success", message: "Order saved" });
      } catch (err) {
        toast({
          type: "error",
          message: err instanceof AdminApiError ? err.message : "Reorder failed",
        });
      }
    },
    [data, mutate, toast],
  );

  const onDragEndSubs = useCallback(
    async (categoryId: string, subs: SubRow[], e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      const oldIndex = subs.findIndex((s) => String(s._id) === String(active.id));
      const newIndex = subs.findIndex((s) => String(s._id) === String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(subs, oldIndex, newIndex);
      const orderedIds = next.map((s) => String(s._id));
      try {
        await adminFetchJson("/api/admin/subcategories/reorder", {
          method: "POST",
          body: JSON.stringify({ categoryId, orderedIds }),
        });
        await mutate();
        toast({ type: "success", message: "Order saved" });
      } catch (err) {
        toast({
          type: "error",
          message: err instanceof AdminApiError ? err.message : "Reorder failed",
        });
      }
    },
    [mutate, toast],
  );

  async function saveCategory() {
    try {
      if (selCat) {
        await adminFetchJson(`/api/admin/categories/${selCat}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: catForm.name,
            slug: catForm.slug,
            displayOrder: catForm.displayOrder,
          }),
        });
      } else {
        await adminFetchJson("/api/admin/categories", {
          method: "POST",
          body: JSON.stringify({
            name: catForm.name,
            slug: catForm.slug,
            displayOrder: catForm.displayOrder,
          }),
        });
      }
      await mutate();
      toast({ type: "success", message: "Category saved" });
      setSelCat(null);
      setCatForm({ name: "", slug: "", displayOrder: 0 });
    } catch (err) {
      toast({
        type: "error",
        message: err instanceof AdminApiError ? err.message : "Save failed",
      });
    }
  }

  async function saveSubcategory(): Promise<void> {
    try {
      if (selSub) {
        await adminFetchJson(`/api/admin/subcategories/${selSub}`, {
          method: "PATCH",
          body: JSON.stringify({
            categoryId: subForm.categoryId,
            name: subForm.name,
            slug: subForm.slug,
            displayOrder: subForm.displayOrder,
          }),
        });
      } else {
        const created = await adminFetchJson<{ _id: string }>("/api/admin/subcategories", {
          method: "POST",
          body: JSON.stringify(subForm),
        });
        await mutate();
        toast({ type: "success", message: "Subcategory saved" });
        setSelSub(String(created._id));
        setSubForm((f) => ({ ...f }));
        return;
      }
      await mutate();
      toast({ type: "success", message: "Subcategory saved" });
    } catch (err) {
      toast({
        type: "error",
        message: err instanceof AdminApiError ? err.message : "Save failed",
      });
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm("Delete this category?")) return;
    try {
      await adminFetchJson(`/api/admin/categories/${id}`, { method: "DELETE" });
      await mutate();
      toast({ type: "success", message: "Deleted" });
    } catch (err) {
      toast({
        type: "error",
        message: err instanceof AdminApiError ? err.message : "Delete failed",
      });
    }
  }

  async function deleteSubcategory(id: string) {
    if (!confirm("Delete this subcategory?")) return;
    try {
      await adminFetchJson(`/api/admin/subcategories/${id}`, { method: "DELETE" });
      await mutate();
      toast({ type: "success", message: "Deleted" });
    } catch (err) {
      toast({
        type: "error",
        message: err instanceof AdminApiError ? err.message : "Delete failed",
      });
    }
  }

  if (isLoading || !data) {
    return <div className="animate-pulse space-y-3 text-zinc-400">Loading categories…</div>;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Tree
        </h2>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEndCategories}>
          <SortableContext items={categoryOrderIds} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {data.map((cat) => {
                const open = expanded[String(cat._id)] ?? true;
                return (
                  <li key={String(cat._id)} className="space-y-2">
                    <SortableRow id={String(cat._id)} handleOnly>
                      <div className="flex items-center justify-between gap-2 rounded-r-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2">
                        <button
                          type="button"
                          className="text-left text-sm font-medium text-zinc-900"
                          onClick={() => {
                            setExpanded((s) => ({ ...s, [String(cat._id)]: !open }));
                          }}
                        >
                          {open ? "▼" : "▶"} {cat.name}
                          <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-normal text-zinc-700">
                            {cat.subcategories.length} subs
                          </span>
                          {cat.productCount > 0 ?
                            <span className="ml-2 text-xs text-amber-700">
                              {cat.productCount} products
                            </span>
                          : null}
                        </button>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="rounded-md p-1 text-zinc-500 hover:bg-white hover:text-zinc-900"
                            onClick={() => {
                              setTab("category");
                              setSelCat(String(cat._id));
                              setCatForm({
                                name: cat.name,
                                slug: cat.slug,
                                displayOrder: cat.displayOrder ?? cat.sortOrder ?? 0,
                              });
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-1 text-rose-600 hover:bg-rose-50"
                            onClick={() => deleteCategory(String(cat._id))}
                          >
                            Del
                          </button>
                        </div>
                      </div>
                    </SortableRow>
                    {open ?
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(ev) => onDragEndSubs(String(cat._id), cat.subcategories, ev)}
                      >
                        <SortableContext
                          items={cat.subcategories.map((s) => String(s._id))}
                          strategy={verticalListSortingStrategy}
                        >
                          <ul className="ml-6 space-y-1 border-l border-zinc-200 pl-3">
                            {cat.subcategories.map((sub) => (
                              <li key={String(sub._id)}>
                                <SortableRow id={String(sub._id)} handleOnly>
                                  <div className="flex items-center justify-between gap-2 rounded-r-lg border border-zinc-200 px-3 py-1.5">
                                    <span className="text-sm">
                                      {sub.name}
                                      <span
                                        className={`ml-2 rounded px-1.5 py-0.5 text-xs ${
                                          sub.schemaFieldCount > 0 ?
                                            "bg-emerald-100 text-emerald-800"
                                          : "bg-amber-100 text-amber-800"
                                        }`}
                                      >
                                        {sub.schemaFieldCount > 0 ? "schema ✓" : "no schema"}
                                      </span>
                                    </span>
                                    <div className="flex gap-1">
                                      <Link
                                        href={`/admin/setup/schema/${sub._id}`}
                                        className="rounded-md px-2 py-0.5 text-xs text-accent hover:underline"
                                      >
                                        Schema
                                      </Link>
                                      <button
                                        type="button"
                                        className="rounded-md p-1 text-zinc-500 hover:bg-zinc-50"
                                        onClick={() => {
                                          setTab("subcategory");
                                          setSelSub(String(sub._id));
                                          setSubForm({
                                            categoryId: String(sub.categoryId),
                                            name: sub.name,
                                            slug: sub.slug,
                                            displayOrder: sub.displayOrder ?? 0,
                                          });
                                        }}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="rounded-md p-1 text-rose-600 hover:bg-rose-50"
                                        onClick={() => deleteSubcategory(String(sub._id))}
                                      >
                                        Del
                                      </button>
                                    </div>
                                  </div>
                                </SortableRow>
                              </li>
                            ))}
                          </ul>
                        </SortableContext>
                      </DndContext>
                    : null}
                  </li>
                );
              })}
            </ul>
          </SortableContext>
        </DndContext>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex gap-2 border-b border-zinc-200 pb-3">
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === "category" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
            onClick={() => setTab("category")}
          >
            Category
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === "subcategory" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
            onClick={() => setTab("subcategory")}
          >
            Subcategory
          </button>
        </div>

        {tab === "category" ?
          <div className="space-y-4">
            <div className="flex justify-between gap-2">
              <h3 className="font-medium">{selCat ? "Edit category" : "New category"}</h3>
              <button
                type="button"
                className="text-sm text-accent hover:underline"
                onClick={() => {
                  setSelCat(null);
                  setCatForm({ name: "", slug: "", displayOrder: 0 });
                }}
              >
                Clear
              </button>
            </div>
            <label className="block text-sm">
              <span className="text-zinc-600">Name</span>
              <input
                className="mt-1 h-9 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none ring-zinc-900 focus:ring-2"
                value={catForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setCatForm((f) => ({
                    ...f,
                    name,
                    slug: selCat ? f.slug : slugify(name),
                  }));
                }}
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Slug</span>
              <input
                className="mt-1 h-9 w-full rounded-lg border border-zinc-200 px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                value={catForm.slug}
                onChange={(e) => setCatForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Display order</span>
              <input
                type="number"
                className="mt-1 h-9 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                value={catForm.displayOrder}
                onChange={(e) =>
                  setCatForm((f) => ({ ...f, displayOrder: Number(e.target.value) || 0 }))
                }
              />
            </label>
            <button
              type="button"
              className="h-9 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
              onClick={() => saveCategory()}
            >
              Save category
            </button>
          </div>
        : <div className="space-y-4">
            <div className="flex justify-between gap-2">
              <h3 className="font-medium">{selSub ? "Edit subcategory" : "New subcategory"}</h3>
              <button
                type="button"
                className="text-sm text-accent hover:underline"
                onClick={() => {
                  setSelSub(null);
                  setSubForm({ categoryId: "", name: "", slug: "", displayOrder: 0 });
                }}
              >
                Clear
              </button>
            </div>
            <label className="block text-sm">
              <span className="text-zinc-600">Parent category</span>
              <select
                className="mt-1 h-9 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                value={subForm.categoryId}
                onChange={(e) => setSubForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                <option value="">Select…</option>
                {data.map((c) => (
                  <option key={String(c._id)} value={String(c._id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Name</span>
              <input
                className="mt-1 h-9 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                value={subForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setSubForm((f) => ({
                    ...f,
                    name,
                    slug: selSub ? f.slug : slugify(name),
                  }));
                }}
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Slug</span>
              <input
                className="mt-1 h-9 w-full rounded-lg border border-zinc-200 px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                value={subForm.slug}
                onChange={(e) => setSubForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Display order</span>
              <input
                type="number"
                className="mt-1 h-9 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                value={subForm.displayOrder}
                onChange={(e) =>
                  setSubForm((f) => ({ ...f, displayOrder: Number(e.target.value) || 0 }))
                }
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="h-9 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
                onClick={() => saveSubcategory()}
              >
                Save subcategory
              </button>
              {selSub ?
                <Link
                  href={`/admin/setup/schema/${selSub}`}
                  className="inline-flex h-9 items-center rounded-lg border border-zinc-300 px-4 text-sm font-medium hover:bg-zinc-50"
                >
                  Build schema →
                </Link>
              : null}
            </div>
            {!selSub ?
              <p className="text-xs text-zinc-500">
                After creating a new subcategory, select it in the tree and use &quot;Build schema →&quot;.
              </p>
            : null}
          </div>
        }
      </div>
    </div>
  );
}
