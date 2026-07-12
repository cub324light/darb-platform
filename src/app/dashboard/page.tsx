"use client";
/* ─── لوحة الطالب — واجهة مرحلية تجيب «ماذا أفعل الآن؟» ───
   الهيكل النشط بسيطٌ عمداً: هوية (تحية + بروفايل) + بطل Life Engine (القرار الأول)
   + PhaseHome (لوحةٌ مبنية على مرحلة الطالب لا قالبٌ واحد للجميع). التجربة
   الكلاسيكية (أعمدة/أقسام/ترتيب) محفوظةٌ في DashClassic للتراجع فقط — لا تُركَّب. */
import { useState, useEffect } from "react";
import Link from "next/link";
import PageFooter from "@/components/PageFooter";
import Dome from "@/components/Dome";
import PageGuide from "@/components/PageGuide";
import DashHero from "@/components/DashHero";
import PhaseHome from "@/components/dash/PhaseHome";
import DefCard from "@/components/DefCard";
import { loadUser, loadStats, computeStreak, type DarbUser } from "@/lib/storage";
import dynamic from "next/dynamic";
const RetentionHost = dynamic(() => import("@/components/retention/RetentionHost"), { ssr: false });
/* محفوظ للتراجع الكامل — لا يُركَّب (خلف علمٍ ثابت) فلا تعمل آثاره الجانبية */
const DashClassic = dynamic(() => import("@/components/dash/DashClassic"), { ssr: false });

function computeGreeting(h: number): string {
  if (h < 5) return "وقت الذئاب";
  if (h < 12) return "صباح التفوق";
  if (h < 17) return "وقت التركيز";
  if (h < 21) return "مساء الإنجاز";
  return "الليل للنخبة";
}

export default function DashboardPage() {
  const [user] = useState<DarbUser | null>(() =>
    typeof window !== "undefined" ? loadUser() : null
  );
  const [greeting] = useState(() =>
    typeof window !== "undefined" ? computeGreeting(new Date().getHours()) : ""
  );

  /* مزامنة مع Firestore عند التحميل (تُحدّث lastSeen/الإحصاءات للوحة الأدمن) */
  useEffect(() => {
    const u = loadUser();
    if (!u) return;
    const s = loadStats();
    import("@/lib/firestore").then(({ syncUser }) => {
      syncUser({
        name: u.name,
        track: u.track,
        streak: computeStreak(s),
        focusMins: s.totalFocusMins,
        sessions: s.sessionsCount,
        silver: s.silver,
      });
    });
  }, []);

  return (
    <div className="page">
      <PageGuide pageKey="dashboard" steps={[
        { title: "أهلاً بك في درب", desc: "هذي صفحتك الرئيسية — تعرض أهمّ شيء لمرحلتك الآن، وتجيب سؤالاً واحداً: وش أسوي الحين؟" },
        { title: "قرار واحد", desc: "«الأهمّ الآن» يقرأ حياتك الدراسية ويقترح خطوتك التالية بزرٍّ واحد — ابدأ منه." },
        { title: "مصمّمة لمرحلتك", desc: "البطاقات تحت تتغيّر حسب مرحلتك (ثانوي/جامعي/خريج) — تشوف ما يخدمك فقط." },
      ]} />

      {/* نقاط العودة اليومية — تسجيل اليوم/تقرير أسبوعي/استعادة ستريك/معالم/ترحيب */}
      <RetentionHost />

      {/* ═══ القبة: الهوية + قرار Life Engine الأول ═══ */}
      <Dome compact>
        {/* «أهلاً، محمد» كله زرٌ واحد للبروفايل */}
        <div className="text-right mb-3">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2.5 rounded-2xl px-3.5 py-2 transition active:scale-95 no-underline"
            style={{
              background: "color-mix(in srgb, var(--accent) 16%, transparent)",
              border: "1.5px solid var(--accent)",
            }}
            aria-label="افتح البروفايل">
            <span className="w-8 h-8 rounded-xl flex items-center justify-center text-[18px] font-black text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg, var(--accent-2), var(--accent-light))" }}>
              {(user?.name ?? "د").charAt(0)}
            </span>
            <span className="title-lg" style={{ color: "var(--accent-light)" }}>
              أهلاً، {user ? user.name : <span className="skeleton" style={{ width: "70px", height: "1em", verticalAlign: "middle" }} />}
            </span>
          </Link>
          <p className="text-[17px] font-semibold mt-1.5" style={{ color: "var(--text-muted)" }}>
            {greeting}
          </p>
        </div>

        {/* ماذا أفعل الآن؟ — قرار واحد من Life Engine (بلا جدار نصوص) */}
        <DashHero />
      </Dome>

      {/* ═══ اللوحة المرحلية — تُبنى على مرحلة الطالب، تجيب «وش أسوي الحين؟» ═══ */}
      <div className="page-content mt-4 flex flex-col gap-3">
        <PhaseHome />
        {/* تعريف «درب» — صغير قابل للطيّ (يظهر مرّة للجديد ثم يُطوى) */}
        <DefCard id="darb" q="ما هي درب؟"
          a="منصة ترافقك من الثانوية حتى الوظيفة، وتبني لك خطة تناسب مرحلتك الدراسية." />
      </div>

      <PageFooter />

      {/* محفوظ للتراجع الكامل — لا يُركَّب (العلم false دائماً). لا تُحذف. */}
      {false && <DashClassic />}
    </div>
  );
}
