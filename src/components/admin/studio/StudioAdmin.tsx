"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { mountStudio } from "./mountStudio";
import "./studio.css";

function viewFromPath(path: string) {
  if (path.includes("storefront")) return "storefront";
  if (path.includes("categor")) return "categories";
  if (path.includes("order")) return "orders";
  if (path.includes("inquir")) return "inquiries";
  if (path.includes("review")) return "reviews";
  if (path.includes("notification")) return "notifications";
  if (path.includes("user")) return "users";
  return "products";
}

export function StudioAdmin() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() || "/admin";
  const [error, setError] = useState("");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let stop = () => {};
    let dead = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/admin/studio");
        const j = await res.json();
        if (dead) return;
        if (!res.ok || !j.ok) {
          setError(j.error || "Could not load the admin");
          return;
        }
        if (!rootRef.current) return;
        stop = mountStudio(rootRef.current, j.data, viewFromPath(pathname));
      } catch {
        if (!dead) setError("Could not load the admin");
      }
    })();
    return () => {
      dead = true;
      stop();
    };
  }, [pathname]);

  return (
    <>
      <div ref={rootRef} className="studio-root" />
      {error ? (
        <p style={{ padding: 24, color: "#2A2520" }}>{error}</p>
      ) : null}
    </>
  );
}
