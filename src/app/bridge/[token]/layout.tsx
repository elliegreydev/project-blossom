/**
 * Never indexed, ever.
 *
 * A bridge link is the credential. The page it opens is somebody's health
 * summary, so one of these turning up in search results is a real leak, not a
 * crawl budget problem.
 *
 * robots.txt disallows this path as well, but that is only advice a polite
 * crawler chooses to follow. This is the part that binds.
 *
 * It lives in a layout because the page itself is a client component, and
 * Next will not take a metadata export from one of those.
 */
export const metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function NoIndexLayout({ children }: { children: React.ReactNode }) {
  return children;
}
