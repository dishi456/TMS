import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const pad = (n: number, l = 2) => String(n).padStart(l, "0");
const img = (k: number) => `/api/files/sx-doc-${pad((k % 50) + 1, 3)}-0`;

const DATA: [string, string, string, number, string, string][] = [
  ["Almost-new 3-seater fabric sofa", "Sofa", "LIKE_NEW", 18000, "Koregaon Park, Pune", "Comfortable grey 3-seater, barely used, no stains. Pickup only."],
  ["Queen size bed with storage", "Bed", "GOOD", 14000, "Bandra West, Mumbai", "Solid wood queen bed with hydraulic storage. 2 years old."],
  ["Orthopedic mattress (queen)", "Mattress", "GOOD", 6500, "Whitefield, Bengaluru", "Medium-firm orthopedic mattress, clean, with protector."],
  ["6-seater dining table set", "Dining Table", "GOOD", 22000, "Banjara Hills, Hyderabad", "Teak dining table with 6 cushioned chairs."],
  ["Study table with drawers", "Study Table", "LIKE_NEW", 4500, "MG Road, Pune", "Compact study desk, 3 drawers, great for WFH."],
  ["Ergonomic office chair", "Chair", "GOOD", 5500, "Noida Sector 62", "Mesh-back ergonomic chair with lumbar support."],
  ["Double-door refrigerator 320L", "Refrigerator", "GOOD", 16500, "Gurugram", "Frost-free 320L fridge, energy efficient, works perfectly."],
  ["Front-load washing machine 7kg", "Washing Machine", "GOOD", 15000, "Andheri, Mumbai", "7kg front load, inverter, excellent condition."],
  ["43-inch 4K Smart TV", "Television", "LIKE_NEW", 24000, "Indiranagar, Bengaluru", "43 inch 4K LED smart TV with remote and stand. 1 year old."],
  ["Solo microwave oven 20L", "Microwave", "GOOD", 3200, "Koramangala, Bengaluru", "20L solo microwave, perfect for a bachelor pad."],
  ["Mixer grinder 3 jars", "Kitchen Appliances", "GOOD", 1800, "Kothrud, Pune", "750W mixer grinder with 3 stainless jars."],
  ["Sony noise-cancel headphones", "Electronics", "LIKE_NEW", 9000, "Powai, Mumbai", "WH-1000XM4, boxed, with case. Amazing sound."],
  ["Hybrid city bicycle 21-speed", "Bicycle", "GOOD", 7500, "Viman Nagar, Pune", "21-speed hybrid cycle, recently serviced, disc brakes."],
  ["Wall art & decor bundle", "Home Decor", "GOOD", 1500, "HSR Layout, Bengaluru", "Set of 3 framed prints + fairy lights + vase."],
  ["JEE & GATE prep books", "Books", "GOOD", 1200, "Kalyani Nagar, Pune", "Full set of prep books, lightly marked."],
  ["Floor lamp + side table", "Furniture", "LIKE_NEW", 3800, "Jubilee Hills, Hyderabad", "Scandinavian floor lamp with matching side table."],
  ["Induction cooktop 2000W", "Kitchen Appliances", "NEW", 2400, "Sector 18, Noida", "Brand new, sealed box, 2000W induction cooktop."],
  ["Single bed mattress (new)", "Mattress", "NEW", 4000, "Baner, Pune", "Unused single mattress, still wrapped."],
  ["Air fryer 4L", "Kitchen Appliances", "LIKE_NEW", 4200, "Whitefield, Bengaluru", "Used twice, 4L digital air fryer."],
  ["Bookshelf 5-tier", "Furniture", "GOOD", 3000, "Bandra, Mumbai", "Sturdy 5-tier wooden bookshelf, easy to dismantle."],
];
const SELLERS = ["sx-t01", "sx-t01", "sx-t02", "sx-t03", "sx-t04", "sx-t05", "sx-t06", "sx-t07", "sx-t08", "sx-t09"];

async function run() {
  const rows = DATA.map((d, i) => ({
    id: `sx-mkt-${pad(i + 1)}`, sellerId: SELLERS[i % SELLERS.length],
    title: d[0], category: d[1], condition: d[2], price: d[3], currency: "INR", location: d[4], description: d[5],
    images: [img(i), img(i + 7)], status: i % 9 === 8 ? "SOLD" : "AVAILABLE",
  }));
  await prisma.marketplaceListing.createMany({ skipDuplicates: true, data: rows as any });
  for (const lid of ["sx-mkt-03", "sx-mkt-07", "sx-mkt-12"]) {
    try { await prisma.marketplaceFavorite.upsert({ where: { userId_listingId: { userId: "sx-t01", listingId: lid } }, update: {}, create: { userId: "sx-t01", listingId: lid } }); } catch {}
  }
  console.log("marketplace listings total:", await prisma.marketplaceListing.count());
  await prisma.$disconnect();
}
run().catch((e) => { console.error(e); process.exit(1); });
