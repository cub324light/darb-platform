"use client";
/* ─── الصفحة الرئيسية — «وش أسوي اليوم؟» ───
   إعادة تنظيمٍ كامل حول اليوم الدراسي: ترحيب → ماذا سأفعل اليوم؟ → أسبوعك → خطة اليوم →
   قريباً/آخر التحديثات/الاختبارات القادمة → إنجازاتك. قراءةٌ فقط من المحرّكات القائمة —
   لا تغيير لأي منطق (تسجيل/دويرب/مساري/أخطائي/المواد/المدرسة). طالب الجامعة/خريج الجامعة
   يُبقون لوحاتهم التشغيلية/المهنية (PhaseHome) كما هي. */
import { useState, useEffect } from "react";
import PageFooter from "@/components/PageFooter";
import Dome from "@/components/Dome";
import WornCosmetics from "@/components/store/WornCosmetics";
import PageGuide from "@/components/PageGuide";
import PhaseHome from "@/components/dash/PhaseHome";
import TodayBlock from "@/components/dash/home/TodayBlock";
import HomeSignals from "@/components/dash/home/HomeSignals";
import Achievements from "@/components/dash/home/Achievements";
import Link from "next/link";
import { loadUser, loadStats, computeStreak, type DarbUser } from "@/lib/storage";
import { helloFor, tipFor } from "@/lib/greeting";
import { greetSeed } from "@/lib/greetSeed";
import Customizable from "@/components/Customizable";
import { isUniversityPhase, isUniversityGraduate } from "@/lib/phase";
import dynamic from "next/dynamic";
const RetentionHost = dynamic(() => import("@/components/retention/RetentionHost"), { ssr: false });

export default function DashboardPage() {
  const [init] = useState(() => {
    if (typeof window === "undefined") return null;
    const u = loadUser();
    const now = new Date();
    /* عشوائيٌّ لكلّ **زيارة** لا لكلّ صفحة: البذرةُ في `sessionStorage`، فلا
       تتبدّل التحيّةُ كلّما انتقل بين الرئيسية ومساري وهو لم يغادر جلسته. */
    const seed = greetSeed();
    return {
      user: u,
      hello: helloFor(now.getHours(), seed.hello),
      tip: tipFor(seed.tip),
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
              {init?.hello.before ?? "السلام عليكم، "}
              {user ? user.name : <span className="skeleton" style={{ width: "70px", height: "1em", verticalAlign: "middle" }} />}
              {init?.hello.after}
            </span>
          </Link>
          <div className="mt-1.5"><WornCosmetics /></div>
          {/* كان هنا اسمُ الوقت («وقت التركيز») — لا يفيد الطالبَ بشيء.
              صار نصيحةً عمليةً أو دفعةً، تُنتقى عشوائياً في كل زيارة. */}
          <p className="t-body font-bold mt-2 leading-relaxed" style={{ color: "var(--text)" }}>{init?.tip}</p>
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
          <Customizable page="dashboard" className="flex flex-col gap-4" sections={[
            { id: "today", label: "ماذا سأفعل اليوم؟", desc: "مهامك وساعاتك وأقرب اختبار", node: <TodayBlock /> },
            { id: "signals", label: "قريباً وآخر التحديثات", desc: "مواعيد الجهات الرسمية وأخبار درب", node: <HomeSignals /> },
            { id: "achievements", label: "إنجازاتك", desc: "أيامك المتتالية وجلساتك وساعاتك", node: <Achievements /> },
          ]} />
        )}
      </div>

      <PageFooter />
    </div>
  );
}
