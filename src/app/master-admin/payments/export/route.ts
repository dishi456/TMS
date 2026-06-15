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
  if (!session?.user || session.user.role !== "MASTER_ADMIN") {
    return new Response("Unauthorized", { status: 401 });
  }

  const payments = await prisma.payment.findMany({
    include: {
      tenant: { select: { fullName: true, email: true } },
      invoice: { include: { lease: { include: { property: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const header = ["Date", "Tenant", "Email", "Property", "Period", "Amount", "Method", "Status", "Verified", "PaymentId"];
  const rows = payments.map((p) => [
    (p.paidAt ?? p.createdAt).toISOString().slice(0, 10),
    p.tenant.fullName,
    p.tenant.email,
    p.invoice.lease.property.name,
    p.invoice.periodMonth.toISOString().slice(0, 7),
    p.amount.toString(),
    p.method,
    p.status,
    p.verified ? "yes" : "no",
    p.id,
  ]);

  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payments-report.csv"`,
    },
  });
}
