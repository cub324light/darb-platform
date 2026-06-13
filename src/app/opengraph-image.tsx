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
          background: "linear-gradient(135deg, #16275B 0%, #07070D 100%)",
          fontFamily: "Tajawal",
          color: "#FFFFFF",
          direction: "rtl",
        }}
      >
        {/* علامة الدرب: مسار يصعد نحو النجمة */}
        <svg width="190" height="190" viewBox="0 0 512 512" style={{ marginBottom: 24 }}>
          <path
            d="M110 400 C 210 400 250 330 250 260 C 250 195 290 150 380 142"
            stroke="#2563EB"
            strokeWidth="38"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="110" cy="400" r="26" fill="#60A5FA" />
          <path d="M396 78 l17 46 46 17 -46 17 -17 46 -17 -46 -46 -17 46 -17 z" fill="#F5B40A" />
        </svg>

        <div style={{ fontSize: 190, fontWeight: 700, lineHeight: 1, color: "#60A5FA" }}>درب</div>

        {/* الكلمات معكوسة في المصدر لأن Satori يصفّها يساراً—لتظهر "طريقك للتفوق" */}
        <div style={{ fontSize: 50, fontWeight: 700, marginTop: 22, color: "#E5E7EB" }}>
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
