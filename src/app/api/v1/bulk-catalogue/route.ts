import { embedCatalogueImages } from "@/lib/bulk/catalogue-images";
import { loadBulkCatalogue } from "@/lib/bulk/catalogue";
import { renderBulkCataloguePdf } from "@/lib/pdf/bulk-catalogue-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_MS = 10 * 60 * 1000;
let cache: { at: number; body: Buffer } | null = null;

function pdfResponse(body: Buffer) {
  return new Response(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="prisbo-bulk-catalogue.pdf"',
      "Cache-Control": "private, max-age=600",
    },
  });
}

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return pdfResponse(cache.body);

  try {
    const items = await loadBulkCatalogue();
    const withImages = await embedCatalogueImages(items);
    const body = Buffer.from(await renderBulkCataloguePdf(withImages));
    cache = { at: now, body };
    return pdfResponse(body);
  } catch (err) {
    console.error("Bulk catalogue PDF failed:", err);
    return Response.json({ ok: false, error: "The catalogue could not be prepared." }, { status: 500 });
  }
}
