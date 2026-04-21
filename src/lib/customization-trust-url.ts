import { isTrustedCustomerImageUrl } from "@/lib/customer-upload";
import { getS3Config } from "@/lib/s3-config";

const CUSTOM_REL = /^uploads\/customization\/[a-zA-Z0-9._-]+\.(jpe?g|png|webp)$/i;

function pathLooksTrusted(path: string): boolean {
  const p = path.split("?")[0]?.replace(/^\//, "") ?? "";
  return CUSTOM_REL.test(p);
}

/** Allow buyer customization uploads: existing customer-uploads URLs or /uploads/customization/* on our bucket/site. */
export function isTrustedCustomizationAssetUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  if (isTrustedCustomerImageUrl(u)) return true;

  const cfg = getS3Config();
  if (cfg) {
    const base = cfg.publicBaseUrl.replace(/\/$/, "");
    if (u.startsWith(`${base}/`)) {
      const rest = u.slice(base.length + 1).split("?")[0] ?? "";
      if (pathLooksTrusted(rest)) return true;
    }
  }

  if (u.startsWith("/") && pathLooksTrusted(u.slice(1))) return true;

  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const path = parsed.pathname.replace(/^\//, "").split("?")[0] ?? "";
    if (pathLooksTrusted(path)) return true;
    const idx = path.indexOf("uploads/customization/");
    if (idx !== -1 && pathLooksTrusted(path.slice(idx))) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function extractCustomizationUploadKey(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const path = u.pathname.replace(/^\//, "").split("?")[0] ?? "";
    if (pathLooksTrusted(path)) return path;
    const idx = path.indexOf("uploads/customization/");
    if (idx !== -1) {
      const sub = path.slice(idx);
      if (pathLooksTrusted(sub)) return sub;
    }
  } catch {
    const t = url.trim().replace(/^\//, "");
    if (pathLooksTrusted(t)) return t;
  }
  return null;
}
