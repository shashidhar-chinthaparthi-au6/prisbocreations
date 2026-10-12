const HOSTS = new Set([
  "prisbocreationsprod.s3.us-east-1.amazonaws.com",
  "prisbocreationsprod.s3.amazonaws.com",
]);

/** Same-origin copy of a catalogue photo so the print preview can read the cloth. */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("src") || "";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return new Response("Bad image", { status: 400 });
  }
  if (url.protocol !== "https:" || !HOSTS.has(url.hostname)) {
    return new Response("Not allowed", { status: 400 });
  }
  const image = await fetch(url, { redirect: "error" });
  if (!image.ok) return new Response("Could not read the photo", { status: 502 });
  const bytes = Buffer.from(await image.arrayBuffer());
  if (!bytes.length || bytes.length > 12 * 1024 * 1024) {
    return new Response("Image is too large", { status: 413 });
  }
  return new Response(bytes, {
    headers: {
      "Content-Type": image.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
