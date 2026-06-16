import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const issues = [];
const add = (cat, msg) => issues.push(`[${cat}] ${msg}`);

const users = await p.user.findMany();
const byId = Object.fromEntries(users.map((u) => [u.id, u]));
const props = await p.property.findMany();
const propById = Object.fromEntries(props.map((x) => [x.id, x]));
const leases = await p.lease.findMany();
const invoices = await p.invoice.findMany();
const payments = await p.payment.findMany();
const ratings = await p.rating.findMany();
const maint = await p.maintenanceRequest.findMany();
const complaints = await p.complaint.findMany();
const visits = await p.visit.findMany();
const apps = await p.application.findMany();

for (const u of users) {
  if (u.role === "TENANT" && !u.landlordId) add("user", `tenant ${u.fullName} has no managing landlord`);
  if (u.role === "LANDLORD" && u.landlordId) add("user", `landlord ${u.fullName} unexpectedly has landlordId`);
  if (u.role === "TENANT" && u.landlordId && byId[u.landlordId]?.role !== "LANDLORD") add("user", `tenant ${u.fullName} landlordId is not a landlord`);
}

for (const l of leases) {
  const prop = propById[l.propertyId];
  if (!prop) { add("lease", `lease ${l.id} -> missing property`); continue; }
  if (l.landlordId !== prop.landlordId) add("lease", `lease ${l.id}: landlord (${byId[l.landlordId]?.fullName}) != property owner (${byId[prop.landlordId]?.fullName}) for ${prop.name}`);
  if (byId[l.tenantId]?.role !== "TENANT") add("lease", `lease ${l.id}: tenant is not a TENANT`);
  if (byId[l.landlordId]?.role !== "LANDLORD") add("lease", `lease ${l.id}: landlord is not a LANDLORD`);
  const t = byId[l.tenantId];
  if (t && t.landlordId && t.landlordId !== l.landlordId) add("lease", `lease ${l.id}: tenant ${t.fullName} managed by ${byId[t.landlordId]?.fullName} but lease landlord is ${byId[l.landlordId]?.fullName}`);
  if (Number(l.monthlyRent) <= 0) add("lease", `lease ${l.id}: monthlyRent <= 0`);
  if (l.endDate <= l.startDate) add("lease", `lease ${l.id}: endDate <= startDate`);
}

for (const prop of props) {
  const active = leases.filter((l) => l.propertyId === prop.id && (l.status === "ACTIVE" || l.status === "RENEWED"));
  if (active.length > prop.numberOfUnits) add("occupancy", `${prop.name}: ${active.length} active leases > ${prop.numberOfUnits} units`);
  if (prop.availability === "AVAILABLE" && active.length > 0) add("occupancy", `${prop.name}: AVAILABLE but has ${active.length} active lease(s)`);
  if (prop.availability === "OCCUPIED" && active.length === 0) add("occupancy", `${prop.name}: OCCUPIED but has no active lease`);
}

for (const inv of invoices) {
  const l = leases.find((x) => x.id === inv.leaseId);
  if (!l) { add("invoice", `invoice ${inv.id} -> missing lease`); continue; }
  const pays = payments.filter((pp) => pp.invoiceId === inv.id);
  const paidSum = pays.filter((pp) => pp.status === "SUCCESS").reduce((s, pp) => s + Number(pp.amount), 0);
  if (inv.status === "PAID" && paidSum < Number(inv.amount)) add("invoice", `invoice ${inv.id} (${propById[l.propertyId]?.name}) PAID but successful payments ${paidSum} < amount ${inv.amount}`);
  if (inv.status !== "PAID" && Number(inv.amount) > 0 && paidSum >= Number(inv.amount)) add("invoice", `invoice ${inv.id} fully paid (${paidSum}) but status=${inv.status}`);
  for (const pp of pays) if (pp.tenantId !== l.tenantId) add("payment", `payment ${pp.id}: tenant != invoice lease tenant`);
}

for (const r of ratings) {
  const l = leases.find((x) => x.id === r.leaseId);
  if (!l) { add("rating", `rating ${r.id} -> missing lease`); continue; }
  if (r.direction === "TENANT_TO_LANDLORD") {
    if (r.raterId !== l.tenantId) add("rating", `rating ${r.id}: T->L rater should be lease tenant`);
    if (r.rateeId !== l.landlordId) add("rating", `rating ${r.id}: T->L ratee should be lease landlord`);
  } else {
    if (r.raterId !== l.landlordId) add("rating", `rating ${r.id}: L->T rater should be lease landlord`);
    if (r.rateeId !== l.tenantId) add("rating", `rating ${r.id}: L->T ratee should be lease tenant`);
  }
  if (r.stars < 1 || r.stars > 5) add("rating", `rating ${r.id}: stars out of range (${r.stars})`);
}

for (const m of maint) {
  if (!propById[m.propertyId]) add("maintenance", `request ${m.id} -> missing property`);
  if (byId[m.tenantId]?.role !== "TENANT") add("maintenance", `request ${m.id}: requester not a tenant`);
}
for (const c of complaints) {
  if (!propById[c.propertyId]) add("complaint", `complaint ${c.id} -> missing property`);
  if (byId[c.tenantId]?.role !== "TENANT") add("complaint", `complaint ${c.id}: complainant not a tenant`);
}
for (const v of visits) if (!propById[v.propertyId]) add("visit", `visit ${v.id} -> missing property`);
for (const a of apps) if (!propById[a.propertyId]) add("application", `application ${a.id} -> missing property`);

console.log("=== COUNTS ===");
console.log({ users: users.length, props: props.length, leases: leases.length, invoices: invoices.length, payments: payments.length, ratings: ratings.length, maintenance: maint.length, complaints: complaints.length, visits: visits.length, applications: apps.length });
console.log("\n=== ISSUES (" + issues.length + ") ===");
issues.forEach((i) => console.log(" • " + i));
if (issues.length === 0) console.log(" none");
await p.$disconnect();
