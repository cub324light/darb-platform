import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import CloudSync from "@/components/CloudSync";

export const metadata: Metadata = {
  metadataBase: new URL("https://darb-platform.vercel.app"),
  title: "درب | المنصة التي تعاملك كأخ",
  description: "YOUR PATH TO EXCELLENCE — تأسيس حقيقي للقدرات والتحصيلي وأرامكو CPC",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "درب" },
  openGraph: {
    title: "درب | طريقك للتفوق",
    description: "تأسيس حقيقي للقدرات والتحصيلي وأرامكو CPC",
    url: "https://darb-platform.vercel.app",
    siteName: "درب",
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "درب | طريقك للتفوق",
    description: "تأسيس حقيقي للقدرات والتحصيلي وأرامكو CPC",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

/* يضبط الثيم ولون شريط المتصفح قبل أول رسم — بدون وميض */
const themeScript = `
try {
  var t = localStorage.getItem("darb_theme") || "dark";
  document.documentElement.setAttribute("data-theme", t);
  var m = document.createElement("meta");
  m.name = "theme-color";
  m.content = t === "light" ? "#F8F4EC" : "#07070D";
  document.head.appendChild(m);
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <CloudSync />
        <Analytics />
      </body>
    </html>
  );
}
