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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { adminFetchJson, AdminApiError } from "@/lib/admin/admin-fetch";
import { AdminBreadcrumb } from "@/components/admin/layout/AdminBreadcrumb";
import { useAdminToast } from "@/components/admin/layout/AdminShell";
const FIELD_TYPES = ["text", "select", "number", "boolean"] as const;
type FieldType = (typeof FIELD_TYPES)[number];
import { slugify } from "@/lib/slugify";

type SchemaRow = {
  _id: string;
  key: string;
  label: string;
  fieldType: FieldType;
  options: string[];
  isHighlight: boolean;
  isRequired: boolean;
  displayOrder: number;
};

function labelToKey(label: string): string {
  return slugify(label).replace(/-/g, "_");
}

function SchemaFieldRow({
  row: r,
  patchField,
  mutate,
  toast,
}: {
  row: SchemaRow;
  patchField: (id: string, patch: Record<string, unknown>) => void;
  mutate: () => Promise<unknown>;
  toast: (t: { type: "success" | "error" | "warning" | "info"; message: string }) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(r._id),
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };
  return (
    <tr ref={setNodeRef} style={style} className="border-b border-zinc-100 hover:bg-zinc-50/80">
      <td className="px-3 py-2 align-middle">
        <button
          type="button"
          className="w-7 cursor-grab text-zinc-400 hover:text-zinc-700"
          {...attributes}
          {...listeners}
        >
          —
        </button>
      </td>
      <td className="px-3 py-2 align-middle">
        <input
          defaultValue={r.label}
          className="h-9 w-full rounded-lg border border-zinc-200 px-2"
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v && v !== r.label) patchField(r._id, { label: v });
          }}
        />
      </td>
      <td className="px-3 py-2 align-middle font-mono text-xs">{r.key}</td>
      <td className="px-3 py-2 align-middle">
        <select
          className="h-9 rounded-lg border border-zinc-200 px-2"
          value={r.fieldType}
          onChange={(e) => {
            const fieldType = e.target.value as FieldType;
            patchField(r._id, { fieldType });
          }}
        >
          {FIELD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2 align-middle text-xs">
        {r.fieldType === "select" ?
          <button
            type="button"
            className="text-accent hover:underline"
            onClick={() => {
              const raw = window.prompt("Comma-separated options", r.options.join(","));
              if (raw === null) return;
              const options = raw
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              patchField(r._id, { options });
            }}
          >
            {r.options.length} opts
          </button>
        : "—"}
      </td>
      <td className="px-3 py-2 align-middle">
        <input
          type="checkbox"
          checked={r.isHighlight}
          onChange={(e) => patchField(r._id, { isHighlight: e.target.checked })}
        />
      </td>
      <td className="px-3 py-2 align-middle">
        <input
          type="checkbox"
          checked={r.isRequired}
          onChange={(e) => patchField(r._id, { isRequired: e.target.checked })}
        />
      </td>
      <td className="px-3 py-2 align-middle text-right">
        <button
          type="button"
          className="text-rose-600 hover:underline"
          onClick={async () => {
            if (!confirm("Delete this field?")) return;
            try {
              await adminFetchJson(`/api/admin/schema-fields/${r._id}`, {
                method: "DELETE",
              });
              await mutate();
            } catch (err) {
              const msg = err instanceof AdminApiError ? err.message : "Delete failed";
              if (msg.includes("products have data")) {
                if (confirm("Products still have values. Delete anyway and strip values?")) {
                  await adminFetchJson(`/api/admin/schema-fields/${r._id}?confirm=1`, {
                    method: "DELETE",
                  });
                  await mutate();
                }
              } else {
                toast({ type: "error", message: msg });
              }
            }
          }}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

export function SchemaBuilderClient({
  subcategoryId,
  categoryName,
  subName,
}: {
  subcategoryId: string;
  categoryName: string;
  subName: string;
}) {
  const toast = useAdminToast();
  const key = `/api/admin/subcategories/${subcategoryId}/schema`;
  const { data, mutate } = useSWR<SchemaRow[]>(key, (u) => adminFetchJson<SchemaRow[]>(u), {
    revalidateOnFocus: false,
  });
  const rows = useMemo(() => data ?? [], [data]);

  const [savedFlash, setSavedFlash] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const scheduleSaved = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1200);
    }, 500);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const patchField = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      try {
        await adminFetchJson(`/api/admin/schema-fields/${id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
        await mutate();
        scheduleSaved();
      } catch (e) {
        toast({
          type: "error",
          message: e instanceof AdminApiError ? e.message : "Save failed",
        });
      }
    },
    [mutate, scheduleSaved, toast],
  );

  const onDragEnd = useCallback(
    async (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      const oldIndex = rows.findIndex((r) => String(r._id) === String(active.id));
      const newIndex = rows.findIndex((r) => String(r._id) === String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(rows, oldIndex, newIndex);
      const orderedIds = next.map((r) => String(r._id));
      try {
        await adminFetchJson(`/api/admin/subcategories/${subcategoryId}/schema/reorder`, {
          method: "PATCH",
          body: JSON.stringify({ orderedIds }),
        });
        await mutate();
        scheduleSaved();
      } catch (err) {
        toast({
          type: "error",
          message: err instanceof AdminApiError ? err.message : "Reorder failed",
        });
      }
    },
    [rows, subcategoryId, mutate, scheduleSaved, toast],
  );

  const ids = useMemo(() => rows.map((r) => String(r._id)), [rows]);

  const [addLabel, setAddLabel] = useState("");
  const [addKey, setAddKey] = useState("");
  const [addType, setAddType] = useState<FieldType>("text");
  const [addOpts, setAddOpts] = useState("");
  const [addHi, setAddHi] = useState(false);
  const [addReq, setAddReq] = useState(false);

  async function addField() {
    if (!addLabel.trim()) return;
    const key = addKey.trim() || labelToKey(addLabel);
    const options =
      addType === "select" ?
        addOpts
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    try {
      await adminFetchJson(`/api/admin/subcategories/${subcategoryId}/schema`, {
        method: "POST",
        body: JSON.stringify({
          key,
          label: addLabel.trim(),
          fieldType: addType,
          options,
          isHighlight: addHi,
          isRequired: addReq,
        }),
      });
      await mutate();
      setAddLabel("");
      setAddKey("");
      setAddOpts("");
      setAddHi(false);
      setAddReq(false);
      scheduleSaved();
    } catch (e) {
      toast({
        type: "error",
        message: e instanceof AdminApiError ? e.message : "Add failed",
      });
    }
  }

  return (
    <div>
      <AdminBreadcrumb
        items={[
          { label: "Admin", href: "/admin/products" },
          { label: "Setup", href: "/admin/setup/categories" },
          { label: "Schema" },
        ]}
      />
      <div className="mb-2 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
        <span>{categoryName}</span>
        <span className="text-zinc-300">→</span>
        <span className="font-medium text-zinc-900">{subName}</span>
        {savedFlash ?
          <span className="text-emerald-600">Saved</span>
        : null}
      </div>
      <h1 className="mb-6 text-2xl font-semibold">Schema fields</h1>
      <p className="mb-4 text-sm text-zinc-600">
        Variables use{" "}
        <code className="rounded bg-zinc-100 px-1 font-mono text-xs">{`{{field_key}}`}</code> in
        product descriptions.{" "}
        <Link href="/admin/setup/categories" className="text-accent hover:underline">
          Back to categories
        </Link>
      </p>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <th className="w-10 px-3 py-2" />
                <th className="px-3 py-2">Label</th>
                <th className="px-3 py-2">Key</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Options</th>
                <th className="px-3 py-2">Highlight</th>
                <th className="px-3 py-2">Required</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <tbody>
                {rows.map((r) => (
                  <SchemaFieldRow
                    key={r._id}
                    row={r}
                    patchField={patchField}
                    mutate={mutate}
                    toast={toast}
                  />
                ))}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-medium">Add field</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Label
            <input
              className="mt-1 block h-9 rounded-lg border border-zinc-200 px-2"
              value={addLabel}
              onChange={(e) => {
                const v = e.target.value;
                setAddLabel(v);
                if (!addKey || addKey === labelToKey(addLabel)) setAddKey(labelToKey(v));
              }}
            />
          </label>
          <label className="text-sm">
            Key
            <input
              className="mt-1 block h-9 rounded-lg border border-zinc-200 px-2 font-mono text-xs"
              value={addKey}
              onChange={(e) => setAddKey(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Type
            <select
              className="mt-1 block h-9 rounded-lg border border-zinc-200 px-2"
              value={addType}
              onChange={(e) => setAddType(e.target.value as FieldType)}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          {addType === "select" ?
            <label className="text-sm">
              Options (comma)
              <input
                className="mt-1 block h-9 w-48 rounded-lg border border-zinc-200 px-2"
                value={addOpts}
                onChange={(e) => setAddOpts(e.target.value)}
              />
            </label>
          : null}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={addHi} onChange={(e) => setAddHi(e.target.checked)} />
            Highlight
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={addReq} onChange={(e) => setAddReq(e.target.checked)} />
            Required
          </label>
          <button
            type="button"
            className="h-9 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white"
            onClick={() => addField()}
          >
            Save field
          </button>
        </div>
        <p className="mt-2 font-mono text-xs text-zinc-500">
          Available as{" "}
          <code>{addKey || labelToKey(addLabel) ? `{{${addKey || labelToKey(addLabel)}}}}` : "{{…}}"}</code>
        </p>
      </div>
    </div>
  );
}
