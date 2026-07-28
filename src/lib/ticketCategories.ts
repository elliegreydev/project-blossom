export type TicketCategory = "bug" | "feature_question" | "account_fix" | "safety_privacy" | "report_concern" | "other";

export const TICKET_CATEGORIES: { key: TicketCategory; label: string; desc: string }[] = [
  { key: "bug", label: "Something's not working right", desc: "A bug, crash, or something behaving oddly" },
  { key: "feature_question", label: "A question about a feature", desc: "How something works, or how to use it" },
  { key: "account_fix", label: "Something needs fixing on my account", desc: "A staff member will need to look at your account for this one" },
  { key: "safety_privacy", label: "Worried about safety or privacy", desc: "Anything that's made you feel unsafe or unsure about your data" },
  { key: "report_concern", label: "Report something concerning", desc: "Content, behaviour, or anything else worth flagging" },
  { key: "other", label: "Other", desc: "Doesn't fit the categories above" },
];

export const CATEGORY_LABELS: Record<TicketCategory, string> = Object.fromEntries(
  TICKET_CATEGORIES.map((c) => [c.key, c.label])
) as Record<TicketCategory, string>;
