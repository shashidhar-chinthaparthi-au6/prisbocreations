import { NextResponse } from "next/server";
import JSZip from "jszip";
import { requireAdmin } from "@/lib/api/auth";
import { connectDb } from "@/lib/db";
import { loadTrustedCustomizationBytes } from "@/lib/customization-fetch-asset";
import { getOrderById } from "@/lib/services/orderService";

export const runtime = "nodejs";

function collectFileUrls(items: unknown[]): string[] {
  const urls: string[] = [];
  for (const it of items) {
    if (!it || typeof it !== "object") continue;
    const rec = it as Record<string, unknown>;
    const img = typeof rec.customerImageUrl === "string" ? rec.customerImageUrl.trim() : "";
    if (img) urls.push(img);
    const cf = rec.customizationFiles;
    if (!cf || typeof cf !== "object" || Array.isArray(cf)) continue;
    for (const val of Object.values(cf as Record<string, unknown>)) {
      const arr = Array.isArray(val) ? val : [val];
      for (const m of arr) {
        if (m && typeof m === "object" && typeof (m as { url?: string }).url === "string") {
          const u = (m as { url: string }).url.trim();
          if (u) urls.push(u);
        }
      }
    }
  }
  return [...new Set(urls)];
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  await connectDb();
  const { id } = await ctx.params;
  const order = await getOrderById(id);
  if (!order) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  const items = (order as { items?: unknown[] }).items ?? [];
  const urls = collectFileUrls(items);
  if (!urls.length) {
    return NextResponse.json({ ok: false, error: "No uploaded files on this order" }, { status: 404 });
  }

  const zip = new JSZip();
  let n = 0;
  for (const url of urls) {
    const buf = await loadTrustedCustomizationBytes(url);
    if (!buf) continue;
    n += 1;
    const lower = url.toLowerCase();
    const ext = lower.includes(".png") ? "png" : lower.includes(".webp") ? "webp" : "jpg";
    zip.file(`file-${n}.${ext}`, buf);
  }
  if (n === 0) {
    return NextResponse.json({ ok: false, error: "Could not read files from storage" }, { status: 502 });
  }

  const out = await zip.generateAsync({ type: "nodebuffer" });
  const invRaw = (order as { invoiceNumber?: string }).invoiceNumber;
  const inv = typeof invRaw === "string" && invRaw.trim() ? invRaw.trim() : id.slice(-8);
  const body = new Uint8Array(out);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="order-${inv}-customization-files.zip"`,
    },
  });
}
