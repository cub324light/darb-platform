"use client";
/* ─── الواجهة المرحلية للوحة الطالب ───
   الصفحة الرئيسية تُبنى على مرحلة الطالب لا على قالبٍ واحد للجميع، وتجيب سؤالاً
   واحداً: «ماذا أفعل الآن؟». لا نعرض ما لا يخدم المرحلة الحالية.
   - ثانوي (أول/ثاني/ثالث): أربع بطاقات قرارٍ فقط + الاختبار القادم + الجامعات لثالثٍ فقط.
   - جامعي: عالمه الكامل (DashUniWorld) — مواد/معدّل/مسار/أدوات.
   - خريج: لوحة مهنية — وظائف/مسارات/مهارات.
   مصدر المرحلة الوحيد: phaseExperience (لا شروط studyLevel مبعثرة).
   قراءة كسولة واحدة SSR-safe (مثل DashHero/DashUniWorld) — لا setState في effect. */
import { useState } from "react";
import Link from "next/link";
import DashUniWorld from "@/components/DashUniWorld";
import { phaseExperience } from "@/lib/experience";
import { loadUser } from "@/lib/storage";
import { readLifeContext } from "@/lib/lifeEngine";

interface Tile { icon: string; title: string; desc: string; href?: string; event?: string; }

/* بطاقة قرارٍ واحدة — رابط تنقّل أو زرّ حدث (دويرب). لا محتوى inline. */
function TileCard({ t }: { t: Tile }) {
  const inner = (
    <>
      <span className="text-[20px] leading-none flex-shrink-0" aria-hidden="true">{t.icon}</span>
      <span className="flex flex-col min-w-0">
        <span className="t-body font-black leading-tight" style={{ color: "var(--text)" }}>{t.title}</span>
        <span className="t-caption truncate" style={{ color: "var(--text-muted)" }}>{t.desc}</span>
      </span>
    </>
  );
  const cls = "ds-card ds-card-tight ds-card-interactive flex items-center gap-2.5 no-underline w-full text-right";
  return t.href
    ? <Link href={t.href} className={cls}>{inner}</Link>
    : <button onClick={() => window.dispatchEvent(new CustomEvent(t.event!))} className={cls}>{inner}</button>;
}

function Board({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {tiles.map((t) => <TileCard key={t.title} t={t} />)}
    </div>
  );
}

/* قسم «الاختبار القادم» — سطرٌ موجز من أقرب اختبارٍ للطالب (يُخفى إن لا اختبار). */
function NextExam({ qiyas }: { qiyas: { label: string; days: number; approximate?: boolean } }) {
  const urgent = qiyas.days <= 14;
  const c = qiyas.days <= 3 ? "var(--danger)" : qiyas.days <= 14 ? "var(--gold)" : "var(--accent-light)";
  return (
    <section className="ds-card ds-card-tight flex items-center gap-3"
      style={{ borderColor: `color-mix(in srgb, ${c} ${urgent ? 34 : 22}%, var(--border))` }}>
      <span className="text-[20px] leading-none flex-shrink-0" aria-hidden="true">⏳</span>
      <div className="flex-1 min-w-0">
        <p className="t-caption" style={{ color: "var(--text-muted)" }}>الاختبار القادم</p>
        <p className="t-body font-black leading-tight" style={{ color: "var(--text)" }}>{qiyas.label}</p>
      </div>
      <span className="font-mono-nums font-black text-[15px] flex-shrink-0" style={{ color: c }}>
        بعد {qiyas.approximate ? "~" : ""}{qiyas.days} يوم
      </span>
    </section>
  );
}

/* بطاقة إجراءٍ عريضة (الجامعات) — بارزة أسفل اللوحة. */
function WideAction({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <Link href={href}
      className="rounded-2xl px-4 py-3 flex items-center gap-3 text-right no-underline transition active:scale-[0.98]"
      style={{ background: "color-mix(in srgb, var(--gold) 10%, var(--surface))", border: "1px solid color-mix(in srgb, var(--gold) 28%, transparent)" }}>
      <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-[22px] leading-none flex-shrink-0"
        style={{ background: "color-mix(in srgb, var(--gold) 16%, transparent)" }} aria-hidden="true">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="t-body font-black leading-tight" style={{ color: "var(--text)" }}>{title}</p>
        <p className="t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>{desc}</p>
      </div>
      <span className="text-[18px] flex-shrink-0" style={{ color: "var(--gold)" }} aria-hidden="true">←</span>
    </Link>
  );
}

export default function PhaseHome() {
  const [d] = useState(() => {
    if (typeof window === "undefined") return null;
    return { exp: phaseExperience(loadUser()), qiyas: readLifeContext().qiyas };
  });
  if (!d) return null;
  const { exp, qiyas } = d;

  /* الجامعي: عالمه الكامل — لا قالب عام (مواد/معدّل/مسار/أدوات). */
  if (exp.phase === "university") return <DashUniWorld hint={exp.duwairbHint} />;

  /* الخريج: لوحة مهنية — وظائف/مسارات/مهارات. */
  if (exp.phase === "graduate") {
    return (
      <div className="flex flex-col gap-4">
        <Board tiles={[
          { icon: "💼", title: "الوظائف والفرص", desc: "تدرّب وتوظّف", href: "/opportunities" },
          { icon: "🌍", title: "عالم تخصصك", desc: "مساراتك المهنية", href: "/career" },
          { icon: "🧠", title: "مهاراتك", desc: "طوّر وأثبت", href: "/skills" },
          { icon: "🤖", title: "دويرب", desc: "مساعدك الذكي", event: "darb:openDuirb" },
        ]} />
        {qiyas && <NextExam qiyas={qiyas} />}
        {exp.admission === "full" && (
          <WideAction href="/university" icon="🎓" title="القبول والمفاضلة" desc="رتّب رغباتك وقدّم" />
        )}
      </div>
    );
  }

  /* ثانوي: أربع بطاقات قرارٍ فقط + الاختبار القادم + الجامعات لثالثٍ فقط. */
  return (
    <div className="flex flex-col gap-4">
      <Board tiles={[
        { icon: "📖", title: "تابع مذاكرتك", desc: "خريطة مسارك", href: "/roadmap" },
        { icon: "📝", title: "مذكرة الواجبات", desc: "واجباتك ومدرستك", href: "/school" },
        { icon: "🧠", title: "دويرب", desc: "مساعدك الذكي", event: "darb:openDuirb" },
        { icon: "📊", title: "تقدّمي", desc: "ستريكك وساعاتك", href: "/profile" },
      ]} />
      {qiyas && <NextExam qiyas={qiyas} />}
      {exp.stage === "third" && (
        <WideAction href="/university" icon="🎯" title="الجامعات" desc="القبول والمفاضلة" />
      )}
    </div>
  );
}
