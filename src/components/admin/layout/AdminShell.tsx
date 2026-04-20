"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ToastItem = { id: string; type: "success" | "error" | "warning" | "info"; message: string };

const ToastCtx = createContext<(t: Omit<ToastItem, "id">) => void>(() => {});

export function useAdminToast() {
  return useContext(ToastCtx);
}

const nav = [
  { href: "/admin/products", label: "Products" },
  { href: "/admin/setup/categories", label: "Categories" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/users", label: "Users" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((t: Omit<ToastItem, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { ...t, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  const toastStyles: Record<ToastItem["type"], string> = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-rose-200 bg-rose-50 text-rose-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    info: "border-sky-200 bg-sky-50 text-sky-900",
  };

  const main = useMemo(() => children, [children]);

  return (
    <ToastCtx.Provider value={pushToast}>
      <div className="min-h-screen bg-zinc-50 text-zinc-900">
        <div className="flex min-h-screen">
          <aside className="hidden w-56 shrink-0 border-r border-zinc-200 bg-white md:block">
            <div className="border-b border-zinc-200 px-4 py-4">
              <Link href="/admin/products" className="font-semibold tracking-tight">
                Admin
              </Link>
            </div>
            <nav className="space-y-0.5 p-2">
              {nav.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                      active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-14 items-center border-b border-zinc-200 bg-white px-4 md:hidden">
              <span className="font-semibold">Admin</span>
            </header>
            <main className="flex-1 p-4 md:p-8">{main}</main>
          </div>
        </div>
        <div className="fixed right-4 top-4 z-50 flex max-w-sm flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              className={`rounded-lg border px-4 py-3 text-sm shadow-lg ${toastStyles[t.type]}`}
            >
              {t.message}
            </div>
          ))}
        </div>
      </div>
    </ToastCtx.Provider>
  );
}
