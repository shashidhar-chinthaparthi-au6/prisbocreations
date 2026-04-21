import { getS3Config } from "@/lib/s3-config";

const REVIEW_REL = /^uploads\/reviews\/[a-zA-Z0-9._-]+\.(jpe?g|png|webp)$/i;

function pathLooksTrusted(path: string): boolean {
  const p = path.split("?")[0]?.replace(/^\//, "") ?? "";
  return REVIEW_REL.test(p);
}

export function isTrustedReviewPhotoUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
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
    const idx = path.indexOf("uploads/reviews/");
    if (idx !== -1 && pathLooksTrusted(path.slice(idx))) return true;
  } catch {
    /* ignore */
  }
  return false;
}
