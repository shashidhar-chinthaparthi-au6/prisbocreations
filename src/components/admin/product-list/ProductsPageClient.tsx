"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAdminProductsList } from "@/lib/admin/hooks/useAdminProductsList";
import { adminFetchJson, AdminApiError } from "@/lib/admin/admin-fetch";
import { useAdminToast } from "@/components/admin/layout/AdminShell";
import { AdminBreadcrumb } from "@/components/admin/layout/AdminBreadcrumb";
import { getLowStockThreshold } from "@/lib/admin/low-stock";
import { ADMIN_RECIPIENT_OPTIONS, parseRecipientSlug, type RecipientSlug } from "@/lib/recipients";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

type Row = Record<string, unknown> & {
  _id?: string;
  name?: string;
  skuBase?: string;
  sku?: string;
  stock?: number;
  pricePaise?: number;
  status?: string;
  isActive?: boolean;
  updatedAt?: string;
  colourVariants?: {
    hexCode?: string;
    isActive?: boolean;
    sizeStocks?: { size?: string; stock?: number }[];
  }[];
  _category?: { name?: string } | null;
  _subcategory?: { name?: string } | null;
  recipients?: string[];
};

function buildListUrl(p: {
  page: number;
  search: string;
  status: string;
  categoryId: string;
  lowStock: boolean;
  sort: string;
  order: string;
  recipient: string;
}) {
  const sp = new URLSearchParams();
  sp.set("page", String(p.page));
  sp.set("pageSize", "25");
  if (p.search.trim()) sp.set("search", p.search.trim());
  if (p.status !== "all") sp.set("status", p.status);
  if (p.categoryId) sp.set("categoryId", p.categoryId);
  if (p.recipient) sp.set("recipient", p.recipient);
  if (p.lowStock) sp.set("lowStock", "1");
  sp.set("sort", p.sort);
  sp.set("order", p.order);
  return `/api/admin/products?${sp.toString()}`;
}

export function ProductsPageClient({
  categoryChips,
}: {
  categoryChips: { id: string; name: string }[];
}) {
  const toast = useAdminToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [categoryId, setCategoryId] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [sort, setSort] = useState("updatedAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [recipient, setRecipient] = useState<string>("");

  const swrKey = useMemo(
    () =>
      buildListUrl({ page, search, status, categoryId, lowStock, sort, order, recipient }),
    [page, search, status, categoryId, lowStock, sort, order, recipient],
  );

  const { data, isLoading, mutate } = useAdminProductsList(swrKey);
  const items = (data?.items ?? []) as Row[];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 25;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  function exportCsv() {
    const headers = [
      "name",
      "skuBase",
      "category",
      "subcategory",
      "status",
      "stock",
      "pricePaise",
      "updatedAt",
    ];
    const lines = [headers.join(",")];
    for (const r of items) {
      const cat = r._category?.name ?? "";
      const sub = r._subcategory?.name ?? "";
      lines.push(
        [
          JSON.stringify(r.name ?? ""),
          JSON.stringify(r.skuBase ?? r.sku ?? ""),
          JSON.stringify(cat),
          JSON.stringify(sub),
          JSON.stringify(r.status ?? ""),
          r.stock ?? 0,
          r.pricePaise ?? 0,
          JSON.stringify(r.updatedAt ?? ""),
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function duplicate(id: string) {
    try {
      const res = await adminFetchJson<{ id: string }>(`/api/admin/products/${id}/duplicate`, {
        method: "POST",
      });
      toast({ type: "success", message: "Duplicated" });
      await mutate();
      window.location.href = `/admin/products/${res.id}/edit`;
    } catch (e) {
      toast({ type: "error", message: e instanceof AdminApiError ? e.message : "Failed" });
    }
  }

  async function archiveProduct(id: string) {
    try {
      await adminFetchJson(`/api/admin/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      await mutate();
      toast({ type: "success", message: "Archived" });
    } catch (e) {
      toast({ type: "error", message: e instanceof AdminApiError ? e.message : "Failed" });
    }
  }

  async function removeProduct(id: string) {
    if (!confirm("Permanently delete this product?")) return;
    try {
      await adminFetchJson(`/api/admin/products/${id}`, { method: "DELETE" });
      await mutate();
      toast({ type: "success", message: "Deleted" });
    } catch (e) {
      toast({ type: "error", message: e instanceof AdminApiError ? e.message : "Failed" });
    }
  }

  const lowTh = getLowStockThreshold();

  return (
    <div>
      <AdminBreadcrumb
        items={[{ label: "Admin", href: "/admin/products" }, { label: "Products" }]}
      />
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="h-9 rounded-lg border border-zinc-300 px-3 text-sm hover:bg-zinc-50"
            onClick={() => exportCsv()}
          >
            Export CSV
          </button>
          <Link
            href="/admin/products/new"
            className="inline-flex h-9 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
          >
            + Add product
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <input
          placeholder="Search name, brand, SKU…"
          className="h-9 w-full max-w-md rounded-lg border border-zinc-200 px-3 text-sm"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="flex flex-wrap gap-2">
          {(["all", "PUBLISHED", "DRAFT", "ARCHIVED"] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                status === s ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
            >
              {s === "all" ? "All" : s[0] + s.slice(1).toLowerCase()}
            </button>
          ))}
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              lowStock ? "bg-amber-600 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
            onClick={() => {
              setLowStock((v) => !v);
              setPage(1);
            }}
          >
            Low stock (&lt;{lowTh})
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categoryChips.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                categoryId === c.id ?
                  "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
              onClick={() => {
                setCategoryId((prev) => (prev === c.id ? "" : c.id));
                setPage(1);
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Recipient</span>
          {ADMIN_RECIPIENT_OPTIONS.map((r) => {
            const active = recipient === r.slug;
            return (
              <button
                key={r.slug}
                type="button"
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  active ? "bg-violet-700 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
                onClick={() => {
                  setRecipient((prev) => (prev === r.slug ? "" : r.slug));
                  setPage(1);
                }}
              >
                {r.label.replace(/^For /, "")}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ?
        <div className="animate-pulse space-y-2 text-zinc-400">Loading…</div>
      : items.length === 0 ?
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center text-zinc-500">
          <p className="mb-4">No products yet.</p>
          <Link href="/admin/products/new" className="text-accent font-medium hover:underline">
            Add your first product →
          </Link>
        </div>
      : <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <th className="px-3 py-2">
                  <button
                    type="button"
                    className="hover:text-zinc-900"
                    onClick={() => {
                      setSort("name");
                      setOrder((o) => (o === "asc" ? "desc" : "asc"));
                    }}
                  >
                    Product
                  </button>
                </th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2 max-w-[140px]">Recipients</th>
                <th className="px-3 py-2">Variants</th>
                <th className="px-3 py-2">
                  <button
                    type="button"
                    className="hover:text-zinc-900"
                    onClick={() => {
                      setSort("stock");
                      setOrder((o) => (o === "asc" ? "desc" : "asc"));
                    }}
                  >
                    Stock
                  </button>
                </th>
                <th className="px-3 py-2">
                  <button
                    type="button"
                    className="hover:text-zinc-900"
                    onClick={() => {
                      setSort("price");
                      setOrder((o) => (o === "asc" ? "desc" : "asc"));
                    }}
                  >
                    Price
                  </button>
                </th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const id = String(r._id ?? "");
                const cvs = (r.colourVariants ?? []).filter((v) => v.isActive !== false);
                const swatches = cvs.slice(0, 6);
                const sizes = new Set<string>();
                for (const v of cvs) {
                  for (const s of v.sizeStocks ?? []) {
                    if (s.size) sizes.add(String(s.size));
                  }
                }
                const stock = Number(r.stock ?? 0);
                const skuCount = cvs.length * Math.max(1, sizes.size);
                const low =
                  stock < lowTh ||
                  cvs.some((v) => (v.sizeStocks ?? []).some((ss) => Number(ss.stock) < lowTh));
                const pricePaise = Number(r.pricePaise ?? 0);
                const st =
                  r.status ??
                  (r.isActive !== false ? ("PUBLISHED" as const) : ("ARCHIVED" as const));
                const recs = (r.recipients ?? []).filter(
                  (x): x is RecipientSlug => parseRecipientSlug(x) !== null,
                );
                return (
                  <tr key={id} className="group border-b border-zinc-100 hover:bg-zinc-50/80">
                    <td className="px-3 py-3">
                      <p className="text-sm font-semibold text-zinc-900">{r.name}</p>
                      <p className="text-xs text-zinc-500">
                        {r.skuBase ?? r.sku} · {r._subcategory?.name ?? "—"}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-zinc-600">{r._category?.name ?? "—"}</td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-wrap gap-1">
                        {recs.length ?
                          recs.map((slug) => (
                            <span
                              key={slug}
                              className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-900"
                            >
                              {slug}
                            </span>
                          ))
                        : <span className="text-xs text-zinc-400">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        {swatches.map((v, i) => (
                          <span
                            key={i}
                            className="inline-block h-5 w-5 rounded-full border border-zinc-200"
                            style={{ backgroundColor: v.hexCode ?? "#ccc" }}
                          />
                        ))}
                        {cvs.length > 6 ?
                          <span className="text-xs text-zinc-500">+{cvs.length - 6}</span>
                        : null}
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {cvs.length} colours · {sizes.size || 1} sizes
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <p className={stock === 0 ? "font-medium text-rose-600" : ""}>{stock}</p>
                      <p className="text-xs text-zinc-500">{skuCount} SKUs</p>
                      {low && stock > 0 ?
                        <p className="text-xs text-amber-700">Low stock</p>
                      : null}
                      {stock === 0 ?
                        <p className="text-xs text-rose-600">Out of stock</p>
                      : null}
                    </td>
                    <td className="px-3 py-3">{inr.format(pricePaise / 100)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          st === "PUBLISHED" ?
                            "bg-emerald-100 text-emerald-800"
                          : st === "DRAFT" ?
                            "bg-zinc-100 text-zinc-700"
                          : "bg-zinc-200 text-zinc-600"
                        }`}
                      >
                        {st}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2 opacity-0 transition group-hover:opacity-100">
                        <Link
                          href={`/admin/products/${id}/edit`}
                          className="text-xs text-accent hover:underline"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/admin/products/${id}/preview`}
                          className="text-xs text-accent hover:underline"
                        >
                          Preview
                        </Link>
                        <button
                          type="button"
                          className="text-xs text-zinc-600 hover:underline"
                          onClick={() => duplicate(id)}
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          className="text-xs text-zinc-600 hover:underline"
                          onClick={() => archiveProduct(id)}
                        >
                          Archive
                        </button>
                        <button
                          type="button"
                          className="text-xs text-rose-600 hover:underline"
                          onClick={() => removeProduct(id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-zinc-100 px-3 py-2 text-sm text-zinc-600">
            <span>
              Page {page} / {pages} ({total} total)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-zinc-200 px-3 py-1 disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <button
                type="button"
                className="rounded-lg border border-zinc-200 px-3 py-1 disabled:opacity-40"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  );
}
