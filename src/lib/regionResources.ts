// Curated, static support resources. Per the Project Blossom spec these are
// informational only, never replace professional advice, always show the
// region they apply to and a "last reviewed" date, and link to the original
// official source. NOT an external directory API by design (see planning
// notes) - avoids drift, tracking, or unreviewed info creeping in.
//
// IMPORTANT: this starter UK list has NOT been reviewed by Ellie yet. It's a
// reasonable starting point (well-established national orgs) but must be
// checked - contact details, eligibility framing, and inclusion itself -
// before this ships to real users. Treat "last reviewed" dates below as
// placeholders until she confirms them.

export type ResourceCategory =
  | "emergency"
  | "crisis"
  | "peer"
  | "legal"
  | "housing"
  | "general";

export interface RegionResource {
  id: string;
  region: string;
  orgName: string;
  category: ResourceCategory;
  contactInfo: string;
  availability: string | null;
  lastReviewedAt: string;
  sourceUrl: string;
}

export const REGION_RESOURCES: RegionResource[] = [
  {
    id: "uk-samaritans",
    region: "UK",
    orgName: "Samaritans",
    category: "crisis",
    contactInfo: "Call 116 123 (free, 24/7)",
    availability: "24 hours a day, every day",
    lastReviewedAt: "2026-07-13",
    sourceUrl: "https://www.samaritans.org",
  },
  {
    id: "uk-switchboard",
    region: "UK",
    orgName: "Switchboard LGBT+ Helpline",
    category: "peer",
    contactInfo: "Call 0300 330 0630, or chat/email via their website",
    availability: "10am-10pm, every day",
    lastReviewedAt: "2026-07-13",
    sourceUrl: "https://switchboard.lgbt",
  },
  {
    id: "uk-mermaids",
    region: "UK",
    orgName: "Mermaids",
    category: "peer",
    contactInfo: "Support for trans, nonbinary, and gender-diverse young people and their families",
    availability: "See website for current hours",
    lastReviewedAt: "2026-07-13",
    sourceUrl: "https://mermaidsuk.org.uk",
  },
  {
    id: "uk-gendered-intelligence",
    region: "UK",
    orgName: "Gendered Intelligence",
    category: "peer",
    contactInfo: "Trans-led community organisation, groups and support",
    availability: "See website",
    lastReviewedAt: "2026-07-13",
    sourceUrl: "https://genderedintelligence.co.uk",
  },
  {
    id: "uk-galop",
    region: "UK",
    orgName: "Galop",
    category: "legal",
    contactInfo: "Call 0800 999 5428 - support around hate crime, abuse, and the law",
    availability: "See website for current hours",
    lastReviewedAt: "2026-07-13",
    sourceUrl: "https://galop.org.uk",
  },
  {
    id: "uk-shelter",
    region: "UK",
    orgName: "Shelter",
    category: "housing",
    contactInfo: "Call 0808 800 4444 - free housing advice",
    availability: "8am-8pm weekdays, 9am-5pm weekends",
    lastReviewedAt: "2026-07-13",
    sourceUrl: "https://england.shelter.org.uk",
  },
  {
    id: "uk-nhs-gender",
    region: "UK",
    orgName: "NHS - gender dysphoria services overview",
    category: "general",
    contactInfo: "Informational only - speak to your GP about referral pathways",
    availability: null,
    lastReviewedAt: "2026-07-13",
    sourceUrl: "https://www.nhs.uk/conditions/gender-dysphoria/",
  },
];

export function resourcesForRegion(region: string | null): RegionResource[] {
  if (!region) return [];
  return REGION_RESOURCES.filter((r) => r.region === region);
}

export const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  emergency: "Emergency",
  crisis: "Crisis support",
  peer: "Peer & community",
  legal: "Legal",
  housing: "Housing",
  general: "General information",
};
