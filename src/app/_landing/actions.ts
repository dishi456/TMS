"use server";

import { z } from "zod";
import { audit } from "@/lib/audit";

// Public "buy / request access" lead form. There is no Lead model in the SRS,
// so inquiries are persisted to the audit log (actor optional) where they show
// up in the Master Admin activity feed. Best-effort, never throws to the user.
export type InquiryState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof Inquiry, string>>;
};

const schema = z.object({
  name: z.string().min(2, "Please enter your name."),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().max(30).optional().or(z.literal("")),
  organization: z.string().max(120).optional().or(z.literal("")),
  profile: z.enum(["LANDLORD", "AGENCY", "ENTERPRISE"], {
    message: "Pick the option that best describes you.",
  }),
  plan: z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"], {
    message: "Please choose a plan.",
  }),
  units: z.string().max(20).optional().or(z.literal("")),
  message: z.string().max(2000).optional().or(z.literal("")),
});

type Inquiry = z.infer<typeof schema>;

export async function submitInquiry(
  _prev: InquiryState,
  formData: FormData,
): Promise<InquiryState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof Inquiry, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof Inquiry;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const d = parsed.data;

  await audit({
    action: "PURCHASE_INQUIRY",
    entity: "Lead",
    metadata: {
      name: d.name,
      email: d.email.toLowerCase(),
      phone: d.phone || null,
      organization: d.organization || null,
      profile: d.profile,
      plan: d.plan,
      units: d.units || null,
      message: d.message || null,
    },
  });

  return { ok: true };
}
