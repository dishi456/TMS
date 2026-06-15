// Verifies tiered rent reminders. Usage:
//   node scripts/test-reminders.mjs setup    → create invoices due in +7/+3/0/-2 days
//   node scripts/test-reminders.mjs cleanup  → remove the test invoices
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const TEST_MONTHS = [0, 1, 2, 3]; // Jan–Apr 2019 period keys reserved for the test
const mode = process.argv[2] ?? "setup";

const lease = await prisma.lease.findFirst({ where: { status: { in: ["ACTIVE", "RENEWED"] } } });
if (!lease) throw new Error("no active lease");

if (mode === "cleanup") {
  const r = await prisma.invoice.deleteMany({
    where: { leaseId: lease.id, periodMonth: { in: TEST_MONTHS.map((m) => new Date(2019, m, 1)) } },
  });
  console.log("removed test invoices:", r.count);
  await prisma.$disconnect();
} else {
  // make sure the tenant has a phone so the SMS path runs
  await prisma.user.update({ where: { id: lease.tenantId }, data: { phone: "+15555550123" } });

  const now = new Date();
  const day = (off) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + off);
  const cases = [
    { month: 0, due: 7 },
    { month: 1, due: 3 },
    { month: 2, due: 0 },
    { month: 3, due: -2 },
  ];
  for (const c of cases) {
    const periodMonth = new Date(2019, c.month, 1);
    await prisma.invoice.upsert({
      where: { leaseId_periodMonth: { leaseId: lease.id, periodMonth } },
      update: { dueDate: day(c.due), status: "PENDING", remindersSent: [] },
      create: { leaseId: lease.id, periodMonth, amount: 1000, dueDate: day(c.due), status: "PENDING" },
    });
  }
  console.log("seeded test invoices for lease", lease.id, "tenant", lease.tenantId);
  await prisma.$disconnect();
}
