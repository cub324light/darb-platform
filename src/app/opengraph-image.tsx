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
          background: "linear-gradient(135deg, #F5B40A 0%, #D4920A 100%)",
          fontFamily: "Tajawal",
          color: "#2563EB",
          direction: "rtl",
        }}
      >
        <div style={{ fontSize: 220, fontWeight: 700, lineHeight: 1, color: "#2563EB" }}>درب</div>

        {/* الكلمات معكوسة في المصدر لأن Satori يصفّها يساراً—لتظهر "طريقك للتفوق" */}
        <div style={{ fontSize: 50, fontWeight: 700, marginTop: 22, color: "#1E40AF" }}>
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
