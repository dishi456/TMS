import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { roleHome, type Role } from "@/lib/roles";
import { Nav } from "@/app/_landing/Nav";
import { SiteFooter } from "@/components/SiteFooter";
import { formatNumber } from "@/lib/format";
import { ReviewsExplorer, type ReviewItem } from "./ReviewsExplorer";

export const metadata: Metadata = {
  title: "Reviews",
  description: "Public landlord and tenant reviews on Lease Lord.",
};
export const dynamic = "force-dynamic";

// Privacy: show first name + last initial for raters.
function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

type RawRow = {
  id: string;
  stars: number;
  feedback: string | null;
  recommend: boolean;
  createdAt: Date;
  rater: { fullName: string };
  ratee: { fullName: string };
  lease: { property: { name: string; address: string } };
};

function toItem(r: RawRow): ReviewItem {
  return {
    id: r.id,
    stars: r.stars,
    feedback: r.feedback,
    recommend: r.recommend,
    rateeName: r.ratee.fullName,
    by: shortName(r.rater.fullName),
    propertyName: r.lease.property.name,
    address: r.lease.property.address,
    date: r.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
  };
}

export default async function PublicReviewsPage() {
  const include = {
    rater: { select: { fullName: true } },
    ratee: { select: { fullName: true } },
    lease: { include: { property: { select: { name: true, address: true } } } },
  } as const;

  const [landlordReviews, tenantReviews, llAgg, tnAgg] = await Promise.all([
    prisma.rating.findMany({
      where: { status: "VISIBLE", direction: "TENANT_TO_LANDLORD" },
      include,
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.rating.findMany({
      where: { status: "VISIBLE", direction: "LANDLORD_TO_TENANT" },
      include,
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.rating.aggregate({ _avg: { stars: true }, _count: true, where: { status: "VISIBLE", direction: "TENANT_TO_LANDLORD" } }),
    prisma.rating.aggregate({ _avg: { stars: true }, _count: true, where: { status: "VISIBLE", direction: "LANDLORD_TO_TENANT" } }),
  ]);

  const totalCount = llAgg._count + tnAgg._count;
  const session = await auth();
  const home = session?.user ? (roleHome[session.user.role as Role] ?? "/account") : null;

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
    <Nav variant="solid" account={home} />
    <main className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-blue-600 via-blue-600 to-sky-500">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-12 text-center sm:py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur">
            <span className="text-amber-300">★</span> Trusted by our community
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">Community Reviews</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-blue-50 sm:text-base">
            Transparent, two-way reviews between landlords and tenants — building trust, one rental at a time.
          </p>
          <p className="mt-5 text-sm font-medium text-blue-100">
            <span className="text-2xl font-bold text-white">{formatNumber(totalCount)}</span> verified reviews and counting
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <ReviewsExplorer
          landlord={landlordReviews.map(toItem)}
          tenant={tenantReviews.map(toItem)}
          llAvg={llAgg._avg.stars}
          llCount={llAgg._count}
          tnAvg={tnAgg._avg.stars}
          tnCount={tnAgg._count}
        />
      </div>
    </main>
    <SiteFooter />
    </div>
  );
}
