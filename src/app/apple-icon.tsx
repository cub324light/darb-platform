import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const tajawal = await readFile(join(process.cwd(), "src/assets/Tajawal-Bold.ttf"));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2563EB 0%, #16275B 60%, #07070D 100%)",
          fontFamily: "Tajawal",
          color: "#FFFFFF",
          fontWeight: 700,
          fontSize: 88,
        }}
      >
        درب
      </div>
    ),
    { ...size, fonts: [{ name: "Tajawal", data: tajawal, style: "normal", weight: 700 }] }
  );
}
