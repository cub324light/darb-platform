import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import AnalyticsGate from "@/components/AnalyticsGate";
import CloudSync from "@/components/CloudSync";
import GradeSync from "@/components/GradeSync";
import AuthGate from "@/components/AuthGate";
import Telemetry from "@/components/Telemetry";
import PageViewTracker from "@/components/PageViewTracker";
import DuirbFloat from "@/components/DuirbFloat";
import DuirbTour from "@/components/DuirbTour";
import BroadcastHost from "@/components/BroadcastHost";
import ThemeGuard from "@/components/ThemeGuard";
import StructuredData from "@/components/StructuredData";
import WebMcp from "@/components/WebMcp";

/* خطٌّ واحدٌ للهوية كلها: IBM Plex Sans Arabic — يُستضاف ذاتياً عبر next/font (صفر
   طلبات خارجية، بلا انزياح). أربعة أوزانٍ فقط (Regular/Medium/SemiBold/Bold) —
   أيّ وزنٍ أثقل يُثبَّت تلقائياً على Bold. يخدم العربية والإنجليزية والأرقام بخطٍّ
   واحد متناسق (الأرقام تُحاذى عبر tabular-nums، بلا خطٍّ مونو منفصل). */
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://usedarb.com"),
  title: "درب | المنصة التي تعاملك كأخ",
  description: "منصة تعليمية سعودية لتأسيس القدرات والتحصيلي وأرامكو CPC — تمارين وخرائط دراسية وذكاء اصطناعي يساعدك تتفوق",
  keywords: ["درب", "منصة تعليمية", "القدرات", "التحصيلي", "أرامكو", "CPC", "تأسيس", "مذاكرة", "Saudi education", "Qudurat", "Tahsili"],
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
    languages: { "ar-SA": "/", "x-default": "/" },
    types: { "application/rss+xml": "/feed.xml" },
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" } },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "درب" },
  openGraph: {
    title: "درب | طريقك للتفوق",
    description: "منصة تعليمية سعودية — تأسيس حقيقي للقدرات والتحصيلي وأرامكو CPC",
    url: "https://usedarb.com",
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
  // نسمح بالتكبير لإتاحة الوصول (Accessibility) — منعُ التكبير يُسقِط درجة Lighthouse
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07070D" },
    { media: "(prefers-color-scheme: light)", color: "#F8F4EC" },
  ],
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
  /* لا نكتب data-theme في JSX: الـ hydration كان يعيدها إلى "dark" فيطمس
     ثيم المستخدم المحفوظ (النهاري). الافتراضي في CSS داكن بلا سمة،
     وthemeScript يضبط القيمة المخزنة قبل أول رسم — وReact لا يمسّ سمة لا يرسمها. */
  return (
    <html lang="ar" dir="rtl" className={plexArabic.variable} suppressHydrationWarning>
      <head>
        {/* تهيئة اتصال مبكرة بخوادم Firebase — يسرّع تسجيل الدخول والمزامنة */}
        <link rel="preconnect" href="https://firestore.googleapis.com" crossOrigin="" />
        <link rel="preconnect" href="https://www.googleapis.com" crossOrigin="" />
        <link rel="preconnect" href="https://securetoken.googleapis.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
        {/* اكتشافٌ آليّ: يقود الوكيلَ من أي صفحةٍ إلى وصف الموقع المخصّص له.
            `rel="alternate"` للنُسخ البديلة، و`rel="service-desc"` (RFC 8631)
            لوصف الواجهة، و`rel="describedby"` للمخطّطات. */}
        <link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt" />
        <link rel="alternate" type="text/plain" href="/llms-full.txt" title="llms-full.txt" />
        <link rel="alternate" type="text/markdown" href="/agents.md" title="agents.md" />
        <link rel="service-desc" type="application/json" href="/openapi.json" title="OpenAPI 3.1" />
        <link rel="service-doc" type="text/html" href="/docs/api" title="توثيق الواجهة" />
        <link rel="describedby" type="application/schema+json" href="/schemas.json" title="JSON Schema" />
        <link rel="alternate" type="application/json" href="/agents.json" title="agents.json" />
        <link rel="alternate" type="application/json" href="/.well-known/agent-card.json" title="Agent Card" />
        <link rel="alternate" type="application/rss+xml" href="/feed.xml" title="آخر تحديثات درب" />
        {/* وسومٌ نصّية يقرأها الفاحصون والوكلاء الذين لا يتبعون الروابط */}
        <meta name="ai-content-declaration" content="human-authored" />
        <meta name="ai-crawler-policy" content="allow" />
        <meta name="ai-training" content="allowed-with-attribution" />
        <meta name="ai-policy" content="https://usedarb.com/ai.txt" />
        <meta name="llms-txt" content="https://usedarb.com/llms.txt" />
        <meta name="mcp-server" content="https://usedarb.com/mcp" />
        <meta name="openapi" content="https://usedarb.com/openapi.json" />
        <meta name="agent-manifest" content="https://usedarb.com/.well-known/agent-card.json" />
        <meta name="citation-policy" content="required" />
        <StructuredData />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeGuard />
        <a href="#darb-main" className="skip-link">تخطى للمحتوى</a>
        <div id="darb-main" tabIndex={-1} style={{ outline: "none" }}>
          <AuthGate>{children}</AuthGate>
        </div>
        <CloudSync />
        <GradeSync />
        <Telemetry />
        <PageViewTracker />
        <DuirbFloat />
        <DuirbTour />
        <BroadcastHost />
        <WebMcp />
        <AnalyticsGate />
      </body>
    </html>
  );
}
