import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Favicon: "N" wordmark in Outfit (same typeface as the NextWorth logo)
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const outfit = await readFile(
    join(process.cwd(), "src/app/_fonts/Outfit-Bold.ttf")
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "Outfit",
          fontSize: 24,
          fontWeight: 700,
          borderRadius: 7,
        }}
      >
        N
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Outfit", data: outfit, weight: 700, style: "normal" }],
    }
  );
}
