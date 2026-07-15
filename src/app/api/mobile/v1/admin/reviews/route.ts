import { prisma } from "@/lib/prisma";
import { requireMobile, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mobile/v1/admin/reviews?status=VISIBLE|FLAGGED|REMOVED -> all ratings (moderation)
export async function GET(req: Request) {
  const { user, res } = await requireMobile(req, "MASTER_ADMIN");
  if (res) return res;
  const status = new URL(req.url).searchParams.get("status");
  const where = status && ["VISIBLE", "FLAGGED", "REMOVED"].includes(status)
    ? { status: status as "VISIBLE" | "FLAGGED" | "REMOVED" } : {};
  const ratings = await prisma.rating.findMany({
    where, orderBy: { createdAt: "desc" }, take: 300,
    include: {
      rater: { select: { id: true, fullName: true } },
      ratee: { select: { id: true, fullName: true } },
      lease: { select: { property: { select: { name: true } } } },
    },
  });
  return json({
    ratings: ratings.map((r) => ({
      id: r.id, direction: r.direction, stars: r.stars, feedback: r.feedback, recommend: r.recommend,
      criteria: r.criteria, status: r.status, rater: r.rater, ratee: r.ratee,
      property: r.lease.property.name, createdAt: r.createdAt,
    })),
  });
}
