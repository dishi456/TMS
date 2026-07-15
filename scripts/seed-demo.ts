/**
 * Additive, idempotent DEMO seed — populates Tenant, Landlord and Admin portals
 * with a self-contained demo world. Safe to run on a live database:
 *   - It only ADDS rows (never deletes), using fixed `dx-*` ids + skipDuplicates,
 *     so re-running is a no-op and it never touches your real accounts/data.
 *   - Dedicated demo logins (do not clash with existing accounts):
 *       admin    : demo.admin@leaselord.app
 *       landlord : demo.landlord@leaselord.app
 *       tenant   : demo.tenant@leaselord.app
 *       seeker   : demo.seeker@leaselord.app
 *     Password for all: Demo1234!
 *
 * Run:  DATABASE_URL="<live url>" npx tsx scripts/seed-demo.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const pw = await bcrypt.hash("Demo1234!", 10);
  const now = new Date();
  const m1 = (mo: number) => new Date(now.getFullYear(), now.getMonth() + mo, 1);
  const d = (mo: number, day: number) => new Date(now.getFullYear(), now.getMonth() + mo, day);

  // ---- Users ----
  await prisma.user.createMany({
    skipDuplicates: true,
    data: [
      { id: "dx-admin", email: "demo.admin@leaselord.app", passwordHash: pw, role: "MASTER_ADMIN", status: "ACTIVE", fullName: "Demo Admin", phone: "+91 90000 00001" },
      { id: "dx-l1", email: "demo.landlord@leaselord.app", passwordHash: pw, role: "LANDLORD", status: "ACTIVE", verified: true, fullName: "Rohan Mehta", phone: "+91 90000 00010" },
      { id: "dx-l2", email: "demo.landlord2@leaselord.app", passwordHash: pw, role: "LANDLORD", status: "PENDING", verified: false, fullName: "Priya Nair", phone: "+91 90000 00011" },
      { id: "dx-t1", email: "demo.tenant@leaselord.app", passwordHash: pw, role: "TENANT", status: "ACTIVE", verified: true, fullName: "Aarav Sharma", phone: "+91 90000 00020", landlordId: "dx-l1" },
      { id: "dx-t2", email: "demo.tenant2@leaselord.app", passwordHash: pw, role: "TENANT", status: "ACTIVE", verified: true, fullName: "Diya Patel", phone: "+91 90000 00021", landlordId: "dx-l1" },
      { id: "dx-t3", email: "demo.tenant3@leaselord.app", passwordHash: pw, role: "TENANT", status: "PENDING", verified: false, fullName: "Kabir Singh", phone: "+91 90000 00022", landlordId: "dx-l1" },
      { id: "dx-user", email: "demo.seeker@leaselord.app", passwordHash: pw, role: "USER", status: "ACTIVE", fullName: "Ananya Rao", phone: "+91 90000 00030" },
    ],
  });

  // ---- Properties (under demo landlord dx-l1) ----
  await prisma.property.createMany({
    skipDuplicates: true,
    data: [
      { id: "dx-p1", ref: "900101", landlordId: "dx-l1", name: "Green Meadows 2BHK", type: "APARTMENT", address: "12 Park Avenue, Pune", description: "Bright 2BHK with balcony, parking and lift.", rooms: 2, bathrooms: 2, balconies: 1, floor: 3, totalFloors: 8, areaSqft: 1050, furnishing: "SEMI_FURNISHED", hasLift: true, hasParking: true, powerBackup: true, numberOfUnits: 4, rentAmount: 25000, securityDeposit: 50000, amenities: ["Gym", "Play Area"], availability: "OCCUPIED", verified: true, approved: true, listedPublic: true },
      { id: "dx-p2", ref: "900102", landlordId: "dx-l1", name: "Lakeview Studio", type: "ROOM", address: "8 Lake Road, Pune", description: "Compact furnished studio near the lake.", rooms: 1, bathrooms: 1, floor: 2, totalFloors: 5, areaSqft: 420, furnishing: "FURNISHED", hasLift: true, numberOfUnits: 1, rentAmount: 12000, securityDeposit: 24000, amenities: ["WiFi"], availability: "OCCUPIED", verified: true, approved: true, listedPublic: true },
      { id: "dx-p3", ref: "900103", landlordId: "dx-l1", name: "Sunset Villa 3BHK", type: "HOUSE", address: "45 Sunset Blvd, Lonavala", description: "Spacious villa with garden and parking.", rooms: 3, bathrooms: 3, balconies: 2, areaSqft: 2200, furnishing: "UNFURNISHED", hasParking: true, powerBackup: true, numberOfUnits: 1, rentAmount: 42000, securityDeposit: 84000, amenities: ["Garden", "Garage"], availability: "AVAILABLE", verified: true, approved: true, listedPublic: true },
      { id: "dx-p4", ref: "900104", landlordId: "dx-l1", name: "Maple Court Commercial", type: "COMMERCIAL", address: "5 Maple Court, Mumbai", description: "Ground-floor commercial space with frontage.", bathrooms: 2, areaSqft: 2400, furnishing: "UNFURNISHED", hasLift: true, hasParking: true, numberOfUnits: 2, rentAmount: 60000, securityDeposit: 120000, amenities: ["Street Frontage"], availability: "AVAILABLE", verified: true, approved: true, listedPublic: true },
    ],
  });

  // ---- Leases (active for tenant1; an ended one for ratings) ----
  await prisma.lease.createMany({
    skipDuplicates: true,
    data: [
      { id: "dx-L1", propertyId: "dx-p1", landlordId: "dx-l1", tenantId: "dx-t1", startDate: m1(-3), endDate: m1(9), monthlyRent: 25000, securityDeposit: 50000, maintenanceFee: 1500, noticePeriodDays: 30, terms: "11-month residential lease. Rent due by the 5th.", status: "ACTIVE" },
      { id: "dx-L2", propertyId: "dx-p2", landlordId: "dx-l1", tenantId: "dx-t2", startDate: m1(-5), endDate: m1(7), monthlyRent: 12000, securityDeposit: 24000, terms: "Furnished studio lease.", status: "ACTIVE" },
      { id: "dx-L3", propertyId: "dx-p2", landlordId: "dx-l1", tenantId: "dx-t1", startDate: m1(-20), endDate: m1(-4), monthlyRent: 11000, securityDeposit: 22000, terms: "Prior tenancy (completed).", status: "COMPLETED" },
    ],
  });

  // ---- Invoices ----
  await prisma.invoice.createMany({
    skipDuplicates: true,
    data: [
      { id: "dx-I1a", leaseId: "dx-L1", periodMonth: m1(-2), amount: 25000, dueDate: d(-2, 5), status: "PAID" },
      { id: "dx-I1b", leaseId: "dx-L1", periodMonth: m1(-1), amount: 25000, dueDate: d(-1, 5), status: "PAID" },
      { id: "dx-I1c", leaseId: "dx-L1", periodMonth: m1(0), amount: 25000, dueDate: d(0, 5), status: "PAID" },
      { id: "dx-I1d", leaseId: "dx-L1", periodMonth: m1(1), amount: 25000, dueDate: d(1, 5), status: "PENDING" },
      { id: "dx-I2a", leaseId: "dx-L2", periodMonth: m1(-1), amount: 12000, dueDate: d(-1, 5), status: "OVERDUE" },
      { id: "dx-I2b", leaseId: "dx-L2", periodMonth: m1(0), amount: 12000, dueDate: d(0, 5), status: "PENDING" },
    ],
  });

  // ---- Payments (for paid invoices) ----
  await prisma.payment.createMany({
    skipDuplicates: true,
    data: [
      { id: "dx-PAY1", invoiceId: "dx-I1a", tenantId: "dx-t1", amount: 25000, method: "UPI", status: "SUCCESS", verified: true, paidAt: d(-2, 3) },
      { id: "dx-PAY2", invoiceId: "dx-I1b", tenantId: "dx-t1", amount: 25000, method: "NET_BANKING", status: "SUCCESS", verified: true, paidAt: d(-1, 4) },
      { id: "dx-PAY3", invoiceId: "dx-I1c", tenantId: "dx-t1", amount: 25000, method: "CREDIT_CARD", status: "SUCCESS", verified: true, paidAt: d(0, 2) },
    ],
  });

  // ---- Maintenance ----
  await prisma.maintenanceRequest.createMany({
    skipDuplicates: true,
    data: [
      { id: "dx-MR1", propertyId: "dx-p1", tenantId: "dx-t1", title: "Leaking kitchen tap", description: "The kitchen tap drips continuously.", priority: "MEDIUM", status: "PENDING" },
      { id: "dx-MR2", propertyId: "dx-p1", tenantId: "dx-t1", title: "AC not cooling", description: "Living room AC runs but doesn't cool.", priority: "HIGH", status: "IN_PROGRESS", assignedTo: "CoolAir Services" },
    ],
  });

  // ---- Complaint + thread ----
  await prisma.complaint.createMany({
    skipDuplicates: true,
    data: [
      { id: "dx-C1", tenantId: "dx-t1", propertyId: "dx-p1", subject: "Noisy neighbours", description: "Loud music from the adjacent unit on weekends.", status: "RESPONDED" },
    ],
  });
  await prisma.complaintMessage.createMany({
    skipDuplicates: true,
    data: [
      { id: "dx-CM1", complaintId: "dx-C1", authorId: "dx-l1", body: "Thanks for flagging — I'll put up a notice for all residents." },
    ],
  });

  // ---- Ratings (two-way, for the completed lease dx-L3) ----
  await prisma.rating.createMany({
    skipDuplicates: true,
    data: [
      { id: "dx-RT1", leaseId: "dx-L3", direction: "LANDLORD_TO_TENANT", raterId: "dx-l1", rateeId: "dx-t1", stars: 5, feedback: "Excellent tenant — paid on time, kept the place tidy.", recommend: true, criteria: { rentDiscipline: 5, propertyMaintenance: 5, communication: 5, ruleCompliance: 5, conduct: 5 }, status: "VISIBLE" },
      { id: "dx-RT2", leaseId: "dx-L3", direction: "TENANT_TO_LANDLORD", raterId: "dx-t1", rateeId: "dx-l1", stars: 4, feedback: "Responsive landlord, minor delay on one repair.", recommend: true, criteria: { propertyQuality: 4, maintenanceSupport: 4, communication: 4, transparency: 5, overall: 4 }, status: "VISIBLE" },
    ],
  });

  // ---- Applications (leads on available listings) ----
  await prisma.application.createMany({
    skipDuplicates: true,
    data: [
      { id: "dx-AP1", propertyId: "dx-p3", fullName: "Nathan Cooper", email: "nathan.cooper@example.com", phone: "+91 90000 00701", message: "Interested in Sunset Villa — can move in next month.", status: "PENDING" },
      { id: "dx-AP2", propertyId: "dx-p4", fullName: "Laura Bennett", email: "laura.bennett@example.com", phone: "+91 90000 00702", message: "Looking for commercial space for a small studio.", status: "PENDING" },
    ],
  });

  // ---- Visit requests ----
  await prisma.visit.createMany({
    skipDuplicates: true,
    data: [
      { id: "dx-VS1", propertyId: "dx-p3", fullName: "Meera Joshi", email: "meera.joshi@example.com", phone: "+91 90000 00710", preferredAt: d(0, 28), message: "Would love to tour the villa this weekend.", status: "PENDING" },
    ],
  });

  // ---- Public enquiry (guest chat) ----
  const inq = await prisma.propertyInquiry.findUnique({ where: { id: "dx-IQ1" } }).catch(() => null);
  if (!inq) {
    await prisma.propertyInquiry.create({
      data: {
        id: "dx-IQ1", propertyId: "dx-p4", landlordId: "dx-l1",
        guestName: "Rahul Mehta", guestPhone: "+91 90000 00990", guestEmail: "rahul.mehta@example.com",
        messages: {
          create: [
            { fromGuest: true, body: "Hi, is Maple Court still available for a small cafe?" },
            { fromGuest: false, body: "Hi Rahul, yes it is! Ground-floor with street frontage. Want to schedule a viewing?", readByGuest: true },
            { fromGuest: true, body: "Great — could I come by this weekend?" },
          ],
        },
      },
    });
  }

  // ---- Notifications across roles ----
  await prisma.notification.createMany({
    skipDuplicates: true,
    data: [
      { id: "dx-N1", userId: "dx-t1", type: "rent_reminder", title: "Rent reminder", body: "Your rent of ₹25,000 for Green Meadows 2BHK is due on the 5th.", link: "/tenant/payments", read: false },
      { id: "dx-N2", userId: "dx-t1", type: "maintenance", title: "Maintenance update", body: "Your request 'AC not cooling' is now In Progress.", link: "/tenant/maintenance", read: false },
      { id: "dx-N3", userId: "dx-l1", type: "application", title: "New rental application", body: "Nathan Cooper applied for Sunset Villa 3BHK.", link: "/landlord/applications", read: false },
      { id: "dx-N4", userId: "dx-l1", type: "payment", title: "Rent received", body: "Aarav Sharma paid ₹25,000 for Green Meadows 2BHK.", link: "/landlord/rent", read: true },
      { id: "dx-N5", userId: "dx-admin", type: "account", title: "Landlord awaiting approval", body: "Priya Nair registered and is pending approval.", link: "/master-admin/users", read: false },
    ],
  });

  // ---- Audit log (admin activity) ----
  await prisma.auditLog.createMany({
    skipDuplicates: true,
    data: [
      { id: "dx-AU1", actorId: "dx-admin", action: "property.approve", entity: "Property", entityId: "dx-p1" },
      { id: "dx-AU2", actorId: "dx-l1", action: "tenant.add", entity: "User", entityId: "dx-t1" },
      { id: "dx-AU3", actorId: "dx-l1", action: "payment.record", entity: "Payment", entityId: "dx-PAY3" },
    ],
  });

  console.log("✅ Demo data seeded. Logins (password: Demo1234!):");
  console.log("   admin    : demo.admin@leaselord.app");
  console.log("   landlord : demo.landlord@leaselord.app");
  console.log("   tenant   : demo.tenant@leaselord.app");
  console.log("   seeker   : demo.seeker@leaselord.app");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
