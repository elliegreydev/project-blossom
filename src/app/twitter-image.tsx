// Twitter and Bluesky read their own tag when it exists and fall back to the
// Open Graph one when it doesn't. Re-exporting rather than keeping a second
// design means the two can never drift apart.
export { default, alt, size, contentType } from "./opengraph-image";
