import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonCreated, jsonError } from "@/lib/api/response";
import { rateLimitMemory, clientIpFromRequest } from "@/lib/auth/rate-limit-memory";
import { BulkInquiry } from "@/lib/models/BulkInquiry";
import { notifyBulkInquiry } from "@/lib/notify/dispatch";

const createSchema = z.object({
  company: z.string().trim().min(1, "Company name required").max(200),
  contactName: z.string().trim().min(1, "Contact name required").max(200),
  email: z.string().trim().email("Valid email required"),
  phone: z.string().trim().min(10, "Valid phone required").max(15),
  productInterest: z.string().trim().max(500).optional(),
  quantity: z.coerce.number().int().positive().optional(),
  deadlineDate: z.string().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req);
  if (!rateLimitMemory(`bulk:${ip}`, 5, 24 * 60 * 60 * 1000)) {
    return jsonError("Too many requests. Please try again tomorrow.", 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    return jsonError(JSON.stringify(msg), 400);
  }

  const d = parsed.data;
  await connectDb();

  const inquiry = await BulkInquiry.create({
    company: d.company,
    contactName: d.contactName,
    email: d.email,
    phone: d.phone,
    productInterest: d.productInterest,
    quantity: d.quantity,
    deadlineDate: d.deadlineDate ? new Date(d.deadlineDate) : undefined,
    notes: d.notes,
  });

  notifyBulkInquiry(inquiry).catch(() => {});

  return jsonCreated({ id: inquiry._id.toString() });
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  await connectDb();
  const inquiries = await BulkInquiry.find().sort({ createdAt: -1 }).lean();
  return jsonOk(inquiries);
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return jsonError("Missing id", 400);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const { status } = body as { status?: string };
  if (!status || !["new", "contacted", "won", "lost"].includes(status)) {
    return jsonError("Invalid status", 400);
  }

  await connectDb();
  await BulkInquiry.findByIdAndUpdate(id, { status });
  return jsonOk({ ok: true });
}
