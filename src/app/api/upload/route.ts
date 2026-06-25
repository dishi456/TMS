import { randomUUID } from "crypto";
import path from "path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/storage";
import { getMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

// Generic authenticated upload endpoint used by the ImageUploader component.
// Saves the file, creates a Document with the right type/links per `purpose`,
// and returns { id, url }. Each purpose enforces its own ownership check.
export async function POST(req: Request) {
  const session = await auth();
  let userId = session?.user?.id;
  let role = session?.user?.role as string | undefined;
  if (!userId) {
    const m = await getMobileUser(req);
    if (m) { userId = m.id; role = m.role; }
  }
  if (!userId || !role) return json({ error: "Unauthorized" }, 401);

  const form = await req.formData();
  const purpose = String(form.get("purpose") || "");
  const refId = form.get("refId") ? String(form.get("refId")) : null;
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return json({ error: "No file" }, 400);
  if (file.size > MAX_BYTES) return json({ error: "File too large (max 8 MB)" }, 413);

  // Resolve doc type, storage prefix, owner, and links per purpose (with auth).
  let type: "PHOTO" | "PROPERTY_PROOF" | "GOVERNMENT_ID" | "LEASE" | "OTHER" = "OTHER";
  let prefix = "misc";
  let ownerId = userId;
  let propertyId: string | null = null;
  let leaseId: string | null = null;

  switch (purpose) {
    case "property-photo":
    case "property-proof": {
      if (!refId) return json({ error: "Missing property" }, 400);
      const where = role === "MASTER_ADMIN" ? { id: refId } : { id: refId, landlordId: userId };
      const property = await prisma.property.findFirst({ where, select: { id: true, landlordId: true } });
      if (!property) return json({ error: "Property not found" }, 403);
      // Cap property galleries at 10 photos.
      if (purpose === "property-photo") {
        const photoCount = await prisma.document.count({ where: { propertyId: refId, type: "PHOTO" } });
        if (photoCount >= 10) return json({ error: "Photo limit reached (max 10 per property). Delete one first." }, 400);
      }
      type = purpose === "property-photo" ? "PHOTO" : "PROPERTY_PROOF";
      prefix = `properties/${refId}`;
      ownerId = property.landlordId;
      propertyId = refId;
      break;
    }
    case "lease-contract": {
      if (!refId) return json({ error: "Missing lease" }, 400);
      const where = role === "MASTER_ADMIN" ? { id: refId } : { id: refId, landlordId: userId };
      const lease = await prisma.lease.findFirst({ where, select: { id: true, landlordId: true } });
      if (!lease) return json({ error: "Lease not found" }, 403);
      type = "LEASE";
      prefix = `leases/${refId}`;
      ownerId = lease.landlordId;
      leaseId = refId;
      break;
    }
    case "verification-aadhaar":
      type = "GOVERNMENT_ID";
      prefix = `users/${userId}`;
      break;
    case "verification-photo":
    case "avatar":
      type = "PHOTO";
      prefix = `users/${userId}`;
      break;
    case "profile-id":
      type = "GOVERNMENT_ID";
      prefix = `users/${userId}`;
      break;
    case "profile-other":
      type = "OTHER";
      prefix = `users/${userId}`;
      break;
    case "maintenance-image":
      type = "PHOTO";
      prefix = `maintenance/${userId}`;
      break;
    case "marketplace-photo":
      type = "PHOTO";
      prefix = `marketplace/${userId}`;
      break;
    case "payment-proof":
      type = "OTHER";
      prefix = `payments/${userId}`;
      break;
    case "chat-attachment":
      type = "PHOTO";
      prefix = `chat/${userId}`;
      break;
    default:
      return json({ error: "Unknown purpose" }, 400);
  }

  // Content-type allowlist: photos must be images; documents may also be PDF.
  // Blocks HTML/SVG/script uploads that could be served back as stored XSS.
  const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/heic", "image/heif", "image/gif"];
  const allowed = type === "PHOTO" ? IMAGE_TYPES : [...IMAGE_TYPES, "application/pdf"];
  if (!allowed.includes((file.type || "").toLowerCase())) {
    return json({ error: "Unsupported file type. Upload an image" + (type === "PHOTO" ? "." : " or PDF.") }, 415);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name).slice(0, 10);
  const key = `${prefix}/${randomUUID()}${ext}`;
  await saveFile(key, bytes);

  // For ID/profile uploads the caller passes the document type (e.g. "Passport")
  // as refId — store it as the label so the Documents list can show the type.
  const label = (purpose === "profile-id" || purpose === "profile-other") && refId ? refId : file.name;

  const doc = await prisma.document.create({
    data: {
      ownerId,
      propertyId,
      leaseId,
      type,
      storageKey: key,
      fileName: file.name,
      contentType: file.type || null,
      sizeBytes: bytes.length,
      label,
    },
  });

  // Lease contract: mirror onto the lease for convenience.
  if (purpose === "lease-contract" && leaseId) {
    await prisma.lease.update({ where: { id: leaseId }, data: { signedContractUrl: `/api/files/${doc.id}` } });
  }

  return json({ id: doc.id, url: `/api/files/${doc.id}`, fileName: file.name });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
