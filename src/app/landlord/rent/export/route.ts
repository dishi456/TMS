import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "LANDLORD") {
    return new Response("Unauthorized", { status: 401 });
  }

  const payments = await prisma.payment.findMany({
    where: { invoice: { lease: { landlordId: session.user.id } } },
    include: {
      tenant: { select: { fullName: true } },
      invoice: { include: { lease: { include: { property: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const header = ["Date", "Tenant", "Property", "Period", "Amount", "Method", "Status"];
  const rows = payments.map((p) => [
    (p.paidAt ?? p.createdAt).toISOString().slice(0, 10),
    p.tenant.fullName,
    p.invoice.lease.property.name,
    p.invoice.periodMonth.toISOString().slice(0, 7),
    p.amount.toString(),
    p.method,
    p.status,
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rent-report.csv"`,
    },
  });
}
