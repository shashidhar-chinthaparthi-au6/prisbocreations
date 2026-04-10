import { z } from "zod";

/** True for `https?://…` or a safe same-origin path (e.g. `/uploads/…`). */
export function isImageRef(s: string): boolean {
  if (!s || s.length > 2048) return false;
  if (s.startsWith("/")) {
    if (s.includes("..")) return false;
    return s.length >= 2;
  }
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export const zImageRef = () =>
  z.string().min(1).max(2048).refine(isImageRef, "Invalid image URL or path");

export const zImageRefArray = () => z.array(zImageRef());
