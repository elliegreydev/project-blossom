// Whether this build is the dev deployment that Grey Studios HQ is the front
// door for.
//
// On dev, staff arrive through /api/hq-enter already signed in, so the email
// code sign-in is hidden. Dev's Supabase auth is misconfigured for codes in
// any case (eight digit codes against a six digit input, no code in the
// template, two emails an hour), and nobody needs it there any more.
//
// Production must keep its email sign-in exactly as it is, because that is
// how real people turn on cloud sync. Two independent conditions have to hold
// before anything changes, and production satisfies neither:
//
//   1. NEXT_PUBLIC_HQ_DEV_ENTRY must be "1". It is set only on the
//      project-blossom-dev Vercel project. Absent anywhere else, and absent
//      means production behaviour.
//   2. The Supabase project the build points at must be one of the known dev
//      projects below. Production points at a different project entirely, so
//      even if the flag above were set on production by mistake, its sign-in
//      would still be untouched.
//
// Both are read at runtime from the build's own environment. No shared
// sign-in code is deleted or branched away, it is simply not rendered on dev.

const DEV_SUPABASE_PROJECT_REFS = ["yqxpwxjmpyuqcwucjwqk"];

export function isHqDevEntry(): boolean {
  if (process.env.NEXT_PUBLIC_HQ_DEV_ENTRY !== "1") return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return DEV_SUPABASE_PROJECT_REFS.some((ref) => url.includes(ref));
}
