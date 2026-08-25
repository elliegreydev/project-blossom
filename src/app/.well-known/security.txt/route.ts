/**
 * RFC 9116 security.txt.
 *
 * The first thing somebody checks before deciding whether to report a
 * vulnerability privately or just post it. Blossom had nothing here, which
 * leaves a would-be reporter guessing at where to send it and whether anyone
 * will read it.
 *
 * Somebody found two real issues in August 2026 and chose to report them
 * quietly rather than publish, which is the outcome this file exists to make
 * more likely next time.
 *
 * Deliberately no PGP key. Offering one and then not being set up to use it is
 * worse than not offering, and email is honest about what actually happens.
 *
 * Served as a route rather than a static file so Expires stays in the future
 * without anybody having to remember to edit it. A stale Expires date reads as
 * an abandoned project, which is the opposite of the point.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  // A year out, recomputed on every request.
  const expires = new Date();
  expires.setUTCFullYear(expires.getUTCFullYear() + 1);

  const body = [
    "# Blossom takes security reports seriously and will not take action",
    "# against anyone who reports something in good faith.",
    "",
    "Contact: mailto:support@projectblossom.net",
    `Expires: ${expires.toISOString().replace(/\.\d{3}Z$/, "Z")}`,
    "Preferred-Languages: en",
    "Canonical: https://projectblossom.net/.well-known/security.txt",
    "Policy: https://github.com/elliegreydev/project-blossom#found-a-problem",
    "",
    "# What to expect:",
    "#   A reply within a few days. Blossom is run by one person, so it may",
    "#   not be immediate, but every report is read.",
    "#",
    "# What helps:",
    "#   Please give me a chance to fix it before posting details publicly.",
    "#   You do not need to prove an issue by exploiting it. A description of",
    "#   where to look is enough and is genuinely preferred.",
    "#",
    "# What is in scope:",
    "#   projectblossom.net and the source at",
    "#   github.com/elliegreydev/project-blossom",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
