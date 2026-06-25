/**
 * COMPREHENSIVE, idempotent DEMO seed — fills every module with realistic,
 * interconnected data so the app looks like a live production system.
 *
 *   10 landlords · 25 tenants · 50 properties (with images) · active + past
 *   leases · invoices + payments · two-way reviews · maintenance · complaints ·
 *   applications · visits · enquiries · notifications · audit log.
 *
 *   - Additive & safe to re-run: fixed `sx-*` ids + skipDuplicates, never deletes.
 *   - Distinct from the small seed (dx-*) and from any real accounts.
 *   - Property photos are generated locally and written into ./storage so they
 *     render through /api/files/{id}. Avatars use a remote placeholder service.
 *
 *   Logins (password: Demo1234!):  landlord.rajesh@leaselord.app ... + 9 more
 *                                  tenant.aarav@leaselord.app ... + 24 more
 *   Master Admin:  admin@leaselord.com / Admin@123
 *
 * Run:  DATABASE_URL="<url>" npx tsx scripts/seed-demo-full.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import zlib from "zlib";
import { promises as fs } from "fs";
import path from "path";

const prisma = new PrismaClient();
const STORAGE_DIR = path.join(process.cwd(), "storage");

// ---------- tiny PNG encoder (vertical-gradient solid tiles) ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function gradientPng(w: number, h: number, [r, g, b]: number[]): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const stride = w * 3;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    const f = 0.72 + 0.28 * (y / h); // subtle top-to-bottom gradient
    const off = y * (stride + 1); raw[off] = 0;
    for (let x = 0; x < w; x++) { const p = off + 1 + x * 3; raw[p] = Math.round(r * f); raw[p + 1] = Math.round(g * f); raw[p + 2] = Math.round(b * f); }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, pngChunk("IHDR", ihdr), pngChunk("IDAT", idat), pngChunk("IEND", Buffer.alloc(0))]);
}
const PHOTO_COLORS = [[37, 99, 235], [5, 150, 105], [217, 119, 6], [139, 92, 246], [14, 165, 233], [220, 38, 38], [13, 148, 136], [2, 132, 199]];
async function writePhotoFiles() {
  await fs.mkdir(path.join(STORAGE_DIR, "demo"), { recursive: true });
  for (let i = 0; i < PHOTO_COLORS.length; i++) {
    await fs.writeFile(path.join(STORAGE_DIR, "demo", `p${i}.png`), gradientPng(640, 420, PHOTO_COLORS[i]));
  }
}

// ---------- reference data ----------
const CITIES = [
  { city: "Pune", state: "Maharashtra", zip: "411001" }, { city: "Mumbai", state: "Maharashtra", zip: "400050" },
  { city: "Bengaluru", state: "Karnataka", zip: "560001" }, { city: "Hyderabad", state: "Telangana", zip: "500034" },
  { city: "Delhi", state: "Delhi", zip: "110001" }, { city: "Chennai", state: "Tamil Nadu", zip: "600040" },
  { city: "Gurugram", state: "Haryana", zip: "122002" }, { city: "Noida", state: "Uttar Pradesh", zip: "201301" },
];
const STREETS = ["MG Road", "Park Avenue", "Lake View Road", "Hill Crest", "Sunrise Boulevard", "Rose Garden Lane", "Whitefield Main Rd", "Banjara Hills", "Koregaon Park", "Bandra West"];
const SOCIETIES = ["Green Meadows", "Lakeview Heights", "Sunset Residency", "Maple Court", "Palm Springs", "Orchid Towers", "Silver Oak", "Whispering Pines", "Royal Enclave", "Skyline Vista", "Emerald Bay", "Cedar Court"];
const AMENITIES = ["Gym", "Swimming Pool", "Power Backup", "Lift", "Covered Parking", "CCTV Security", "Children's Play Area", "Clubhouse", "Landscaped Garden", "High-speed WiFi", "Intercom", "24x7 Water"];
const LANDLORDS = ["Rajesh Khanna", "Sunita Iyer", "Vikram Malhotra", "Anjali Desai", "Arjun Reddy", "Neha Kapoor", "Sanjay Gupta", "Pooja Bhatt", "Imran Sheikh", "Deepa Menon"];
const TENANTS = ["Aarav Sharma", "Diya Patel", "Kabir Singh", "Ananya Rao", "Vivaan Joshi", "Ishaan Nair", "Saanvi Gupta", "Aditya Verma", "Myra Shah", "Reyansh Mehta", "Anika Reddy", "Kiaan Kapoor", "Aarohi Das", "Vihaan Bose", "Riya Malhotra", "Dhruv Pillai", "Sara Khan", "Arnav Chopra", "Navya Menon", "Krishna Iyer", "Aanya Bhat", "Atharv Sinha", "Ira Nanda", "Veer Ahuja", "Tara Saxena"];
const TYPES = ["APARTMENT", "HOUSE", "ROOM", "COMMERCIAL"] as const;
const FURNISH = ["UNFURNISHED", "SEMI_FURNISHED", "FURNISHED"] as const;
const METHODS = ["UPI", "NET_BANKING", "CREDIT_CARD", "DEBIT_CARD", "CASH"] as const;

const pad = (n: number, len = 2) => String(n).padStart(len, "0");
const first = (full: string) => full.split(" ")[0].toLowerCase();
const slug = (full: string) => full.toLowerCase().replace(/[^a-z]/g, "");
const avatar = (seed: number) => `https://i.pravatar.cc/300?img=${(seed % 70) + 1}`;
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const now = new Date();
const mStart = (mo: number) => new Date(now.getFullYear(), now.getMonth() + mo, 1);
const dOn = (mo: number, day: number) => new Date(now.getFullYear(), now.getMonth() + mo, day);

const OCCUPIED = 24;       // properties 0..23 are occupied (active leases for tenants 0..23)
const AVAIL_END = 46;      // 24..45 available (public marketplace), 46..49 unavailable
const PENDING_TENANT = 24; // tenant #25 is pending approval, no lease

function typeForIndex(i: number) { return TYPES[i % TYPES.length]; }
function rentForIndex(i: number, type: string) {
  const base = type === "ROOM" ? 9000 : type === "COMMERCIAL" ? 55000 : type === "HOUSE" ? 35000 : 18000;
  const span = type === "ROOM" ? 7000 : type === "COMMERCIAL" ? 65000 : type === "HOUSE" ? 35000 : 27000;
  return Math.round((base + ((i * 1234) % span)) / 500) * 500;
}

async function main() {
  const pw = await bcrypt.hash("Demo1234!", 10);
  const adminPw = await bcrypt.hash("Admin@123", 10);
  await writePhotoFiles();

  // ---------- USERS ----------
  const users: any[] = [
    { id: "sx-admin", email: "admin@leaselord.com", passwordHash: adminPw, role: "MASTER_ADMIN", status: "ACTIVE", verified: true, fullName: "System Administrator", phone: "+91 90000 10000", avatarUrl: avatar(68) },
  ];
  LANDLORDS.forEach((name, i) => {
    users.push({
      id: `sx-l${pad(i + 1)}`, email: `landlord.${first(name)}@leaselord.app`, passwordHash: pw,
      role: "LANDLORD", status: i === 9 ? "PENDING" : "ACTIVE", verified: i < 8,
      fullName: name, phone: `+91 98${pad(i, 2)}0 ${pad(10000 + i)}`, avatarUrl: avatar(i + 1),
    });
  });
  TENANTS.forEach((name, i) => {
    const landlordIdx = i < OCCUPIED ? Math.floor(i / 5) : 0;
    users.push({
      id: `sx-t${pad(i + 1)}`, email: `tenant.${slug(name)}@leaselord.app`, passwordHash: pw,
      role: "TENANT", status: i === PENDING_TENANT ? "PENDING" : "ACTIVE", verified: i !== PENDING_TENANT && i % 7 !== 0,
      fullName: name, phone: `+91 99${pad(i, 2)}0 ${pad(20000 + i)}`, landlordId: `sx-l${pad(landlordIdx + 1)}`,
      governmentId: i % 3 === 0 ? `XXXX-XXXX-${pad(1000 + i, 4)}` : null,
      emergencyContact: `+91 97000 ${pad(30000 + i)}`, avatarUrl: avatar(i + 20),
    });
  });
  await prisma.user.createMany({ skipDuplicates: true, data: users });

  // ---------- PROPERTIES + PHOTO DOCUMENTS ----------
  const properties: any[] = [];
  const docs: any[] = [];
  for (let i = 0; i < 50; i++) {
    const type = typeForIndex(i);
    const landlordIdx = Math.floor(i / 5);
    const loc = CITIES[i % CITIES.length];
    const society = SOCIETIES[i % SOCIETIES.length];
    const rooms = type === "ROOM" ? 1 : type === "COMMERCIAL" ? null : (i % 3) + 1;
    const label = type === "ROOM" ? "Studio" : type === "HOUSE" ? "Villa" : type === "COMMERCIAL" ? "Commercial Space" : `${(rooms ?? 2)}BHK`;
    const rent = rentForIndex(i, type);
    const avail = i < OCCUPIED ? "OCCUPIED" : i < AVAIL_END ? "AVAILABLE" : "UNAVAILABLE";
    const amenN = 3 + (i % 4);
    const amenities = Array.from({ length: amenN }, (_, k) => AMENITIES[(i + k) % AMENITIES.length]);
    properties.push({
      id: `sx-p${pad(i + 1, 3)}`, ref: String(920001 + i), landlordId: `sx-l${pad(landlordIdx + 1)}`,
      name: `${society} ${label}`, type, projectName: society,
      address: `${(i % 40) + 1} ${STREETS[i % STREETS.length]}, ${loc.city}, ${loc.state} ${loc.zip}`,
      description: `Well-maintained ${label} in ${society}, ${loc.city}. ${type === "COMMERCIAL" ? "Prime frontage, ideal for retail or office." : "Bright, airy and close to schools, transit and markets."}`,
      rooms, bathrooms: type === "COMMERCIAL" ? 2 : Math.max(1, (rooms ?? 1)), balconies: type === "COMMERCIAL" ? 0 : (i % 3),
      floor: (i % 12) + 1, totalFloors: 12 + (i % 8),
      areaSqft: type === "ROOM" ? 380 + (i % 5) * 40 : type === "COMMERCIAL" ? 1800 + (i % 6) * 300 : 750 + (i % 10) * 120,
      furnishing: FURNISH[i % FURNISH.length], hasLobby: i % 2 === 0, hasParking: i % 3 !== 0, hasLift: type !== "HOUSE",
      powerBackup: i % 2 === 0, bachelorsAllowed: i % 4 !== 0,
      maintenanceMonthly: type === "COMMERCIAL" ? 4000 : 1200 + (i % 5) * 300,
      rentAmount: rent, securityDeposit: rent * 2, amenities,
      availability: avail, numberOfUnits: type === "COMMERCIAL" ? 1 : 1 + (i % 3),
      noticePeriodDays: 30, verified: i % 9 !== 0, approved: true,
      listedPublic: avail === "AVAILABLE",
    });
    // 2 photos per property (cycling colors)
    for (let j = 0; j < 2; j++) {
      const c = (i + j * 3) % PHOTO_COLORS.length;
      docs.push({
        id: `sx-doc-${pad(i + 1, 3)}-${j}`, ownerId: `sx-l${pad(landlordIdx + 1)}`, propertyId: `sx-p${pad(i + 1, 3)}`,
        type: "PHOTO", storageKey: `demo/p${c}.png`, fileName: `${slug(society)}-${j + 1}.png`,
        contentType: "image/png", sizeBytes: 4096, label: `${society} photo ${j + 1}`,
      });
    }
  }
  await prisma.property.createMany({ skipDuplicates: true, data: properties });
  await prisma.document.createMany({ skipDuplicates: true, data: docs });

  // ---------- LEASES (active per occupied property + past tenancies for reviews) ----------
  const leases: any[] = [];
  for (let i = 0; i < OCCUPIED; i++) {
    const p = properties[i];
    leases.push({
      id: `sx-la${pad(i + 1)}`, propertyId: p.id, landlordId: p.landlordId, tenantId: `sx-t${pad(i + 1)}`,
      startDate: mStart(-(3 + (i % 6))), endDate: mStart(9 - (i % 4)), monthlyRent: p.rentAmount,
      securityDeposit: p.securityDeposit, maintenanceFee: 1500, noticePeriodDays: 30,
      terms: `11-month residential lease — Agreement #LEASE-2026-${pad(i + 1, 4)}. Rent due by the 5th of each month.`,
      status: "ACTIVE",
    });
  }
  const PAST = 10;
  for (let k = 0; k < PAST; k++) {
    const p = properties[24 + k]; // a now-available unit this tenant rented previously
    leases.push({
      id: `sx-lc${pad(k + 1)}`, propertyId: p.id, landlordId: p.landlordId, tenantId: `sx-t${pad(k + 1)}`,
      startDate: mStart(-(20 + k)), endDate: mStart(-(6 + k)), monthlyRent: Math.round(p.rentAmount * 0.95),
      securityDeposit: p.securityDeposit, noticePeriodDays: 30,
      terms: `Prior tenancy (completed) — Agreement #LEASE-2025-${pad(k + 1, 4)}.`, status: "COMPLETED",
    });
  }
  await prisma.lease.createMany({ skipDuplicates: true, data: leases });

  // ---------- INVOICES + PAYMENTS ----------
  const invoices: any[] = [];
  const payments: any[] = [];
  let payNo = 1;
  for (let i = 0; i < OCCUPIED; i++) {
    const lid = `sx-la${pad(i + 1)}`;
    const rent = properties[i].rentAmount;
    // months -3..-1 paid; current month mostly paid (every 5th overdue); next
    // month upcoming. Gives healthy current-month collection + a realistic mix.
    const plan = [
      { mo: -3, pay: true }, { mo: -2, pay: true }, { mo: -1, pay: true },
      { mo: 0, pay: i % 5 !== 0 }, { mo: 1, pay: false },
    ];
    plan.forEach((row, n) => {
      const invId = `sx-inv-${pad(i + 1)}-${n}`;
      const status = row.pay ? "PAID" : row.mo <= 0 ? "OVERDUE" : "PENDING";
      invoices.push({ id: invId, leaseId: lid, periodMonth: mStart(row.mo), amount: rent, dueDate: dOn(row.mo, 5), status });
      if (row.pay) {
        payments.push({
          id: `sx-pay-${pad(i + 1)}-${n}`, invoiceId: invId, tenantId: `sx-t${pad(i + 1)}`, amount: rent,
          method: METHODS[(i + n) % METHODS.length], status: "SUCCESS", verified: true, paidAt: dOn(row.mo, 3),
          notes: `Receipt #PAY-2026-${pad(payNo++, 4)}`,
        });
      }
    });
  }
  await prisma.invoice.createMany({ skipDuplicates: true, data: invoices });
  await prisma.payment.createMany({ skipDuplicates: true, data: payments });

  // ---------- REVIEWS (two-way, on completed leases) ----------
  const ratings: any[] = [];
  const tFeed = ["Responsive landlord, repairs handled quickly.", "Great place, fair landlord. Deposit returned on time.", "Smooth tenancy, clear communication throughout.", "Well-maintained building and helpful owner.", "Good experience overall, minor delays on one repair."];
  const lFeed = ["Excellent tenant — paid on time and kept the place spotless.", "Reliable and courteous, would happily rent to again.", "No issues at all, very respectful of house rules.", "Prompt with rent, took good care of the property.", "Pleasant tenant, communicated well about any concerns."];
  for (let k = 0; k < PAST; k++) {
    const lid = `sx-lc${pad(k + 1)}`;
    const p = properties[24 + k];
    ratings.push({
      id: `sx-rt-${k}-lt`, leaseId: lid, direction: "LANDLORD_TO_TENANT", raterId: p.landlordId, rateeId: `sx-t${pad(k + 1)}`,
      stars: 4 + (k % 2), feedback: lFeed[k % lFeed.length], recommend: true,
      criteria: { rentDiscipline: 5, propertyMaintenance: 4 + (k % 2), communication: 5, ruleCompliance: 4 + (k % 2), conduct: 5 }, status: "VISIBLE",
    });
    ratings.push({
      id: `sx-rt-${k}-tl`, leaseId: lid, direction: "TENANT_TO_LANDLORD", raterId: `sx-t${pad(k + 1)}`, rateeId: p.landlordId,
      stars: 4 + ((k + 1) % 2), feedback: tFeed[k % tFeed.length], recommend: true,
      criteria: { propertyQuality: 4 + (k % 2), maintenanceSupport: 4, communication: 5, transparency: 4 + (k % 2), overall: 4 + ((k + 1) % 2) }, status: "VISIBLE",
    });
  }
  await prisma.rating.createMany({ skipDuplicates: true, data: ratings });

  // ---------- MAINTENANCE ----------
  const mTitles = [["Leaking kitchen tap", "MEDIUM", "PENDING"], ["AC not cooling", "HIGH", "IN_PROGRESS"], ["Bathroom drainage blocked", "HIGH", "ASSIGNED"], ["Flickering hallway light", "LOW", "RESOLVED"], ["Door lock jammed", "MEDIUM", "PENDING"], ["Seepage on bedroom wall", "MEDIUM", "IN_PROGRESS"], ["Geyser not heating", "HIGH", "ASSIGNED"], ["Window won't close", "LOW", "CLOSED"]];
  const maintenance = mTitles.map((m, idx) => {
    const i = idx * 3; // spread across leases
    return { id: `sx-mr-${pad(idx + 1)}`, propertyId: `sx-p${pad(i + 1, 3)}`, tenantId: `sx-t${pad(i + 1)}`, title: m[0] as string, description: `${m[0]} — please look into this at the earliest.`, priority: m[1] as string, status: m[2] as string, assignedTo: ["ASSIGNED", "IN_PROGRESS"].includes(m[2] as string) ? "CityCare Facilities" : null };
  });
  await prisma.maintenanceRequest.createMany({ skipDuplicates: true, data: maintenance });

  // ---------- COMPLAINTS + threads ----------
  const cData = [["Noisy neighbours", "Loud music from the adjacent unit late at night.", "RESPONDED"], ["Parking spot occupied", "Someone keeps parking in my allotted slot.", "OPEN"], ["Water supply timing", "Morning water supply has been irregular this week.", "RESOLVED"], ["Lift out of service", "The lift has been down for two days.", "RESPONDED"]];
  const complaints = cData.map((c, idx) => { const i = idx * 2 + 1; return { id: `sx-cp-${pad(idx + 1)}`, tenantId: `sx-t${pad(i + 1)}`, propertyId: `sx-p${pad(i + 1, 3)}`, subject: c[0], description: c[1], status: c[2] }; });
  await prisma.complaint.createMany({ skipDuplicates: true, data: complaints });
  await prisma.complaintMessage.createMany({
    skipDuplicates: true,
    data: complaints.filter((_, idx) => cData[idx][2] !== "OPEN").map((c, idx) => ({ id: `sx-cpm-${pad(idx + 1)}`, complaintId: c.id, authorId: `sx-l${pad(Math.floor((idx * 2 + 1) / 5) + 1)}`, body: "Thanks for flagging — I've raised this with building management and will keep you posted." })),
  });

  // ---------- APPLICATIONS (leads on available listings) ----------
  const applicants = [["Nathan Cooper", "nathan.cooper@example.com"], ["Laura Bennett", "laura.bennett@example.com"], ["Meera Joshi", "meera.joshi@example.com"], ["Daniel Foster", "daniel.foster@example.com"], ["Sofia Rossi", "sofia.rossi@example.com"], ["Rahul Mehta", "rahul.mehta@example.com"], ["Emily Carter", "emily.carter@example.com"], ["Karan Malhotra", "karan.malhotra@example.com"], ["Olivia Grant", "olivia.grant@example.com"], ["Farhan Qureshi", "farhan.qureshi@example.com"]];
  await prisma.application.createMany({
    skipDuplicates: true,
    data: applicants.map((a, idx) => ({ id: `sx-ap-${pad(idx + 1)}`, propertyId: `sx-p${pad(25 + idx, 3)}`, fullName: a[0], email: a[1], phone: `+91 90000 ${pad(40000 + idx)}`, message: `Hi, I'm interested in this property and would like to apply. Can we discuss the move-in date?`, status: "PENDING" })),
  });

  // ---------- VISITS ----------
  await prisma.visit.createMany({
    skipDuplicates: true,
    data: applicants.slice(0, 8).map((a, idx) => ({ id: `sx-vs-${pad(idx + 1)}`, propertyId: `sx-p${pad(30 + idx, 3)}`, fullName: a[0], email: a[1], phone: `+91 90000 ${pad(50000 + idx)}`, preferredAt: dOn(0, 20 + (idx % 8)), message: "Would love to tour this property — is the weekend possible?", status: idx % 3 === 0 ? "CONFIRMED" : "PENDING" })),
  });

  // ---------- ENQUIRY (guest chat) ----------
  const existing = await prisma.propertyInquiry.findUnique({ where: { id: "sx-iq1" } }).catch(() => null);
  if (!existing) {
    await prisma.propertyInquiry.create({
      data: {
        id: "sx-iq1", propertyId: "sx-p026", landlordId: properties[25].landlordId,
        guestName: "Priya Sharma", guestPhone: "+91 90000 60001", guestEmail: "priya.sharma@example.com",
        messages: { create: [
          { fromGuest: true, body: "Hi, is this property still available for rent?" },
          { fromGuest: false, body: "Hello Priya! Yes, it is available. Would you like to schedule a visit?", readByGuest: true },
          { fromGuest: true, body: "Yes please — sometime this weekend would be great." },
        ] },
      },
    });
  }

  // ---------- NOTIFICATIONS (covers every event type) ----------
  const notes: any[] = [];
  let nn = 1;
  const push = (userId: string, type: string, title: string, body: string, link: string, read = false) => notes.push({ id: `sx-nt-${pad(nn++, 3)}`, userId, type, title, body, link, read });
  for (let i = 0; i < 8; i++) {
    const lid = `sx-l${pad(i + 1)}`;
    push(lid, "application", "New rental application", `${applicants[i % applicants.length][0]} applied for ${properties[24 + (i % 10)].name}.`, "/landlord/applications", false);
    push(lid, "payment", "Rent received", `${TENANTS[i]} paid ${inr(properties[i].rentAmount)} for ${properties[i].name}.`, "/landlord/rent", true);
    push(lid, "property", "Property approved", `Your listing "${properties[i * 5 % 50].name}" was approved and is now live.`, "/landlord/properties", true);
  }
  for (let i = 0; i < 12; i++) {
    const tid = `sx-t${pad(i + 1)}`;
    push(tid, "rent_reminder", "Rent due reminder", `Your rent of ${inr(properties[i].rentAmount)} for ${properties[i].name} is due on the 5th.`, "/tenant/payments", i % 2 === 0);
    push(tid, "lease", "Lease created", `Your lease for ${properties[i].name} is active. Tap to view details.`, "/tenant/lease", true);
    if (i % 3 === 0) push(tid, "maintenance", "Maintenance update", "Your request status was updated.", "/tenant/maintenance", false);
  }
  push("sx-admin", "account", "Landlord awaiting approval", `${LANDLORDS[9]} registered and is pending approval.`, "/master-admin/users", false);
  push("sx-admin", "property", "Property pending approval", "A new property was submitted for review.", "/master-admin/properties", false);
  await prisma.notification.createMany({ skipDuplicates: true, data: notes });

  // ---------- AUDIT LOG ----------
  const audit: any[] = [];
  let an = 1;
  const aud = (actorId: string, action: string, entity: string, entityId: string) => audit.push({ id: `sx-au-${pad(an++, 3)}`, actorId, action, entity, entityId });
  for (let i = 0; i < 6; i++) aud("sx-admin", "property.approve", "Property", `sx-p${pad(i + 1, 3)}`);
  for (let i = 0; i < 5; i++) aud(`sx-l${pad(i + 1)}`, "tenant.add", "User", `sx-t${pad(i + 1)}`);
  for (let i = 0; i < 5; i++) aud(`sx-l${pad(i + 1)}`, "payment.record", "Payment", `sx-pay-${pad(i + 1)}-0`);
  aud("sx-admin", "user.suspend", "User", "sx-t25");
  await prisma.auditLog.createMany({ skipDuplicates: true, data: audit });

  // ---------- summary ----------
  const counts = {
    users: users.length, properties: properties.length, photos: docs.length, leases: leases.length,
    invoices: invoices.length, payments: payments.length, reviews: ratings.length, maintenance: maintenance.length,
    complaints: complaints.length, applications: applicants.length, visits: 8, notifications: notes.length, audit: audit.length,
  };
  console.log("✅ Comprehensive demo data seeded:", JSON.stringify(counts, null, 2));
  console.log("\nLogins (password: Demo1234!):");
  console.log("  Master Admin : admin@leaselord.com / Admin@123");
  console.log(`  Landlords    : landlord.${first(LANDLORDS[0])}@leaselord.app ... (+9)`);
  console.log(`  Tenants      : tenant.${slug(TENANTS[0])}@leaselord.app ... (+24)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
