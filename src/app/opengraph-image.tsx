import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * The link preview card.
 *
 * Blossom had no Open Graph metadata at all, so every link anyone shared, on
 * Reddit, in Discord, in a group chat, arrived as a bare blue URL with no card
 * at all. For an app asking people to trust it with this kind of information,
 * a naked link is the wrong first impression, and it was the first impression
 * everybody got.
 *
 * WHY IT SAYS SO LITTLE.
 *
 * The wording here is deliberately the same as the app's own description, and
 * it does not mention what Blossom is for. A preview card turns up wherever
 * the link is pasted, and the person pasting it does not control that: a work
 * Slack, a family group chat, a shared screen. Blossom lets people rename its
 * sections and hide it behind a lock for exactly this reason, and a card that
 * announced itself would undo all of that at the moment of sharing. Somebody
 * who is looking for this app will recognise it. Somebody glancing over a
 * shoulder will not.
 *
 * Satori, which renders this, only supports flexbox and a subset of CSS, and
 * the whole thing has to fit in 500KB including the image. Hence the 192px
 * icon rather than the 512px one, and no grid anywhere.
 */

export const alt = "Project Blossom";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const icon = await readFile(join(process.cwd(), "public/icon-192.png"));
  const iconSrc = `data:image/png;base64,${icon.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          // Her dark palette, the same tokens the app itself uses.
          background: "linear-gradient(150deg, #1F1729 0%, #181320 55%, #14101B 100%)",
        }}
      >
        {/* A soft band of the two brand colours, kept low so the card reads
            as calm rather than as an advert. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 10,
            display: "flex",
            background: "linear-gradient(90deg, #FF7DBA 0%, #C99BFF 100%)",
          }}
        />

        <img
          src={iconSrc}
          width={148}
          height={148}
          alt=""
          style={{ borderRadius: 36 }}
        />

        <div
          style={{
            display: "flex",
            fontSize: 92,
            fontWeight: 600,
            color: "#F6EEF9",
            marginTop: 44,
            letterSpacing: -2,
          }}
        >
          Blossom
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 36,
            color: "#B9A7C6",
            marginTop: 18,
          }}
        >
          A gentle companion for your journey.
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 27,
            color: "#FF7DBA",
            marginTop: 56,
            letterSpacing: 1,
          }}
        >
          projectblossom.net
        </div>
      </div>
    ),
    size,
  );
}
