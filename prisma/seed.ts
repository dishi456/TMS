import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";

const prisma = new PrismaClient();

const STORAGE = path.join(process.cwd(), "storage");

// Generate a labelled placeholder image and write it to local storage.
async function saveImg(key: string, label: string, bg: string): Promise<number> {
  const safe = label.replace(/[<>&]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="${bg}"/><text x="400" y="265" font-family="Arial" font-size="38" fill="#ffffff" text-anchor="middle">${safe}</text></svg>`;
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  const full = path.join(STORAGE, key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buf);
  return buf.length;
}

let docSeq = 0;
async function imgDoc(opts: {
  ownerId: string;
  type: "PHOTO" | "PROPERTY_PROOF" | "GOVERNMENT_ID" | "LEASE" | "OTHER";
  label: string;
  bg: string;
  propertyId?: string | null;
  leaseId?: string | null;
}) {
  const key = `seed/${opts.type}-${++docSeq}.png`;
  const size = await saveImg(key, opts.label, opts.bg);
  return prisma.document.create({
    data: {
      ownerId: opts.ownerId,
      propertyId: opts.propertyId ?? null,
      leaseId: opts.leaseId ?? null,
      type: opts.type,
      storageKey: key,
      fileName: `${opts.label}.png`,
      contentType: "image/png",
      sizeBytes: size,
      label: `${opts.label}.png`,
    },
  });
}

// Real demo property photo via Lorem Picsum, with an offline fallback to a
// labelled placeholder so the seed still works without a network connection.
async function savePhoto(key: string, seed: string, label: string, bg: string): Promise<number> {
  let buf: Buffer | null = null;
  try {
    const r = await fetch(`https://picsum.photos/seed/${encodeURIComponent(seed)}/900/600`);
    if (r.ok) buf = Buffer.from(await r.arrayBuffer());
  } catch {
    /* offline — fall back to a placeholder below */
  }
  if (!buf) {
    const safe = label.replace(/[<>&]/g, "");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="${bg}"/><text x="450" y="315" font-family="Arial" font-size="40" fill="#ffffff" text-anchor="middle">${safe}</text></svg>`;
    buf = await sharp(Buffer.from(svg)).jpeg().toBuffer();
  }
  const full = path.join(STORAGE, key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buf);
  return buf.length;
}

async function propPhoto(pid: string, owner: string, idx: number, label: string) {
  const key = `properties/${pid}/seed-${++docSeq}.jpg`;
  const size = await savePhoto(key, `${pid}-${idx}`, label, "#2563EB");
  return prisma.document.create({
    data: { ownerId: owner, propertyId: pid, type: "PHOTO", storageKey: key, fileName: `${label}.jpg`, contentType: "image/jpeg", sizeBytes: size, label },
  });
}

const now = new Date();
const m1 = (off: number) => new Date(now.getFullYear(), now.getMonth() + off, 1); // first of month
const d = (off: number, day: number) => new Date(now.getFullYear(), now.getMonth() + off, day);

async function main() {
  const pw = await bcrypt.hash("Password123!", 10);

  // ---- Clean domain data (keep schema; rebuild a deterministic demo set) ----
  await prisma.auditLog.deleteMany();
  await prisma.message.deleteMany();
  await prisma.propertyInquiry.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.application.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.complaintMessage.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.document.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.lease.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.property.deleteMany();
  await prisma.user.deleteMany();
  // Clear previously-seeded files so re-seeding stays clean.
  await fs.rm(path.join(STORAGE, "seed"), { recursive: true, force: true });

  // ---- Users ----
  // Keep the familiar demo logins (admin@/landlord@/tenant@) as the primary accounts.
  await prisma.user.createMany({
    data: [
      { id: "u-admin", email: "admin@tms.local", passwordHash: pw, role: Role.MASTER_ADMIN, status: "ACTIVE", fullName: "Master Admin", phone: "+1 202 555 0100" },

      // Landlords
      { id: "u-l1", email: "landlord@tms.local", passwordHash: pw, role: Role.LANDLORD, status: "ACTIVE", verified: true, fullName: "Michael Anderson", phone: "+1 415 555 0111" },
      { id: "u-l2", email: "sarah.landlord@tms.local", passwordHash: pw, role: Role.LANDLORD, status: "ACTIVE", verified: true, fullName: "Sarah Johnson", phone: "+1 415 555 0112" },
      { id: "u-l3", email: "david.landlord@tms.local", passwordHash: pw, role: Role.LANDLORD, status: "PENDING", verified: false, fullName: "David Chen", phone: "+1 415 555 0113" },

      // Tenants (managed by a landlord)
      { id: "u-t1", email: "tenant@tms.local", passwordHash: pw, role: Role.TENANT, status: "ACTIVE", verified: true, fullName: "Emily Davis", phone: "+1 646 555 0201", governmentId: "GID-DAVIS-2291", emergencyContact: "Robert Davis +1 646 555 0301", landlordId: "u-l1", chatContactConfirmed: true },
      { id: "u-t2", email: "james.tenant@tms.local", passwordHash: pw, role: Role.TENANT, status: "ACTIVE", verified: true, fullName: "James Wilson", phone: "+1 646 555 0202", governmentId: "GID-WILSON-7741", emergencyContact: "Mary Wilson +1 646 555 0302", landlordId: "u-l1" },
      { id: "u-t3", email: "olivia.tenant@tms.local", passwordHash: pw, role: Role.TENANT, status: "ACTIVE", verified: true, fullName: "Olivia Brown", phone: "+1 646 555 0203", governmentId: "GID-BROWN-1180", emergencyContact: "Tom Brown +1 646 555 0303", landlordId: "u-l1" },
      { id: "u-t4", email: "daniel.tenant@tms.local", passwordHash: pw, role: Role.TENANT, status: "ACTIVE", verified: false, fullName: "Daniel Martinez", phone: "+1 646 555 0204", governmentId: "GID-MART-5562", emergencyContact: "Ana Martinez +1 646 555 0304", landlordId: "u-l2" },
      { id: "u-t5", email: "sophia.tenant@tms.local", passwordHash: pw, role: Role.TENANT, status: "PENDING", verified: false, fullName: "Sophia Garcia", phone: "+1 646 555 0205", governmentId: "GID-GARCIA-9034", landlordId: "u-l1" },
      { id: "u-t6", email: "william.tenant@tms.local", passwordHash: pw, role: Role.TENANT, status: "ACTIVE", verified: true, fullName: "William Lee", phone: "+1 646 555 0206", governmentId: "GID-LEE-4408", emergencyContact: "Grace Lee +1 646 555 0306", landlordId: "u-l1" },
      // Public "seeker" account — browses & chats; a landlord can convert to a tenant.
      { id: "u-user1", email: "seeker@tms.local", passwordHash: pw, role: Role.USER, status: "ACTIVE", fullName: "Alex Carter", phone: "+1 312 555 0440" },
    ],
  });

  // ---- Properties ----
  await prisma.property.createMany({
    data: [
      { id: "p1", landlordId: "u-l1", name: "Green Meadows Apartment", type: "APARTMENT", address: "12 Park Avenue, New York, NY", description: "2BHK with balcony and parking", rooms: 2, bathrooms: 2, balconies: 1, floor: 3, totalFloors: 8, areaSqft: 1050, furnishing: "SEMI_FURNISHED", hasLobby: true, hasParking: true, hasLift: true, powerBackup: true, numberOfUnits: 4, rentAmount: 2500, securityDeposit: 5000, amenities: ["Gym", "Children's Play Area"], availability: "OCCUPIED", verified: true, approved: true },
      { id: "p2", landlordId: "u-l1", name: "Lakeview Studio", type: "ROOM", address: "8 Lake Road, Chicago, IL", description: "Compact furnished studio near the lake", rooms: 1, bathrooms: 1, balconies: 0, floor: 2, totalFloors: 5, areaSqft: 420, furnishing: "FURNISHED", hasLobby: false, hasParking: false, hasLift: true, powerBackup: false, numberOfUnits: 1, rentAmount: 1200, securityDeposit: 2400, amenities: ["WiFi"], availability: "OCCUPIED", verified: true, approved: true },
      { id: "p3", landlordId: "u-l1", name: "Sunset Villa", type: "HOUSE", address: "45 Sunset Blvd, Los Angeles, CA", description: "Spacious 4BR villa with garden", rooms: 4, bathrooms: 3, balconies: 2, floor: 0, totalFloors: 2, areaSqft: 3200, furnishing: "UNFURNISHED", hasLobby: false, hasParking: true, hasLift: false, powerBackup: true, numberOfUnits: 1, rentAmount: 4200, securityDeposit: 8400, amenities: ["Garden", "Garage", "Pool"], availability: "OCCUPIED", verified: true, approved: true },
      { id: "p4", landlordId: "u-l2", name: "Downtown Loft", type: "APARTMENT", address: "300 Pine St, Seattle, WA", description: "Modern loft in the heart of downtown", rooms: 2, bathrooms: 2, balconies: 1, floor: 12, totalFloors: 20, areaSqft: 1300, furnishing: "FURNISHED", hasLobby: true, hasParking: true, hasLift: true, powerBackup: true, numberOfUnits: 6, rentAmount: 3000, securityDeposit: 6000, amenities: ["Rooftop", "Concierge", "Gym"], availability: "OCCUPIED", verified: true, approved: true },
      { id: "p5", landlordId: "u-l2", name: "Riverside Condo", type: "APARTMENT", address: "77 River Walk, Austin, TX", description: "Riverfront condo, pending verification", rooms: 3, bathrooms: 2, balconies: 2, floor: 5, totalFloors: 10, areaSqft: 1600, furnishing: "SEMI_FURNISHED", hasLobby: true, hasParking: true, hasLift: true, powerBackup: false, numberOfUnits: 3, rentAmount: 2800, securityDeposit: 5600, amenities: ["River View"], availability: "AVAILABLE", verified: false, approved: false },
      { id: "p6", landlordId: "u-l1", name: "Maple Court", type: "COMMERCIAL", address: "5 Maple Court, Boston, MA", description: "Ground-floor commercial space", rooms: 0, bathrooms: 2, balconies: 0, floor: 0, totalFloors: 4, areaSqft: 2400, furnishing: "UNFURNISHED", hasLobby: true, hasParking: true, hasLift: true, powerBackup: true, numberOfUnits: 2, rentAmount: 5000, securityDeposit: 10000, amenities: ["Street Frontage"], availability: "AVAILABLE", verified: true, approved: true },
      { id: "p7", landlordId: "u-l2", name: "Cedar Heights", type: "APARTMENT", address: "21 Cedar Lane, Denver, CO", description: "Bright 2BHK with mountain views and a modern kitchen.", rooms: 2, bathrooms: 2, balconies: 1, floor: 6, totalFloors: 12, areaSqft: 1150, furnishing: "SEMI_FURNISHED", hasLobby: true, hasParking: true, hasLift: true, powerBackup: true, numberOfUnits: 5, rentAmount: 2300, securityDeposit: 4600, amenities: ["Gym", "Rooftop"], availability: "AVAILABLE", verified: true, approved: true },
      { id: "p8", landlordId: "u-l1", name: "Orchard Greens", type: "HOUSE", address: "9 Orchard St, Portland, OR", description: "Family 3BR home with a private backyard and garage.", rooms: 3, bathrooms: 2, balconies: 1, floor: 0, totalFloors: 2, areaSqft: 1900, furnishing: "UNFURNISHED", hasLobby: false, hasParking: true, hasLift: false, powerBackup: false, numberOfUnits: 1, rentAmount: 2700, securityDeposit: 5400, amenities: ["Garden", "Garage"], availability: "AVAILABLE", verified: true, approved: true },
      { id: "p9", landlordId: "u-l2", name: "City Square Studio", type: "ROOM", address: "500 Market St, San Francisco, CA", description: "Cozy furnished studio in the heart of downtown.", rooms: 1, bathrooms: 1, balconies: 0, floor: 8, totalFloors: 15, areaSqft: 480, furnishing: "FURNISHED", hasLobby: true, hasParking: false, hasLift: true, powerBackup: true, numberOfUnits: 1, rentAmount: 1800, securityDeposit: 3600, amenities: ["WiFi", "Laundry"], availability: "AVAILABLE", verified: true, approved: true },
      { id: "p10", landlordId: "u-l1", name: "Bayview Residency", type: "APARTMENT", address: "14 Harbor Dr, San Diego, CA", description: "Spacious 3BHK with a sea-facing balcony.", rooms: 3, bathrooms: 2, balconies: 2, floor: 9, totalFloors: 18, areaSqft: 1500, furnishing: "SEMI_FURNISHED", hasLobby: true, hasParking: true, hasLift: true, powerBackup: true, numberOfUnits: 4, rentAmount: 3200, securityDeposit: 6400, amenities: ["Sea View", "Gym", "Pool"], availability: "AVAILABLE", verified: true, approved: true },
    ],
  });

  // Allocate public 6-digit reference codes (deterministic for the demo).
  const refMap: Record<string, string> = { p1: "204101", p2: "204102", p3: "204103", p4: "204104", p5: "204105", p6: "204106", p7: "204107", p8: "204108", p9: "204109", p10: "204110" };
  for (const [pid, ref] of Object.entries(refMap)) {
    await prisma.property.update({ where: { id: pid }, data: { ref } });
  }

  // ---- Leases ----
  await prisma.lease.createMany({
    data: [
      { id: "L1", propertyId: "p1", landlordId: "u-l1", tenantId: "u-t1", startDate: m1(-3), endDate: m1(9), monthlyRent: 2500, securityDeposit: 5000, maintenanceFee: 200, noticePeriodDays: 30, terms: "12-month residential lease. Rent due by the 5th. No subletting.", status: "ACTIVE" },
      { id: "L2", propertyId: "p2", landlordId: "u-l1", tenantId: "u-t2", startDate: m1(-5), endDate: m1(7), monthlyRent: 1200, securityDeposit: 2400, terms: "12-month lease, furnished. Pets not allowed.", status: "ACTIVE" },
      { id: "L3", propertyId: "p3", landlordId: "u-l1", tenantId: "u-t3", startDate: m1(-11), endDate: d(0, 20), monthlyRent: 4200, securityDeposit: 8400, maintenanceFee: 350, noticePeriodDays: 60, terms: "Renewed lease. Garden upkeep by tenant.", status: "RENEWED" },
      { id: "L4", propertyId: "p4", landlordId: "u-l2", tenantId: "u-t4", startDate: m1(-2), endDate: m1(10), monthlyRent: 3000, securityDeposit: 6000, maintenanceFee: 250, noticePeriodDays: 30, noticeGivenAt: d(0, 2), noticeByParty: "LANDLORD", noticeEffectiveDate: d(1, 1), terms: "Standard residential lease.", status: "ACTIVE" },
      // Ended leases (enable two-way ratings)
      { id: "L5", propertyId: "p2", landlordId: "u-l1", tenantId: "u-t6", startDate: m1(-16), endDate: m1(-2), monthlyRent: 1150, securityDeposit: 2300, terms: "Prior tenancy. Terminated early by mutual agreement.", status: "TERMINATED" },
      { id: "L6", propertyId: "p6", landlordId: "u-l1", tenantId: "u-t1", startDate: m1(-24), endDate: m1(-12), monthlyRent: 4800, securityDeposit: 9600, terms: "Completed commercial tenancy.", status: "COMPLETED" },
    ],
  });

  // ---- Invoices ----
  await prisma.invoice.createMany({
    data: [
      // L1 — paid history + current paid + next pending
      { id: "I1a", leaseId: "L1", periodMonth: m1(-2), amount: 2500, dueDate: d(-2, 5), status: "PAID" },
      { id: "I1b", leaseId: "L1", periodMonth: m1(-1), amount: 2500, dueDate: d(-1, 5), status: "PAID" },
      { id: "I1c", leaseId: "L1", periodMonth: m1(0), amount: 2500, dueDate: d(0, 5), status: "PAID" },
      { id: "I1d", leaseId: "L1", periodMonth: m1(1), amount: 2500, dueDate: d(1, 5), status: "PENDING" },
      // L2 — one overdue + current pending
      { id: "I2a", leaseId: "L2", periodMonth: m1(-2), amount: 1200, dueDate: d(-2, 5), status: "OVERDUE" },
      { id: "I2b", leaseId: "L2", periodMonth: m1(-1), amount: 1200, dueDate: d(-1, 5), status: "PAID" },
      { id: "I2c", leaseId: "L2", periodMonth: m1(0), amount: 1200, dueDate: d(0, 5), status: "PENDING" },
      // L3 — current paid + next pending
      { id: "I3a", leaseId: "L3", periodMonth: m1(0), amount: 4200, dueDate: d(0, 5), status: "PAID" },
      { id: "I3b", leaseId: "L3", periodMonth: m1(1), amount: 4200, dueDate: d(1, 5), status: "PENDING" },
      // L4 — overdue + current pending
      { id: "I4a", leaseId: "L4", periodMonth: m1(-1), amount: 3000, dueDate: d(-1, 5), status: "OVERDUE" },
      { id: "I4b", leaseId: "L4", periodMonth: m1(0), amount: 3000, dueDate: d(0, 5), status: "PAID" },
    ],
  });

  // ---- Payments (for PAID invoices) ----
  await prisma.payment.createMany({
    data: [
      { id: "PAY1", invoiceId: "I1a", tenantId: "u-t1", amount: 2500, method: "UPI", status: "SUCCESS", verified: true, paidAt: d(-2, 3), gatewayPaymentId: "pay_demo_1a", notes: "Online payment" },
      { id: "PAY2", invoiceId: "I1b", tenantId: "u-t1", amount: 2500, method: "CREDIT_CARD", status: "SUCCESS", verified: true, paidAt: d(-1, 4), gatewayPaymentId: "pay_demo_1b" },
      { id: "PAY3", invoiceId: "I1c", tenantId: "u-t1", amount: 2500, method: "NET_BANKING", status: "SUCCESS", verified: true, paidAt: d(0, 2), gatewayPaymentId: "pay_demo_1c" },
      { id: "PAY4", invoiceId: "I2b", tenantId: "u-t2", amount: 1200, method: "UPI", status: "SUCCESS", verified: false, paidAt: d(-1, 6), gatewayPaymentId: "pay_demo_2b" },
      { id: "PAY5", invoiceId: "I3a", tenantId: "u-t3", amount: 4200, method: "DEBIT_CARD", status: "SUCCESS", verified: true, paidAt: d(0, 3), gatewayPaymentId: "pay_demo_3a" },
      { id: "PAY6", invoiceId: "I4b", tenantId: "u-t4", amount: 3000, method: "NET_BANKING", status: "SUCCESS", verified: true, paidAt: d(0, 5), gatewayPaymentId: "pay_demo_4b" },
      // A refunded payment (e.g., duplicate)
      { id: "PAY7", invoiceId: "I3a", tenantId: "u-t3", amount: 4200, method: "UPI", status: "REFUNDED", verified: true, paidAt: d(0, 4), refundedAt: d(0, 6), notes: "Duplicate payment refunded" },
    ],
  });

  // ---- Maintenance requests ----
  await prisma.maintenanceRequest.createMany({
    data: [
      { id: "MR1", propertyId: "p1", tenantId: "u-t1", title: "Leaking kitchen tap", description: "The kitchen tap drips continuously and needs a new washer.", priority: "MEDIUM", status: "PENDING" },
      { id: "MR2", propertyId: "p1", tenantId: "u-t1", title: "AC not cooling", description: "Living room AC runs but doesn't cool. Possibly low refrigerant.", priority: "HIGH", status: "IN_PROGRESS", assignedTo: "CoolAir Services" },
      { id: "MR3", propertyId: "p2", tenantId: "u-t2", title: "Broken window latch", description: "Bedroom window won't latch shut.", priority: "LOW", status: "RESOLVED", assignedTo: "FixIt Co." },
      { id: "MR4", propertyId: "p3", tenantId: "u-t3", title: "Water heater not working", description: "No hot water since this morning.", priority: "HIGH", status: "ASSIGNED", assignedTo: "PlumbPro" },
      { id: "MR5", propertyId: "p4", tenantId: "u-t4", title: "Elevator making noise", description: "Loud grinding noise from the elevator.", priority: "MEDIUM", status: "CLOSED", assignedTo: "LiftTech" },
      { id: "MR6", propertyId: "p1", tenantId: "u-t1", title: "Paint peeling in hallway", description: "Cosmetic — paint peeling near the entrance.", priority: "LOW", status: "REJECTED" },
    ],
  });

  // ---- Complaints + threads ----
  await prisma.complaint.createMany({
    data: [
      { id: "C1", tenantId: "u-t1", propertyId: "p1", subject: "Noisy neighbours", description: "Loud music from the adjacent unit late at night on weekends.", status: "OPEN" },
      { id: "C2", tenantId: "u-t2", propertyId: "p2", subject: "Parking spot dispute", description: "Another resident keeps using my assigned parking spot.", status: "RESPONDED" },
      { id: "C3", tenantId: "u-t3", propertyId: "p3", subject: "Irregular garbage collection", description: "Garbage hasn't been collected for several days.", status: "RESOLVED" },
      { id: "C4", tenantId: "u-t4", propertyId: "p4", subject: "Water leakage in lobby", description: "Persistent leak near the lobby entrance.", status: "CLOSED" },
    ],
  });
  await prisma.complaintMessage.createMany({
    data: [
      { complaintId: "C2", authorId: "u-l1", body: "Thanks for flagging — I'll remind all residents about assigned spots and put up a notice." },
      { complaintId: "C3", authorId: "u-l1", body: "Apologies for the delay. I've contacted the collection service." },
      { complaintId: "C3", authorId: "u-t3", body: "Thank you, it was collected this morning." },
      { complaintId: "C3", authorId: "u-l1", body: "Great — marking this resolved." },
      { complaintId: "C4", authorId: "u-l2", body: "Plumber fixed the lobby leak; closing the ticket." },
    ],
  });

  // ---- Ratings (two-way, for ended leases) ----
  await prisma.rating.createMany({
    data: [
      // L5 (William ↔ Michael)
      { id: "RT1", leaseId: "L5", direction: "LANDLORD_TO_TENANT", raterId: "u-l1", rateeId: "u-t6", stars: 4, feedback: "Reliable tenant, paid on time and kept the place tidy.", recommend: true, criteria: { rentDiscipline: 4, propertyMaintenance: 4, communication: 5, ruleCompliance: 4, conduct: 4 }, status: "VISIBLE" },
      { id: "RT2", leaseId: "L5", direction: "TENANT_TO_LANDLORD", raterId: "u-t6", rateeId: "u-l1", stars: 5, feedback: "Very responsive landlord, handled all requests quickly.", recommend: true, criteria: { propertyQuality: 4, maintenanceSupport: 5, communication: 5, transparency: 5, overall: 5 }, status: "VISIBLE" },
      // L6 (Emily ↔ Michael)
      { id: "RT3", leaseId: "L6", direction: "LANDLORD_TO_TENANT", raterId: "u-l1", rateeId: "u-t1", stars: 5, feedback: "Excellent tenant — highly recommended.", recommend: true, criteria: { rentDiscipline: 5, propertyMaintenance: 5, communication: 5, ruleCompliance: 5, conduct: 5 }, status: "VISIBLE" },
      { id: "RT4", leaseId: "L6", direction: "TENANT_TO_LANDLORD", raterId: "u-t1", rateeId: "u-l1", stars: 4, feedback: "Good experience overall; minor delays on one repair.", recommend: true, criteria: { propertyQuality: 4, maintenanceSupport: 3, communication: 4, transparency: 5, overall: 4 }, status: "FLAGGED" },
    ],
  });

  // ---- Notifications (all roles) ----
  await prisma.notification.createMany({
    data: [
      // Tenant (Emily / demo tenant)
      { userId: "u-t1", type: "rent_reminder", title: "Rent payment reminder", body: "Your rent of $2,500 for Green Meadows Apartment is due on the 5th.", link: "/tenant/payments", read: false },
      { userId: "u-t1", type: "maintenance", title: "Maintenance update", body: "Your request 'AC not cooling' is now In Progress.", link: "/tenant/maintenance", read: false },
      { userId: "u-t1", type: "complaint", title: "Landlord responded to your complaint", body: "There's a new reply on 'Noisy neighbours'.", link: "/tenant/complaints", read: true },
      { userId: "u-t1", type: "welcome", title: "Welcome to Lease Lord", body: "Your account is active. Explore your portal.", read: true },
      { userId: "u-t2", type: "rent_reminder", title: "Rent payment reminder", body: "An invoice for Lakeview Studio is overdue.", link: "/tenant/payments", read: false },
      { userId: "u-t3", type: "complaint", title: "Complaint resolved", body: "Your complaint 'Irregular garbage collection' was resolved.", link: "/tenant/complaints", read: false },
      { userId: "u-t4", type: "rent_reminder", title: "Rent payment reminder", body: "An invoice for Downtown Loft is overdue.", link: "/tenant/payments", read: false },

      // Landlord (Michael / demo landlord)
      { userId: "u-l1", type: "maintenance", title: "New maintenance request", body: "Emily Davis reported 'Leaking kitchen tap' at Green Meadows Apartment.", link: "/landlord/maintenance", read: false },
      { userId: "u-l1", type: "payment", title: "Rent payment received", body: "Emily Davis paid $2,500 for Green Meadows Apartment.", link: "/landlord/rent", read: false },
      { userId: "u-l1", type: "complaint", title: "New complaint submitted", body: "James Wilson raised a complaint about a parking dispute.", link: "/landlord/complaints", read: false },
      { userId: "u-l1", type: "account", title: "Tenant awaiting your approval", body: "Sophia Garcia registered under you and needs approval.", link: "/landlord/tenants", read: true },
      { userId: "u-l1", type: "lease", title: "Lease expiring soon", body: "The lease for Sunset Villa expires within 30 days.", link: "/landlord/leases", read: true },

      // Landlord (Sarah)
      { userId: "u-l2", type: "maintenance", title: "Maintenance request resolved", body: "Elevator noise at Downtown Loft was marked resolved.", link: "/landlord/maintenance", read: false },

      // Master Admin
      { userId: "u-admin", type: "account", title: "Landlord awaiting approval", body: "David Chen registered and is pending approval.", link: "/master-admin/users?role=LANDLORD&status=PENDING", read: false },
      { userId: "u-admin", type: "property", title: "Property awaiting approval", body: "Riverside Condo is pending verification.", link: "/master-admin/properties?approval=PENDING", read: false },
      { userId: "u-admin", type: "review", title: "Review flagged for moderation", body: "A review was flagged and needs your attention.", link: "/master-admin/reviews?status=FLAGGED", read: true },
    ],
  });

  // ---- Audit log (admin activity history) ----
  await prisma.auditLog.createMany({
    data: [
      { actorId: "u-admin", action: "user.approve", entity: "User", entityId: "u-l1", metadata: { role: "LANDLORD" } },
      { actorId: "u-admin", action: "property.approve", entity: "Property", entityId: "p1" },
      { actorId: "u-l1", action: "lease.create", entity: "Lease", entityId: "L1" },
      { actorId: "u-l1", action: "payment.record", entity: "Payment", entityId: "PAY3" },
      { actorId: "u-admin", action: "rating.flag", entity: "Rating", entityId: "RT4" },
    ],
  });

  // ---- OLX-style listing details per property ----
  const listingExtra: Record<string, { carpetAreaSqft: number; facing: string; maintenanceMonthly: number; projectName: string; parkingSpots: number; listedBy: "OWNER" | "DEALER" | "BUILDER"; bachelorsAllowed: boolean }> = {
    p1: { carpetAreaSqft: 820, facing: "North-East", maintenanceMonthly: 150, projectName: "Green Meadows Society", parkingSpots: 1, listedBy: "OWNER", bachelorsAllowed: true },
    p2: { carpetAreaSqft: 360, facing: "East", maintenanceMonthly: 50, projectName: "Lakeview Residency", parkingSpots: 0, listedBy: "OWNER", bachelorsAllowed: true },
    p3: { carpetAreaSqft: 2800, facing: "South", maintenanceMonthly: 0, projectName: "Sunset Estates", parkingSpots: 2, listedBy: "OWNER", bachelorsAllowed: false },
    p4: { carpetAreaSqft: 1100, facing: "West", maintenanceMonthly: 200, projectName: "Pine Tower", parkingSpots: 1, listedBy: "DEALER", bachelorsAllowed: true },
    p5: { carpetAreaSqft: 1400, facing: "North-West", maintenanceMonthly: 180, projectName: "Riverwalk Residences", parkingSpots: 1, listedBy: "DEALER", bachelorsAllowed: true },
    p6: { carpetAreaSqft: 2100, facing: "North", maintenanceMonthly: 300, projectName: "Maple Court Plaza", parkingSpots: 4, listedBy: "BUILDER", bachelorsAllowed: true },
    p7: { carpetAreaSqft: 980, facing: "East", maintenanceMonthly: 160, projectName: "Cedar Heights", parkingSpots: 1, listedBy: "OWNER", bachelorsAllowed: true },
    p8: { carpetAreaSqft: 1700, facing: "South", maintenanceMonthly: 0, projectName: "Orchard Greens", parkingSpots: 2, listedBy: "OWNER", bachelorsAllowed: false },
    p9: { carpetAreaSqft: 430, facing: "West", maintenanceMonthly: 90, projectName: "City Square", parkingSpots: 0, listedBy: "DEALER", bachelorsAllowed: true },
    p10: { carpetAreaSqft: 1300, facing: "South-West", maintenanceMonthly: 220, projectName: "Bayview Residency", parkingSpots: 1, listedBy: "OWNER", bachelorsAllowed: true },
  };
  for (const [pid, data] of Object.entries(listingExtra)) {
    await prisma.property.update({ where: { id: pid }, data });
  }

  // ---- Documents & images (placeholder files in local storage) ----
  const BLUE = "#2563EB";
  const SLATE = "#475569";
  const propLandlord: Record<string, string> = { p1: "u-l1", p2: "u-l1", p3: "u-l1", p4: "u-l2", p5: "u-l2", p6: "u-l1", p7: "u-l2", p8: "u-l1", p9: "u-l2", p10: "u-l1" };
  const propName: Record<string, string> = {
    p1: "Green Meadows", p2: "Lakeview Studio", p3: "Sunset Villa", p4: "Downtown Loft", p5: "Riverside Condo", p6: "Maple Court",
    p7: "Cedar Heights", p8: "Orchard Greens", p9: "City Square Studio", p10: "Bayview Residency",
  };

  // Property photos (drive list thumbnails + galleries).
  const ROOMS = ["Exterior", "Living Room", "Bedroom", "Kitchen", "Bathroom", "Balcony"];
  const photoPlan: Record<string, number> = { p1: 6, p2: 5, p3: 6, p4: 6, p5: 5, p6: 5, p7: 6, p8: 6, p9: 5, p10: 6 };
  for (const [pid, n] of Object.entries(photoPlan)) {
    for (let i = 0; i < n; i++) {
      await propPhoto(pid, propLandlord[pid], i, `${propName[pid]} — ${ROOMS[i % ROOMS.length]}`);
    }
  }
  // Ownership proof on a property (admin "verify documents").
  await imgDoc({ ownerId: "u-l1", propertyId: "p1", type: "PROPERTY_PROOF", label: "Green Meadows Ownership Deed", bg: SLATE });

  // Landlord verification documents (onboarding — owner-scoped, no property/lease).
  await imgDoc({ ownerId: "u-l1", type: "GOVERNMENT_ID", label: "Michael Anderson - ID", bg: SLATE });
  await imgDoc({ ownerId: "u-l1", type: "PHOTO", label: "Property Photo - Michael", bg: BLUE });
  await imgDoc({ ownerId: "u-l2", type: "GOVERNMENT_ID", label: "Sarah Johnson - ID", bg: SLATE });
  await imgDoc({ ownerId: "u-l2", type: "PHOTO", label: "Property Photo - Sarah", bg: BLUE });

  // Tenant profile document.
  await imgDoc({ ownerId: "u-t1", type: "GOVERNMENT_ID", label: "Emily Davis - ID", bg: SLATE });

  // Signed lease contracts (mirror onto signedContractUrl).
  for (const lid of ["L1", "L3"]) {
    const doc = await imgDoc({ ownerId: "u-l1", leaseId: lid, type: "LEASE", label: `Signed Lease ${lid}`, bg: SLATE });
    await prisma.lease.update({ where: { id: lid }, data: { signedContractUrl: `/api/files/${doc.id}` } });
  }

  // Maintenance request photos (tenant-uploaded supporting images).
  // Maintenance photos are tenant-private (no propertyId → not shown in the public gallery).
  const mr1Img = await imgDoc({ ownerId: "u-t1", type: "PHOTO", label: "Leaking Tap", bg: BLUE });
  await prisma.maintenanceRequest.update({ where: { id: "MR1" }, data: { images: [`/api/files/${mr1Img.id}`] } });
  const mr2a = await imgDoc({ ownerId: "u-t1", type: "PHOTO", label: "AC Unit 1", bg: BLUE });
  const mr2b = await imgDoc({ ownerId: "u-t1", type: "PHOTO", label: "AC Unit 2", bg: BLUE });
  await prisma.maintenanceRequest.update({ where: { id: "MR2" }, data: { images: [`/api/files/${mr2a.id}`, `/api/files/${mr2b.id}`] } });

  // ---- Public rental applications (leads on available listings) ----
  await prisma.application.createMany({
    data: [
      { propertyId: "p5", fullName: "Nathan Cooper", email: "nathan.cooper@example.com", phone: "+1 512 555 0701", message: "Interested in the Riverside Condo — available to move in next month.", status: "PENDING" },
      { propertyId: "p6", fullName: "Laura Bennett", email: "laura.bennett@example.com", phone: "+1 617 555 0702", message: "Looking for commercial space for a small studio.", status: "PENDING" },
      { propertyId: "p5", fullName: "Marcus Reed", email: "marcus.reed@example.com", phone: "+1 512 555 0703", message: "Two adults, no pets. Great references available.", status: "REJECTED" },
    ],
  });

  // ---- Public property enquiry (guest chat from a listing) ----
  await prisma.propertyInquiry.create({
    data: {
      propertyId: "p6",
      landlordId: "u-l1",
      guestName: "Rahul Mehta",
      guestPhone: "+1 617 555 0990",
      guestEmail: "rahul.mehta@example.com",
      messages: {
        create: [
          { fromGuest: true, body: "Hi, is Maple Court still available for a small cafe?" },
          { fromGuest: false, body: "Hi Rahul, yes it is! Ground-floor with street frontage. Want to schedule a viewing?" },
          { fromGuest: true, body: "Great — could I come by this weekend?" },
        ],
      },
    },
  });

  // ---- Direct messages (landlord ↔ tenant chat) ----
  await prisma.message.createMany({
    data: [
      { senderId: "u-t1", recipientId: "u-l1", body: "Hi Michael, the kitchen tap is still dripping — any update on the plumber?", read: true },
      { senderId: "u-l1", recipientId: "u-t1", body: "Hi Emily, I've scheduled CoolAir for tomorrow morning. They'll fix the tap and check the AC.", read: true },
      { senderId: "u-t1", recipientId: "u-l1", body: "Perfect, thank you! I'll be home after 10am.", read: false },
    ],
  });

  // ---- Scheduled property visits (tour requests) ----
  const inDays = (d: number, h = 11) => {
    const t = new Date();
    t.setDate(t.getDate() + d);
    t.setHours(h, 0, 0, 0);
    return t;
  };
  await prisma.visit.createMany({
    data: [
      { propertyId: "p5", fullName: "Priya Sharma", email: "priya.sharma@example.com", phone: "+1 512 555 0801", preferredAt: inDays(2, 10), message: "Could I see it over the weekend?", status: "PENDING" },
      { propertyId: "p6", fullName: "Daniel Okoro", email: "daniel.okoro@example.com", phone: "+1 617 555 0802", preferredAt: inDays(3, 15), message: "Scouting commercial space for a cafe.", status: "PENDING" },
      { propertyId: "p1", fullName: "Sofia Rossi", email: "sofia.rossi@example.com", phone: "+1 646 555 0803", preferredAt: inDays(1, 18), message: "Evening viewing preferred after work.", status: "CONFIRMED" },
    ],
  });

  const counts = {
    users: await prisma.user.count(),
    applications: await prisma.application.count(),
    visits: await prisma.visit.count(),
    documents: await prisma.document.count(),
    properties: await prisma.property.count(),
    leases: await prisma.lease.count(),
    invoices: await prisma.invoice.count(),
    payments: await prisma.payment.count(),
    maintenance: await prisma.maintenanceRequest.count(),
    complaints: await prisma.complaint.count(),
    ratings: await prisma.rating.count(),
    notifications: await prisma.notification.count(),
  };
  console.log("Seed complete:", counts);
  console.log("Logins (password: Password123!): admin@tms.local · landlord@tms.local · tenant@tms.local");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
