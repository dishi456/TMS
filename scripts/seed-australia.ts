import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
// Rents stored as INR-equivalent (base) so the app's currency converter shows
// the right A$ for AUD viewers (1 AUD ~= 55.56 INR @ rate 0.018).
const AUD = (a: number) => Math.round((a / 0.018) / 500) * 500;
// title, type, suburb/city, state, postcode, lat, lng, audRent, rooms, bath, area, details
const P: [string, string, string, string, string, number, number, number, number | null, number | null, number | null, any][] = [
  ["Modern 2BR Apartment · Surry Hills", "APARTMENT", "Sydney", "NSW", "2010", -33.8845, 151.2110, 3200, 2, 2, 980, { buildingName: "Crown Terraces", floorNumber: 6, totalFloors: 12, elevator: true, balcony: true, gym: true, parking: true }],
  ["1BR Apartment · Southbank", "APARTMENT", "Melbourne", "VIC", "3006", -37.8226, 144.9648, 2000, 1, 1, 560, { buildingName: "Freshwater Place", floorNumber: 18, totalFloors: 40, elevator: true, balcony: true, gym: true, parking: false }],
  ["3BR Queenslander House · New Farm", "HOUSE", "Brisbane", "QLD", "4005", -27.4670, 153.0510, 2600, 3, 2, 1850, { bedrooms: 3, bathrooms: 2, floors: 1, garage: true, garden: true, driveway: true }],
  ["2BR Riverside Apartment · East Perth", "APARTMENT", "Perth", "WA", "6004", -31.9540, 115.8730, 2200, 2, 2, 870, { buildingName: "The Springs", floorNumber: 4, totalFloors: 9, elevator: true, balcony: true, parking: true }],
  ["2BR Beachside Unit · Broadbeach", "APARTMENT", "Gold Coast", "QLD", "4218", -28.0330, 153.4300, 2400, 2, 2, 910, { buildingName: "Wave Apartments", floorNumber: 8, totalFloors: 20, elevator: true, balcony: true, gym: true, parking: true }],
];
const pad = (n: number, l = 2) => String(n).padStart(l, "0");
async function run() {
  const props: any[] = [];
  const docs: any[] = [];
  for (let i = 0; i < P.length; i++) {
    const [title, type, city, state, postcode, lat, lng, aud, rooms, bath, area, details] = P[i];
    const id = `sx-au${pad(i + 1)}`;
    const rent = AUD(aud);
    props.push({
      id, ref: String(940001 + i), landlordId: `sx-l${pad((i % 8) + 1)}`, name: title, type,
      address: `${10 + i * 7} ${["Crown St", "Queens Rd", "Brunswick St", "Hay St", "Surf Pde"][i]}, ${city} ${state} ${postcode}`,
      city, state, country: "Australia", postalCode: postcode, latitude: lat, longitude: lng,
      description: `${title}. A genuine ${city} rental — close to transport, cafes and the CBD.`,
      rooms, bathrooms: bath, areaSqft: area, furnishing: i % 2 === 0 ? "FURNISHED" : "SEMI_FURNISHED",
      rentAmount: rent, securityDeposit: rent,
      amenities: ["Air Conditioning", "Dishwasher", "Built-in Wardrobes", "Secure Parking"].slice(0, 3 + (i % 2)),
      availability: "AVAILABLE", approved: true, verified: true, listedPublic: true, details,
    });
    for (let j = 0; j < 2; j++) docs.push({ id: `sx-au-doc-${pad(i + 1)}-${j}`, ownerId: `sx-l${pad((i % 8) + 1)}`, propertyId: id, type: "PHOTO", storageKey: `demo/p${(i + j * 3) % 8}.png`, fileName: `${id}-${j}.png`, contentType: "image/png", sizeBytes: 4096, label: `${title} ${j + 1}` });
  }
  await prisma.property.createMany({ skipDuplicates: true, data: props });
  await prisma.document.createMany({ skipDuplicates: true, data: docs });
  console.log("Australian properties added:", props.length, "(INR-equiv rents:", props.map(p => p.rentAmount).join(", "), ")");
  await prisma.$disconnect();
}
run().catch((e) => { console.error(e.message); process.exit(1); });
