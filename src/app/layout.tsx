import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sky from "@/components/Sky";

export const metadata: Metadata = {
  title: "درب | المنصة التي تعاملك كأخ",
  description: "YOUR PATH TO EXCELLENCE — تأسيس حقيقي للقدرات والتحصيلي وأرامكو CPC",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "درب" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0A0A0F",
};

/* تطبيق الثيم قبل الرسم — بدون وميض */
const themeScript = `
try {
  var t = localStorage.getItem("darb_theme") || "dark";
  document.documentElement.setAttribute("data-theme", t);
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Sky />
        <div className="relative z-[1]">{children}</div>
      </body>
    </html>
  );
}
