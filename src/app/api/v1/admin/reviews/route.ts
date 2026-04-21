import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk } from "@/lib/api/response";
import { Review } from "@/lib/models/Review";
import { Product } from "@/lib/models/Product";
import { User } from "@/lib/models/User";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  await connectDb();

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "pending";

  const where: Record<string, unknown> =
    status === "pending"
      ? { isApproved: false, isRejected: { $ne: true } }
      : status === "approved"
        ? { isApproved: true }
        : { isRejected: true };

  const rows = await Review.find(where)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate<{ userId?: { name?: string; email?: string } | null }>({
      path: "userId",
      model: User,
      select: "name email",
    })
    .lean();

  const pids = [...new Set(rows.map((r) => String(r.productId)))];
  const oids = pids
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const products = await Product.find({ _id: { $in: oids } })
    .select("name slug")
    .lean();
  const pmap = new Map(products.map((p) => [String(p._id), p]));

  const out = rows.map((r) => {
    const p = pmap.get(String(r.productId));
    const u = r.userId && typeof r.userId === "object" && "name" in r.userId ? r.userId : null;
    const reviewer =
      u?.name?.trim() || r.guestName?.trim() || (r.guestEmail ? r.guestEmail.split("@")[0] : "Guest");
    return {
      id: String(r._id),
      rating: r.rating,
      title: r.title || null,
      body: r.body,
      photos: Array.isArray(r.photos) ? r.photos : [],
      variantName: r.variantName || null,
      isVerified: Boolean(r.isVerified),
      isApproved: Boolean(r.isApproved),
      isRejected: Boolean(r.isRejected),
      rejectedReason: r.rejectedReason || null,
      adminReply: r.adminReply || null,
      createdAt: r.createdAt,
      reviewer,
      productName: p?.name ?? "Product",
      productSlug: p?.slug ?? "",
    };
  });

  const [pendingC, approvedC, rejectedC] = await Promise.all([
    Review.countDocuments({ isApproved: false, isRejected: { $ne: true } }),
    Review.countDocuments({ isApproved: true }),
    Review.countDocuments({ isRejected: true }),
  ]);

  return jsonOk({
    reviews: out,
    counts: { pending: pendingC, approved: approvedC, rejected: rejectedC },
  });
}
