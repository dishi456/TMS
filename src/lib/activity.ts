const LABELS: Record<string, string> = {
  "user.create": "Created user",
  "user.update": "Updated user",
  "user.suspend": "Suspended user",
  "user.activate": "Activated user",
  "user.verify": "Verified tenant",
  "user.unverify": "Removed tenant verification",
  "user.delete": "Deleted user",
  "property.create": "Added property",
  "property.update": "Updated property",
  "property.approve": "Approved property",
  "property.unapprove": "Revoked property approval",
  "property.verifyDocs": "Verified ownership documents",
  "property.unverifyDocs": "Removed document verification",
  "property.delete": "Removed property",
  "property.fileUpload": "Uploaded a file",
  "property.fileDelete": "Deleted a file",
  "lease.create": "Created lease",
  "lease.update": "Updated lease",
  "lease.approve": "Approved lease",
  "lease.renew": "Renewed lease",
  "lease.terminate": "Terminated lease",
  "lease.notice": "Gave notice to end lease",
  "lease.contractUpload": "Uploaded signed contract",
  "lease.contractDelete": "Deleted lease document",
  "landlord.docUpload": "Submitted verification document",
  "landlord.docDelete": "Removed verification document",
  "invoice.generate": "Generated invoices",
  "invoice.markOverdue": "Marked invoices overdue",
  "invoice.cancel": "Cancelled invoice",
  "payment.record": "Recorded payment",
  "payment.verify": "Verified payment",
  "payment.refund": "Processed refund",
  "invoice.remind": "Sent payment reminder",
  "invoice.remindAll": "Sent reminders to all overdue",
  "maintenance.assign": "Assigned maintenance personnel",
  "maintenance.status": "Updated maintenance status",
  "maintenance.close": "Closed maintenance request",
  "maintenance.approve": "Approved maintenance request",
  "maintenance.reject": "Rejected maintenance request",
  "maintenance.resolve": "Resolved maintenance request",
  "rating.flag": "Flagged review",
  "rating.remove": "Removed review",
  "rating.restore": "Restored review",
  "user.reviewSuspend": "Suspended review privileges",
  "user.reviewRestore": "Restored review privileges",
  "register.landlord": "Registered as landlord",
  "register.tenant": "Registered as tenant",
  "user.approve": "Approved account",
  "tenant.approve": "Approved tenant",
  "tenant.add": "Added tenant",
  "complaint.respond": "Responded to complaint",
  "complaint.resolve": "Resolved complaint",
  "complaint.close": "Closed complaint",
  "complaint.status": "Updated complaint status",
  "tenant.rate": "Rated tenant",
  "payment.online": "Paid rent online",
  "maintenance.submit": "Submitted maintenance request",
  "complaint.submit": "Submitted complaint",
  "complaint.reopen": "Reopened complaint",
  "landlord.rate": "Rated landlord",
  "profile.update": "Updated profile",
  "application.approved": "Approved application",
  "application.rejected": "Rejected application",
  "automation.run": "Ran rent automation",
  "visit.confirm": "Confirmed a visit",
  "visit.decline": "Declined a visit",
  "visit.complete": "Completed a visit",
  "visit.cancel": "Cancelled a visit",
};

export function actionLabel(action: string): string {
  return LABELS[action] ?? action;
}

export function timeAgo(date: Date, now = new Date()): string {
  const s = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return date.toLocaleDateString("en-US");
}
