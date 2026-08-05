"use client";
/* ─── الواجهة على الهوية الدراسية (Student Persona) ───
   الصفحة الرئيسية تتغيّر بالكامل حسب من هو الطالب لا مرحلته فقط، وتجيب سؤالاً
   واحداً: «ماذا أفعل الآن؟». تعرض فقط ما يعين على قرارٍ خلال 10 ثوانٍ.
   - أول/ثاني ثانوي: مذاكرة/واجبات/دويرب/تقدّم + الاختبار القادم — بلا أي جامعات.
   - ثالث ثانوي: يضاف القبول (الجامعات/الموزونة/المفاضلة/المواعيد)، وبانحياز أرامكو
     إن ظهرت إشارة CPC/ITC (بجانب المفاضلة لا بدلاً منها).
   - جامعي: لوحة تشغيلية (UniBoard) — لا قدرات/قبول/غياب.
   - خريج ثانوي: قبول/استدراك · خريج جامعة: لوحة مهنية.
   مصدر الهوية الوحيد: studentPersona (يشتقّ من حقولٍ حقيقية). SSR-safe. */
import { useState } from "react";
import Link from "next/link";
import UniBoard from "@/components/dash/UniBoard";
import { currentPhase } from "@/lib/transition";
import { loadUser } from "@/lib/storage";
import { targetsFor } from "@/lib/targets";

interface Tile { icon: string; title: string; desc: string; href?: string; event?: string; }

function TileCard({ t }: { t: Tile }) {
  const inner = (
    <>
      <span className="text-[23px] leading-none flex-shrink-0" aria-hidden="true">{t.icon}</span>
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

/* البطاقات الدراسية الأساسية — إجراءان فقط. دويرب عبر الزر العائم (عالمي)،
   وتقدّمي عبر بطاقة الاسم أعلى الصفحة (كلاهما بضغطةٍ واحدة أصلاً — لا نكرّرهما). */
const STUDY_TILES: Tile[] = [
  { icon: "📖", title: "ابدأ المذاكرة", desc: "جلسة تركيز الآن", href: "/orbit" },
  { icon: "📝", title: "الواجبات", desc: "ما عليك هذا الأسبوع", href: "/school" },
];

/* بطاقة إجراءٍ عريضة — للقبول (ذهبي) أو مسار الشركة (سماوي) أو المسار المهني */
function WideAction({ href, icon, title, desc, tone = "gold" }: {
  href: string; icon: string; title: string; desc: string; tone?: "gold" | "accent";
}) {
  const base = tone === "gold" ? "var(--gold)" : "var(--accent)";
  return (
    <Link href={href}
      className="rounded-2xl px-4 py-3 flex items-center gap-3 text-right no-underline transition active:scale-[0.98]"
      style={{ background: `color-mix(in srgb, ${base} 10%, var(--surface))`, border: `1px solid color-mix(in srgb, ${base} 28%, transparent)` }}>
      <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-[25px] leading-none flex-shrink-0"
        style={{ background: `color-mix(in srgb, ${base} 16%, transparent)` }} aria-hidden="true">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="t-body font-black leading-tight" style={{ color: "var(--text)" }}>{title}</p>
        <p className="t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>{desc}</p>
      </div>
      <span className="text-[20px] flex-shrink-0" style={{ color: base }} aria-hidden="true">←</span>
    </Link>
  );
}

export default function PhaseHome() {
  const [d] = useState(() => {
    if (typeof window === "undefined") return null;
    return { view: currentPhase(), targets: loadUser()?.targets ?? [] };
  });
  if (!d) return null;
  const { view, targets } = d;

  /* الجامعي: لوحة تشغيلية (لا قالب عام، لا قياس/قبول/غياب). */
  if (view.allows("uni-life")) return <UniBoard />;

  /* خريج الجامعة: لوحة مهنية بحتة. */
  if (view.allows("career")) {
    return (
      <div className="flex flex-col gap-4">
        {/* ▓ كانت أولى بطاقاته «الوظائف والفرص → /opportunities»، وتلك الصفحةُ
            تستقبل خريجَ الجامعة بجملة «هذا القسم لمن هم على أعتاب القبول».
            أبرزُ فعلٍ في لوحته يقوده إلى بابٍ مغلقٍ في وجهه. والوظائفُ والتدريبُ
            في «المستقبل» فعلاً — فصارت تقوده إليه. */}
        <Board tiles={[
          { icon: "💼", title: "الوظائف والفرص", desc: "تدرّب وتوظّف", href: "/future" },
          { icon: "🌍", title: "عالم تخصصك", desc: "مساراتك المهنية", href: "/career" },
          { icon: "🧠", title: "مهاراتك", desc: "طوّر وأثبت", href: "/skills" },
        ]} />
        <p className="t-caption px-0.5" style={{ color: "var(--text-dim)" }}>💼 {view.duwairbHint}</p>
      </div>
    );
  }

  /* الثانوي (أول/ثاني/ثالث) وخريج الثانوي: مذاكرة + الاختبار القادم، والقبول
     لثالثٍ وخريج الثانوي فقط — بطاقةٌ لكل هدفٍ اختاره الطالب (متعدّد، مرتّب). */
  const showAdmission = view.allows("admission");
  const targetCards = targetsFor(targets);
  return (
    <div className="flex flex-col gap-4">
      <Board tiles={STUDY_TILES} />

      {view.id === "hs-2" && (
        <TileCard t={{ icon: "🌱", title: "استعد مبكّراً", desc: "ابدأ القدرات قبل دفعتك", href: "/roadmap" }} />
      )}

      {showAdmission && (
        targetCards.length > 0
          ? targetCards.map((t) => (
              <WideAction key={t.id} href={t.href} icon={t.icon} title={t.label} desc={t.desc}
                tone={t.id === "university" ? "gold" : "accent"} />
            ))
          : <WideAction href="/university" icon="🎯" title="الجامعات · القبول والمفاضلة" desc="حدّد أهدافك من ملفّك لترتيب أولوياتك" tone="gold" />
      )}
    </div>
  );
}
