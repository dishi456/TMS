import { prisma } from "@/lib/prisma";
import { deleteVerificationDoc } from "@/app/landlord/verification/actions";
import { ImageUploader } from "@/components/ImageUploader";

// Reusable verification document manager for a landlord:
// Aadhaar (GOVERNMENT_ID) + property photo (PHOTO). Used on the verification
// page and the pending-onboarding screen.
export async function VerificationDocs({ userId }: { userId: string }) {
  const docs = await prisma.document.findMany({
    where: { ownerId: userId, propertyId: null, leaseId: null },
    orderBy: { createdAt: "desc" },
  });
  const aadhaar = docs.filter((d) => d.type === "GOVERNMENT_ID");
  const photos = docs.filter((d) => d.type === "PHOTO");

  return (
    <div className="space-y-4">
      <DocSection title="Aadhaar card" kind="AADHAAR" accept="image/*,application/pdf" docs={aadhaar} emptyText="No Aadhaar uploaded yet." />
      <DocSection title="Property photo" kind="PROPERTY" accept="image/*" docs={photos} emptyText="No property photo uploaded yet." />
    </div>
  );
}

function DocSection({
  title,
  kind,
  accept,
  docs,
  emptyText,
}: {
  title: string;
  kind: "AADHAAR" | "PROPERTY";
  accept: string;
  docs: { id: string; label: string | null }[];
  emptyText: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      {docs.length === 0 ? (
        <p className="mt-1 text-sm text-slate-400">{emptyText}</p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-sm">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2">
              <a href={`/api/files/${d.id}`} target="_blank" rel="noreferrer" className="truncate text-blue-600 hover:text-blue-700">
                {d.label ?? "Document"}
              </a>
              <form action={deleteVerificationDoc}>
                <input type="hidden" name="docId" value={d.id} />
                <button className="text-xs text-red-500 hover:text-red-600">remove</button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 border-t border-slate-100 pt-3">
        <ImageUploader
          purpose={kind === "AADHAAR" ? "verification-aadhaar" : "verification-photo"}
          accept={accept}
        />
      </div>
    </div>
  );
}
