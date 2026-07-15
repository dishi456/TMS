import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const pad = (n: number, w = 6) => String(n).padStart(w, "0");

// Demo identity documents (real, openable images live in storage/demo/doc-*.png).
const DOCS = [
  { suffix: "passport", label: "Passport", prefix: "P", key: "demo/doc-passport.png" },
  { suffix: "license", label: "Driver's License", prefix: "DL", key: "demo/doc-license.png" },
  { suffix: "nationalid", label: "National ID", prefix: "NID", key: "demo/doc-nationalid.png" },
];

async function main() {
  // Attach docs to the demo tenants so any landlord opening one of their tenants
  // sees documents they can open + verify.
  const tenants = await prisma.user.findMany({
    where: { role: "TENANT" },
    select: { id: true },
    orderBy: { id: "asc" },
    take: 30,
  });

  const data = tenants.flatMap((t, i) => {
    // Two documents each (passport + one more), left UNVERIFIED so the landlord
    // can verify them in-app.
    const picks = [DOCS[0], DOCS[(i % 2) + 1]];
    return picks.map((d, j) => ({
      id: `sx-tdoc-${t.id}-${j}`,
      ownerId: t.id,
      type: "GOVERNMENT_ID" as const,
      storageKey: d.key,
      fileName: `${d.suffix}.png`,
      contentType: "image/png",
      sizeBytes: 16000,
      label: d.label,
      docNumber: `${d.prefix}${pad(100000 + i)}`,
      verified: false,
    }));
  });

  const r = await prisma.document.createMany({ skipDuplicates: true, data });
  console.log(`Created ${r.count} demo identity documents across ${tenants.length} tenants.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
