import type { Metadata, Viewport } from "next";
import { Cairo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import CloudSync from "@/components/CloudSync";
import AuthGate from "@/components/AuthGate";
import Telemetry from "@/components/Telemetry";
import PageViewTracker from "@/components/PageViewTracker";
import DuirbFloat from "@/components/DuirbFloat";
import DuirbTour from "@/components/DuirbTour";

/* الخطوط تُستضاف ذاتياً عبر next/font — صفر طلبات خارجية، بلا انزياح، وتحميل أسرع بكثير */
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://darb-platform.vercel.app"),
  title: "درب | المنصة التي تعاملك كأخ",
  description: "منصة تعليمية سعودية لتأسيس القدرات والتحصيلي وأرامكو CPC — تمارين وخرائط دراسية وذكاء اصطناعي يساعدك تتفوق",
  keywords: ["درب", "منصة تعليمية", "القدرات", "التحصيلي", "أرامكو", "CPC", "تأسيس", "مذاكرة", "Saudi education", "Qudurat", "Tahsili"],
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "درب" },
  openGraph: {
    title: "درب | طريقك للتفوق",
    description: "منصة تعليمية سعودية — تأسيس حقيقي للقدرات والتحصيلي وأرامكو CPC",
    url: "https://darb-platform.vercel.app",
    siteName: "درب",
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "درب | طريقك للتفوق",
    description: "منصة تعليمية سعودية — تأسيس حقيقي للقدرات والتحصيلي وأرامكو CPC",
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
    <html lang="ar" dir="rtl" data-theme="dark" className={`${cairo.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        {/* تهيئة اتصال مبكرة بخوادم Firebase — يسرّع تسجيل الدخول والمزامنة */}
        <link rel="preconnect" href="https://firestore.googleapis.com" crossOrigin="" />
        <link rel="preconnect" href="https://www.googleapis.com" crossOrigin="" />
        <link rel="preconnect" href="https://securetoken.googleapis.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AuthGate>{children}</AuthGate>
        <CloudSync />
        <Telemetry />
        <PageViewTracker />
        <DuirbFloat />
        <DuirbTour />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
