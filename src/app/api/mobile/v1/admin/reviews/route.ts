import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMobileUser, json } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["VISIBLE", "FLAGGED", "REMOVED"];

// GET /api/mobile/v1/admin/reviews?status= → ratings for moderation.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["MASTER_ADMIN"]);
  if (user instanceof Response) return user;
  const status = (new URL(req.url).searchParams.get("status") || "").toUpperCase();

  const where: Prisma.RatingWhereInput = STATUSES.includes(status) ? { status: status as Prisma.RatingWhereInput["status"] } : {};

  const items = await prisma.rating.findMany({
    where, orderBy: { createdAt: "desc" }, take: 100,
    select: {
      id: true, stars: true, feedback: true, direction: true, status: true, createdAt: true,
      rater: { select: { fullName: true, role: true } },
      ratee: { select: { fullName: true } },
    },
  });

  return json({
    items: items.map((r) => ({
      id: r.id, stars: r.stars, feedback: r.feedback, direction: r.direction, status: r.status,
      createdAt: r.createdAt.toISOString(), from: r.rater.fullName, fromRole: r.rater.role, to: r.ratee.fullName,
    })),
  });
}
