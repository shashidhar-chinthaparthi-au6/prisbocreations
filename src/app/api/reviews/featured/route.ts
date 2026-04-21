import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { jsonOk } from "@/lib/api/response";
import { Review } from "@/lib/models/Review";
import { Product } from "@/lib/models/Product";
import { User } from "@/lib/models/User";

export async function GET() {
  await connectDb();
  const rows = await Review.find({
    isApproved: true,
    isRejected: { $ne: true },
    isVerified: true,
    rating: { $gte: 4 },
  })
    .sort({ helpfulCount: -1, createdAt: -1 })
    .limit(3)
    .populate<{ userId?: { name?: string; avatarInitials?: string } | null }>({
      path: "userId",
      model: User,
      select: "name avatarInitials",
    })
    .lean();

  const productIds = [...new Set(rows.map((r) => String(r.productId)))];
  const oids = productIds
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const products = await Product.find({ _id: { $in: oids } })
    .select("name slug")
    .lean();
  const pmap = new Map(products.map((p) => [String(p._id), p]));

  const out = rows.map((r) => {
    const p = pmap.get(String(r.productId));
    const u = r.userId && typeof r.userId === "object" && "name" in r.userId ? r.userId : null;
    const name =
      u?.name?.trim() ||
      r.guestName?.trim() ||
      "Customer";
    const initials =
      u?.avatarInitials?.trim() ||
      name
        .split(/\s+/)
        .filter(Boolean)
        .map((x) => x[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() ||
      "C";
    return {
      id: String(r._id),
      rating: r.rating,
      body: r.body,
      reviewerName: name,
      reviewerInitials: initials,
      productName: p?.name ?? "Product",
      productSlug: p?.slug ?? "",
    };
  });

  return jsonOk({ reviews: out });
}
