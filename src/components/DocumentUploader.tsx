"use client";

import { useState } from "react";
import { ImageUploader } from "@/components/ImageUploader";

// The identity-document types offered on web, matching the mobile app.
const DOC_TYPES = [
  "Passport",
  "Driver's License",
  "National ID",
  "Aadhaar",
  "PAN Card",
  "Student ID",
  "Work Permit",
  "Visa",
  "Other Government ID",
];

const fieldCls = "rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

// Pick a specific document type (+ optional number & expiry) before uploading.
// Stores the type in Document.label and the metadata on the Document row.
export function DocumentUploader({ purpose = "profile-id" }: { purpose?: string }) {
  const [type, setType] = useState(DOC_TYPES[0]);
  const [docNumber, setDocNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Document type</span>
          <select value={type} onChange={(e) => setType(e.target.value)} className={fieldCls}>
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Document number (optional)</span>
          <input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="e.g. last 4 digits" className={fieldCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Expiry date (optional)</span>
          <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={fieldCls} />
        </label>
      </div>
      <ImageUploader
        purpose={purpose}
        refId={type}
        accept="image/*,application/pdf"
        buttonLabel="Upload document"
        extraFields={{ docNumber, expiryDate }}
      />
    </div>
  );
}
