import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const pad = (n: number, l = 2) => String(n).padStart(l, "0");
const COORDS: Record<string, [number, number, string]> = {
  Pune: [18.5204, 73.8567, "Maharashtra"], Mumbai: [19.0760, 72.8777, "Maharashtra"], Bengaluru: [12.9716, 77.5946, "Karnataka"],
  Hyderabad: [17.3850, 78.4867, "Telangana"], Delhi: [28.6139, 77.2090, "Delhi"], Chennai: [13.0827, 80.2707, "Tamil Nadu"],
  Gurugram: [28.4595, 77.0266, "Haryana"], Noida: [28.5355, 77.3910, "Uttar Pradesh"],
};
// name, type, city, rent, rooms, bath, area, details
const P: [string, string, string, number, number | null, number | null, number | null, any][] = [
  ["Marina Heights 2BHK", "APARTMENT", "Mumbai", 38000, 2, 2, 1100, { buildingName: "Marina Heights", floorNumber: 9, totalFloors: 18, elevator: true, balcony: true, gym: true, parking: true, maintenanceFee: 3000 }],
  ["Lakeshore Villa", "HOUSE", "Bengaluru", 55000, 4, 4, 2600, { bedrooms: 4, bathrooms: 4, floors: 2, garage: true, garden: true, swimmingPool: true, driveway: true }],
  ["TechPark Office Suite", "COMMERCIAL", "Hyderabad", 90000, null, 4, 3200, { unitType: "OFFICE", carpetArea: 2600, builtUpArea: 3200, meetingRooms: 3, washrooms: 4, parkingCapacity: 10, reception: true }],
  ["Riverside Plot", "LAND", "Pune", 30000, null, null, 3600, { plotNumber: "RS-22", plotSize: 3600, zoningType: "RESIDENTIAL", roadAccess: true, cornerPlot: false, waterConnection: true, electricityConnection: true }],
  ["Scholars Den (Shared)", "STUDENT_HOUSING", "Pune", 8500, null, null, 320, { roomType: "SHARED", beds: 3, distanceFromUniversity: 0.8, wifi: true, laundry: true, kitchen: true, studyRoom: true }],
  ["Orchid Square 3BHK", "APARTMENT", "Gurugram", 46000, 3, 3, 1500, { buildingName: "Orchid Square", floorNumber: 12, totalFloors: 22, elevator: true, balcony: true, gym: true, parking: true, maintenanceFee: 3500 }],
  ["Cozy Studio Room", "ROOM", "Bengaluru", 14000, 1, 1, 400, { bathrooms: 1, kitchen: true }],
  ["Palm Grove Bungalow", "HOUSE", "Chennai", 60000, 4, 5, 3000, { bedrooms: 4, bathrooms: 5, floors: 2, garage: true, garden: true, backyard: true }],
  ["Metro Retail Shop", "COMMERCIAL", "Delhi", 75000, null, 2, 1200, { unitType: "RETAIL", carpetArea: 950, builtUpArea: 1200, washrooms: 2, parkingCapacity: 3, loadingArea: true, businessType: "Retail" }],
  ["Sunny Corner Plot", "LAND", "Noida", 25000, null, null, 2400, { plotNumber: "SC-08", plotSize: 2400, zoningType: "COMMERCIAL", roadAccess: true, cornerPlot: true, waterConnection: true, electricityConnection: true }],
  ["Campus View (Private)", "STUDENT_HOUSING", "Bengaluru", 12000, null, null, 220, { roomType: "PRIVATE", beds: 1, distanceFromUniversity: 0.4, wifi: true, laundry: true, commonArea: true, studyRoom: true }],
  ["Hillcrest 1BHK", "APARTMENT", "Pune", 19000, 1, 1, 620, { buildingName: "Hillcrest", floorNumber: 3, totalFloors: 7, elevator: true, balcony: true, parking: true, maintenanceFee: 1500 }],
  ["Whitefield Duplex", "HOUSE", "Bengaluru", 48000, 3, 3, 2100, { bedrooms: 3, bathrooms: 3, floors: 2, garage: true, garden: true }],
  ["Galaxy Apartments 2BHK", "APARTMENT", "Hyderabad", 27000, 2, 2, 1050, { buildingName: "Galaxy", floorNumber: 5, totalFloors: 14, elevator: true, balcony: true, gym: true, parking: true }],
  ["Central Warehouse", "COMMERCIAL", "Mumbai", 120000, null, 2, 6000, { unitType: "WAREHOUSE", carpetArea: 5500, builtUpArea: 6000, washrooms: 2, parkingCapacity: 8, loadingArea: true }],
  ["Greenfield Plot", "LAND", "Chennai", 22000, null, null, 4000, { plotNumber: "GF-14", plotSize: 4000, zoningType: "AGRICULTURAL", roadAccess: true, waterConnection: true, electricityConnection: false }],
];

async function run() {
  const props: any[] = [];
  const docs: any[] = [];
  for (let i = 0; i < P.length; i++) {
    const [name, type, city, rent, rooms, bath, area, details] = P[i];
    const [la, ln, state] = COORDS[city];
    const id = `sx-pn${pad(i + 1)}`;
    const landlordIdx = i % 8;
    props.push({
      id, ref: String(930001 + i), landlordId: `sx-l${pad(landlordIdx + 1)}`, name, type,
      address: `${(i % 40) + 1} ${["MG Road", "Park Ave", "Lake Rd", "Hill St", "Sunrise Blvd"][i % 5]}, ${city}`,
      city, state, country: "India", postalCode: String(400001 + i * 11),
      latitude: la + (((i * 9) % 50) - 25) / 1000, longitude: ln + (((i * 11) % 50) - 25) / 1000,
      description: `${name} — a great ${type.toLowerCase().replace("_", " ")} in ${city}.`,
      rooms, bathrooms: bath, areaSqft: area, furnishing: ["UNFURNISHED", "SEMI_FURNISHED", "FURNISHED"][i % 3],
      rentAmount: rent, securityDeposit: rent * 2, amenities: ["Power Backup", "CCTV Security", "Lift", "Covered Parking"].slice(0, 2 + (i % 3)),
      availability: "AVAILABLE", approved: true, verified: i % 6 !== 0, listedPublic: true, details,
    });
    for (let j = 0; j < 2; j++) {
      const c = (i + j * 4) % 8;
      docs.push({ id: `sx-pn-doc-${pad(i + 1)}-${j}`, ownerId: `sx-l${pad(landlordIdx + 1)}`, propertyId: id, type: "PHOTO", storageKey: `demo/p${c}.png`, fileName: `${id}-${j}.png`, contentType: "image/png", sizeBytes: 4096, label: `${name} ${j + 1}` });
    }
  }
  await prisma.property.createMany({ skipDuplicates: true, data: props });
  await prisma.document.createMany({ skipDuplicates: true, data: docs });
  console.log("added properties:", props.length, "photos:", docs.length);
  await prisma.$disconnect();
}
run().catch((e) => { console.error(e.message); process.exit(1); });
