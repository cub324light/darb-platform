"use client";
/* ─── الصفحة الرئيسية — «وش أسوي اليوم؟» ───
   إعادة تنظيمٍ كامل حول اليوم الدراسي: ترحيب → ماذا سأفعل اليوم؟ → أسبوعك → خطة اليوم →
   قريباً/آخر التحديثات/الاختبارات القادمة → إنجازاتك. قراءةٌ فقط من المحرّكات القائمة —
   لا تغيير لأي منطق (تسجيل/دويرب/مساري/أخطائي/المواد/المدرسة). طالب الجامعة/خريج الجامعة
   يُبقون لوحاتهم التشغيلية/المهنية (PhaseHome) كما هي. */
import { useState, useEffect } from "react";
import PageFooter from "@/components/PageFooter";
import Dome from "@/components/Dome";
import PageGuide from "@/components/PageGuide";
import PhaseHome from "@/components/dash/PhaseHome";
import TodayBlock from "@/components/dash/home/TodayBlock";
import HomeSignals from "@/components/dash/home/HomeSignals";
import Achievements from "@/components/dash/home/Achievements";
import Link from "next/link";
import { loadUser, loadStats, computeStreak, type DarbUser } from "@/lib/storage";
import { isUniversityPhase, isUniversityGraduate } from "@/lib/phase";
import dynamic from "next/dynamic";
const RetentionHost = dynamic(() => import("@/components/retention/RetentionHost"), { ssr: false });

function computeGreeting(h: number): string {
  if (h < 5) return "وقت الذئاب";
  if (h < 12) return "صباح التفوق";
  if (h < 17) return "وقت التركيز";
  if (h < 21) return "مساء الإنجاز";
  return "الليل للنخبة";
}

/* شعار اليوم — سطرٌ تحفيزي ثابت لكل يوم (دوري، لا عشوائي كي لا يقفز عند إعادة التحميل). */
const SLOGANS = [
  "خطوةٌ اليوم خيرٌ من قفزةٍ غداً.",
  "الاستمرار أقوى من الحماس.",
  "أنت أقرب مما تظن — واصل.",
  "كل جلسةٍ تقرّبك من هدفك.",
  "التفوّق عادةٌ لا صدفة.",
  "ابدأ صغيراً، لكن ابدأ الآن.",
  "يومٌ منظّم يساوي أسبوعاً مبعثراً.",
];

export default function DashboardPage() {
  const [init] = useState(() => {
    if (typeof window === "undefined") return null;
    const u = loadUser();
    const now = new Date();
    const dayIdx = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    return {
      user: u,
      greeting: computeGreeting(now.getHours()),
      slogan: SLOGANS[dayIdx % SLOGANS.length],
      showPhaseBoard: isUniversityPhase(u) || isUniversityGraduate(u),
    };
  });
  const user: DarbUser | null = init?.user ?? null;

  /* مزامنة مع Firestore عند التحميل (تُحدّث lastSeen/الإحصاءات للوحة الأدمن) */
  useEffect(() => {
    const u = loadUser();
    if (!u) return;
    const s = loadStats();
    import("@/lib/firestore").then(({ syncUser }) => {
      syncUser({ name: u.name, track: u.track, streak: computeStreak(s), focusMins: s.totalFocusMins, sessions: s.sessionsCount, silver: s.silver });
    });
  }, []);

  return (
    <div className="page">
      <PageGuide pageKey="dashboard" steps={[
        { title: "أهلاً بك في درب", desc: "هذي صفحتك الرئيسية — تجيب سؤالاً واحداً كل يوم: وش أسوي اليوم؟" },
        { title: "ابدأ من الأعلى", desc: "بطاقة «ماذا سأفعل اليوم؟» تجمع مهامك وساعاتك وأقرب اختبار — ثم أسبوعك وخطة يومك." },
        { title: "رسميٌّ وواضح", desc: "«قريباً» و«آخر التحديثات» تعرض مواعيد ومعلومات الجهات الرسمية فقط." },
      ]} />

      {/* ═══ 1) الترحيب: السلام + الاسم + شعار اليوم ═══ */}
      <Dome compact>
        <div className="text-right">
          <Link href="/profile"
            className="inline-flex items-center gap-2.5 rounded-2xl px-3.5 py-2 transition active:scale-95 no-underline"
            style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", border: "1.5px solid var(--accent)" }}
            aria-label="افتح البروفايل">
            <span className="w-8 h-8 rounded-xl flex items-center justify-center text-[18px] font-black text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg, var(--accent-2), var(--accent-light))" }}>
              {(user?.name ?? "د").charAt(0)}
            </span>
            <span className="title-lg" style={{ color: "var(--accent-light)" }}>
              السلام عليكم، {user ? user.name : <span className="skeleton" style={{ width: "70px", height: "1em", verticalAlign: "middle" }} />}
            </span>
          </Link>
          <p className="text-[17px] font-bold mt-2" style={{ color: "var(--text)" }}>{init?.greeting}</p>
          <p className="t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>{init?.slogan}</p>
        </div>
      </Dome>

      {/* ═══ الجسم ═══ */}
      <div className="page-content mt-4 flex flex-col gap-4">
        {/* نقاط العودة اليومية — تحت القبّة لا فوقها: كانت تُزيح ترويسة التطبيق
            كلّها لأسفل فتبدو شريطَ تنبيهٍ من المتصفّح لا جزءاً من درب. */}
        <RetentionHost />

        {init?.showPhaseBoard ? (
          /* الجامعي/خريج الجامعة: لوحاتهم التشغيلية/المهنية كما هي */
          <PhaseHome />
        ) : (
          <>
            <TodayBlock />
            <HomeSignals />
            <Achievements />
          </>
        )}
      </div>

      <PageFooter />
    </div>
  );
}
