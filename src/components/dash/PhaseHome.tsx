"use client";
/* ─── الواجهة على الهوية الدراسية (Student Persona) ───
   الصفحة الرئيسية تتغيّر بالكامل حسب من هو الطالب لا مرحلته فقط، وتجيب سؤالاً
   واحداً: «ماذا أفعل الآن؟». تعرض فقط ما يعين على قرارٍ خلال ١٠ ثوانٍ.
   - أول/ثاني ثانوي: مذاكرة/واجبات/دويرب/تقدّم + الاختبار القادم — بلا أي جامعات.
   - ثالث ثانوي: يضاف القبول (الجامعات/الموزونة/المفاضلة/المواعيد)، وبانحياز أرامكو
     إن ظهرت إشارة CPC/ITC (بجانب المفاضلة لا بدلاً منها).
   - جامعي: لوحة تشغيلية (UniBoard) — لا قدرات/قبول/غياب.
   - خريج ثانوي: قبول/استدراك · خريج جامعة: لوحة مهنية.
   مصدر الهوية الوحيد: studentPersona (يشتقّ من حقولٍ حقيقية). SSR-safe. */
import { useState } from "react";
import Link from "next/link";
import UniBoard from "@/components/dash/UniBoard";
import { studentPersona } from "@/lib/persona";
import { phaseExperience } from "@/lib/experience";
import { loadUser, loadGoals } from "@/lib/storage";
import { readLifeContext } from "@/lib/lifeEngine";

interface Tile { icon: string; title: string; desc: string; href?: string; event?: string; }

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
  return <div className="grid grid-cols-2 gap-2.5">{tiles.map((t) => <TileCard key={t.title} t={t} />)}</div>;
}

/* البطاقات الدراسية الأساسية — مشتركة لكل الثانوي وخريج الثانوي */
const STUDY_TILES: Tile[] = [
  { icon: "📖", title: "ابدأ المذاكرة", desc: "جلسة تركيز الآن", href: "/orbit" },
  { icon: "📝", title: "الواجبات", desc: "ما عليك هذا الأسبوع", href: "/school" },
  { icon: "🧠", title: "دويرب", desc: "مساعدك الذكي", event: "darb:openDuirb" },
  { icon: "📊", title: "تقدّمي", desc: "ستريكك وساعاتك", href: "/profile" },
];

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

/* بطاقة إجراءٍ عريضة — للقبول (ذهبي) أو مسار الشركة (سماوي) أو المسار المهني */
function WideAction({ href, icon, title, desc, tone = "gold" }: {
  href: string; icon: string; title: string; desc: string; tone?: "gold" | "accent";
}) {
  const base = tone === "gold" ? "var(--gold)" : "var(--accent)";
  return (
    <Link href={href}
      className="rounded-2xl px-4 py-3 flex items-center gap-3 text-right no-underline transition active:scale-[0.98]"
      style={{ background: `color-mix(in srgb, ${base} 10%, var(--surface))`, border: `1px solid color-mix(in srgb, ${base} 28%, transparent)` }}>
      <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-[22px] leading-none flex-shrink-0"
        style={{ background: `color-mix(in srgb, ${base} 16%, transparent)` }} aria-hidden="true">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="t-body font-black leading-tight" style={{ color: "var(--text)" }}>{title}</p>
        <p className="t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>{desc}</p>
      </div>
      <span className="text-[18px] flex-shrink-0" style={{ color: base }} aria-hidden="true">←</span>
    </Link>
  );
}

export default function PhaseHome() {
  const [d] = useState(() => {
    if (typeof window === "undefined") return null;
    const user = loadUser();
    return { persona: studentPersona(user, loadGoals()), exp: phaseExperience(user), qiyas: readLifeContext().qiyas };
  });
  if (!d) return null;
  const { persona, exp, qiyas } = d;

  /* الجامعي: لوحة تشغيلية (لا قالب عام، لا قياس/قبول/غياب). */
  if (persona.phase === "university") return <UniBoard hint={exp.duwairbHint} />;

  /* خريج الجامعة: لوحة مهنية بحتة. */
  if (persona.key === "grad-uni") {
    return (
      <div className="flex flex-col gap-4">
        <Board tiles={[
          { icon: "💼", title: "الوظائف والفرص", desc: "تدرّب وتوظّف", href: "/opportunities" },
          { icon: "🌍", title: "عالم تخصصك", desc: "مساراتك المهنية", href: "/career" },
          { icon: "🧠", title: "مهاراتك", desc: "طوّر وأثبت", href: "/skills" },
          { icon: "🤖", title: "دويرب", desc: "مساعدك الذكي", event: "darb:openDuirb" },
        ]} />
        <p className="t-caption px-0.5" style={{ color: "var(--text-dim)" }}>💼 {exp.duwairbHint}</p>
      </div>
    );
  }

  /* الثانوي (أول/ثاني/ثالث) وخريج الثانوي: مذاكرة + الاختبار القادم،
     والقبول لثالثٍ وخريج الثانوي فقط (بانحياز أرامكو عند وجود إشارتها). */
  const showAdmission = persona.key === "hs-third" || persona.key === "grad-hs";
  return (
    <div className="flex flex-col gap-4">
      <Board tiles={STUDY_TILES} />

      {persona.key === "hs-second" && (
        <TileCard t={{ icon: "🌱", title: "استعد مبكّراً", desc: "ابدأ القدرات قبل دفعتك", href: "/roadmap" }} />
      )}

      {qiyas && <NextExam qiyas={qiyas} />}

      {showAdmission && (
        <>
          <WideAction href="/university" icon="🎯" title="الجامعات · القبول والمفاضلة" desc="نسبتك الموزونة ومواعيد التقديم" tone="gold" />
          {persona.companyFocus && (
            <WideAction href="/opportunities" icon="🏆" title="مسار أرامكو · CPC / ITC" desc="اختبارات القبول ووظائف الشركة" tone="accent" />
          )}
        </>
      )}
    </div>
  );
}
