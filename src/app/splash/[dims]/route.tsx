import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SPLASH_SIZES, splashDims } from "@/lib/appleSplash";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  return SPLASH_SIZES.map((size) => ({ dims: splashDims(size) }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ dims: string }> }) {
  const { dims } = await params;
  const size = SPLASH_SIZES.find((s) => splashDims(s) === dims);
  if (!size) {
    return new Response("Not found", { status: 404 });
  }

  const iconBuffer = await readFile(join(process.cwd(), "public", "icon-512.png"));
  const iconDataUri = `data:image/png;base64,${iconBuffer.toString("base64")}`;
  const markSize = Math.round(size.width * 0.28);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #f7b4c8 0%, #c4b6f6 100%)",
        }}
      >
        <img
          src={iconDataUri}
          width={markSize}
          height={markSize}
          style={{ borderRadius: Math.round(markSize * 0.24) }}
        />
      </div>
    ),
    { width: size.width, height: size.height }
  );
}
