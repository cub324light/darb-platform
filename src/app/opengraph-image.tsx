import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "درب — طريقك للتفوق";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const tajawal = await readFile(join(process.cwd(), "src/assets/Tajawal-Bold.ttf"));

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
          background: "radial-gradient(circle at 50% 35%, #3a5bd0 0%, #1b2a70 70%, #15235e 100%)",
          fontFamily: "Tajawal",
          color: "#FFFFFF",
          direction: "rtl",
        }}
      >
        <div style={{ fontSize: 220, fontWeight: 700, lineHeight: 1, color: "#FFFFFF" }}>درب</div>

        {/* الكلمات معكوسة في المصدر لأن Satori يصفّها يساراً—لتظهر "طريقك للتفوق" */}
        <div style={{ fontSize: 50, fontWeight: 700, marginTop: 22, color: "#cdd8ff" }}>
          للتفوق طريقك
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Tajawal", data: tajawal, style: "normal", weight: 700 }],
    }
  );
}
