import { connectDb } from "@/lib/db";
import { jsonOk } from "@/lib/api/response";
import { getOptionalAuth } from "@/lib/api/auth";
import { Review } from "@/lib/models/Review";
import { ReviewVote } from "@/lib/models/ReviewVote";
import { User } from "@/lib/models/User";
import mongoose from "mongoose";

type SortKey = "recent" | "helpful" | "highest" | "lowest";

function reviewerFrom(
  r: {
    guestName?: string;
    guestEmail?: string | null;
  },
  user: { name?: string; avatarInitials?: string } | null,
): { name: string; initials: string } {
  if (user?.name?.trim()) {
    const n = user.name.trim();
    const ini =
      user.avatarInitials?.trim() ||
      n
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() ||
      "C";
    return { name: n, initials: ini };
  }
  const g = r.guestName?.trim();
  if (g) {
    const parts = g.split(/\s+/).filter(Boolean);
    const ini =
      parts.length >= 2
        ? `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase()
        : (g[0] ?? "A").toUpperCase();
    return { name: g, initials: ini.slice(0, 2) };
  }
  return { name: "Anonymous", initials: "A" };
}

export async function GET(req: Request, ctx: { params: Promise<{ productId: string }> }) {
  await connectDb();
  const { productId } = await ctx.params;
  if (!mongoose.isValidObjectId(productId)) {
    return jsonOk({
      reviews: [],
      total: 0,
      avgRating: 0,
      breakdown: [5, 4, 3, 2, 1].map((star) => ({ star, count: 0 })),
    });
  }

  const url = new URL(req.url);
  const sort = (url.searchParams.get("sort") ?? "recent") as SortKey;
  const starsRaw = url.searchParams.get("stars");
  const photosOnly = url.searchParams.get("photos") === "true";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(30, Math.max(1, Number(url.searchParams.get("limit") ?? "5") || 5));

  const pid = new mongoose.Types.ObjectId(productId);

  const where: Record<string, unknown> = {
    productId: pid,
    isApproved: true,
    isRejected: { $ne: true },
  };
  if (starsRaw && starsRaw !== "all") {
    const n = Number(starsRaw);
    if (n >= 1 && n <= 5) where.rating = n;
  }
  if (photosOnly) where["photos.0"] = { $exists: true };

  const orderBy: Record<string, 1 | -1> =
    sort === "helpful"
      ? { helpfulCount: -1, createdAt: -1 }
      : sort === "highest"
        ? { rating: -1, createdAt: -1 }
        : sort === "lowest"
          ? { rating: 1, createdAt: -1 }
          : { createdAt: -1 };

  const [rows, total, agg] = await Promise.all([
    Review.find(where)
      .sort(orderBy)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate<{ userId?: { name?: string; avatarInitials?: string } | null }>({
        path: "userId",
        model: User,
        select: "name avatarInitials",
      })
      .lean(),
    Review.countDocuments(where),
    Review.aggregate<{ _id: number; c: number }>([
      { $match: { productId: pid, isApproved: true, isRejected: { $ne: true } } },
      { $group: { _id: "$rating", c: { $sum: 1 } } },
    ]),
  ]);

  const auth = await getOptionalAuth();
  let voteMap = new Map<string, boolean>();
  if (auth?.sub && mongoose.isValidObjectId(auth.sub) && rows.length) {
    const rids = rows.map((r) => r._id as mongoose.Types.ObjectId);
    const votes = await ReviewVote.find({
      reviewId: { $in: rids },
      userId: new mongoose.Types.ObjectId(auth.sub),
    })
      .select("reviewId isHelpful")
      .lean();
    voteMap = new Map(votes.map((v) => [String(v.reviewId), v.isHelpful]));
  }

  const breakdownMap = new Map<number, number>();
  let sumWeighted = 0;
  let totalApproved = 0;
  for (const a of agg) {
    const rating = a._id;
    const c = a.c;
    breakdownMap.set(rating, c);
    sumWeighted += rating * c;
    totalApproved += c;
  }

  const avgRating = totalApproved > 0 ? Math.round((sumWeighted / totalApproved) * 10) / 10 : 0;

  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: breakdownMap.get(star) ?? 0,
  }));

  return jsonOk({
    reviews: rows.map((r) => {
      const u = r.userId && typeof r.userId === "object" && "name" in r.userId ? r.userId : null;
      const reviewer = reviewerFrom(r, u);
      return {
        id: String(r._id),
        rating: r.rating,
        title: r.title || null,
        body: r.body,
        photos: Array.isArray(r.photos) ? r.photos : [],
        variantName: r.variantName || null,
        isVerified: Boolean(r.isVerified),
        helpfulCount: r.helpfulCount ?? 0,
        notHelpfulCount: r.notHelpfulCount ?? 0,
        adminReply: r.adminReply || null,
        adminRepliedAt: r.adminRepliedAt ?? null,
        createdAt: r.createdAt,
        reviewer,
        viewerVote: voteMap.has(String(r._id)) ? voteMap.get(String(r._id))! : null,
      };
    }),
    total,
    avgRating,
    breakdown,
    totalApproved,
  });
}
