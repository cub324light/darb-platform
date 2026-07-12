"use client";
/* ─── 🧭 «وش تقدر تقدم عليه؟» — الفرص المصنّفة حسب بيانات الطالب ───
   عرض فقط: كل المنطق في محرّك opportunities النقي (src/lib/opportunities.ts).
   المدخلات من التخزين المحلي (darb_user / darb_goals / darb_results) —
   نفس مصادر الحقيقة التي تستهلكها لوحة القبول، بلا أي شبكة. */
import { useState } from "react";
import Link from "next/link";
import Dome from "@/components/Dome";
import BackButton from "@/components/BackButton";
import PageFooter from "@/components/PageFooter";
import { loadUser, loadGoals, currentScoreMap } from "@/lib/storage";
import {
  buildOpportunities, OPPORTUNITIES_DISCLAIMER,
  type OpportunityItem, type OpportunityStatus,
} from "@/lib/opportunities";

const ar = (n: number) => n.toLocaleString("ar-SA");

/* أقرب درجة من خريطة النتائج — نفس المطابقة المرنة في لوحة القبول
   (المفاتيح كما تُحفظ في «نتائجي»: «القدرات» / «التحصيلي» / «ستيب STEP») */
function scoreFrom(map: Record<string, { score: number }>, ...keys: string[]): number | null {
  for (const k of keys) for (const mk of Object.keys(map)) if (mk.includes(k)) return map[mk].score;
  return null;
}

/* شارة الحالة — ألوان الثيم فقط */
const STATUS_META: Record<OpportunityStatus, { color: string }> = {
  "متاح":      { color: "var(--success)" },
  "قريب":      { color: "var(--gold)" },
  "يحتاج شرط": { color: "var(--danger)" },
};

/* تسمية رابط «التفاصيل» حسب الوجهة الداخلية */
const LINK_LABELS: Record<string, string> = {
  "/university": "لوحة القبول",
  "/profile": "الملف",
  "/guide": "دليل القبول",
  "/dashboard": "الرئيسية",
};

export default function OpportunitiesPage() {
  /* تهيئة كسولة — قراءة واحدة من التخزين المحلي عند أول عرض */
  const [user] = useState(() => loadUser());
  const [goals] = useState(() => loadGoals());
  const [scoreMap] = useState(() => currentScoreMap());

  const qudurat = scoreFrom(scoreMap, "قدرات");
  const tahsili = scoreFrom(scoreMap, "تحصيلي");
  const step = scoreFrom(scoreMap, "STEP", "ستيب");
  const highschoolPct = goals.highschoolPct ?? null;

  const groups = buildOpportunities({
    studyLevel: user?.studyLevel,
    grade: user?.grade,
    gradStage: user?.gradStage,
    trackType: user?.trackType,
    region: user?.region,
    highschoolPct,
    qudurat, tahsili, step,
    universityId: goals.universityId,
    majorId: goals.majorId,
  });

  /* هل توجد أي بيانات نبني عليها؟ (لحالة الفراغ الكامل الأنيقة) */
  const hasAnyData =
    !!user || highschoolPct != null || qudurat != null || tahsili != null ||
    step != null || !!goals.universityId || !!goals.majorId;

  /* شرائح ملخص البيانات — تُعرض الموجودة فقط */
  const chips: { label: string; value: string; mono?: boolean }[] = [];
  if (user?.studyLevel) chips.push({ label: "الحالة", value: user.grade ? `${user.studyLevel} · ${user.grade}` : user.studyLevel });
  if (user?.region) chips.push({ label: "المنطقة", value: user.region });
  if (highschoolPct != null) chips.push({ label: "الثانوية", value: `${ar(highschoolPct)}٪`, mono: true });
  if (qudurat != null) chips.push({ label: "القدرات", value: ar(qudurat), mono: true });
  if (tahsili != null) chips.push({ label: "التحصيلي", value: ar(tahsili), mono: true });
  if (step != null) chips.push({ label: "ستيب", value: ar(step), mono: true });
  if (goals.university || goals.major) {
    chips.push({ label: "الوجهة", value: [goals.university, goals.major].filter(Boolean).join(" · ") });
  }

  return (
    <div className="page desk-wide">
      <Dome compact>
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="title-lg grad-title">وش تقدر تقدم عليه؟</h1>
        </div>
        <p className="text-[15px] mt-1" style={{ color: "var(--text-muted)" }}>
          جامعات، كليات، ابتعاث، دبلومات، منح وبرامج — مصنّفة حسب بياناتك
        </p>
      </Dome>
      <div className="h-4" />

      <div className="page-content">
        {/* ═══ ملخص بياناتك / الحالة الفارغة ═══ */}
        {hasAnyData ? (
          <section className="rounded-2xl p-4 flex flex-col gap-3"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <span className="text-[20px]">🧾</span>
              <p className="text-[16px] font-black flex-1" style={{ color: "var(--text)" }}>ملخص بياناتك</p>
              <Link href="/profile" className="text-[14px] font-black px-3 py-1.5 rounded-full"
                style={{ background: "var(--surface2)", color: "var(--accent-light)", border: "1px solid var(--border)" }}>
                تعديل ✎
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <span key={c.label} className="px-3 py-1.5 rounded-full text-[14px] font-bold"
                  style={{ background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--text-muted)" }}>{c.label}: </span>
                  <span className={c.mono ? "font-mono-nums font-black" : "font-black"}>{c.value}</span>
                </span>
              ))}
              {chips.length === 0 && (
                <span className="text-[14px] font-semibold" style={{ color: "var(--text-muted)" }}>
                  بياناتك ناقصة — أكمل درجاتك ووجهتك من ملفك ليصير التصنيف أدق.
                </span>
              )}
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              الدرجات من «نتائجي» والوجهة من «مستقبلي الجامعي» في{" "}
              <Link href="/profile" className="font-black" style={{ color: "var(--accent-light)" }}>ملفك</Link>
              {" "}— والموزونة وتحليل الفجوة بالتفصيل في{" "}
              <Link href="/university" className="font-black" style={{ color: "var(--accent-light)" }}>لوحة القبول</Link>.
            </p>
            <p className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>
              ⚖️ {OPPORTUNITIES_DISCLAIMER}
            </p>
          </section>
        ) : (
          <section className="rounded-3xl p-6 text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-[45px] mb-2">🧭</p>
            <p className="text-[18px] font-black mb-2" style={{ color: "var(--text)" }}>ما عندنا بيانات نبني عليها بعد</p>
            <p className="text-[15px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              أضف حالتك الدراسية ونتائجك (القدرات/التحصيلي/ستيب) من «نتائجي»، وحدّد جامعتك وتخصصك
              من «مستقبلي الجامعي» في ملفك — وارجع هنا تلقى فرصك مرتّبة ومصنّفة لك.
            </p>
            <Link href="/profile" className="inline-block mt-4 px-5 py-2.5 rounded-2xl font-bold text-[16px]"
              style={{ background: "var(--accent)", color: "#fff" }}>
              ← أكمل بياناتك من ملفك
            </Link>
            <p className="text-[12px] font-bold mt-4" style={{ color: "var(--text-muted)" }}>
              ⚖️ {OPPORTUNITIES_DISCLAIMER}
            </p>
          </section>
        )}

        {/* ═══ المجموعات الست ═══ */}
        {groups.map((g) => (
          <section key={g.id} className="rounded-2xl p-4 flex flex-col gap-3"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <span className="text-[20px]">{g.icon}</span>
              <p className="text-[16px] font-black flex-1" style={{ color: "var(--text)" }}>{g.title}</p>
            </div>
            {g.note && (
              <p className="rounded-xl px-3 py-2 text-[13px] font-semibold leading-relaxed"
                style={{ background: "color-mix(in srgb, var(--accent) 7%, transparent)", color: "var(--text-muted)" }}>
                {g.note}
              </p>
            )}
            {/* الجامعات: شبكة ٣ أعمدة على سطح المكتب (desk-grid-3 عند ≥1100px) */}
            <div className={g.id === "universities" ? "grid gap-2.5 desk-grid-3" : "flex flex-col gap-2.5"}>
              {g.items.map((it) => <OpportunityCard key={it.id} item={it} />)}
            </div>
          </section>
        ))}
      </div>

      <div className="h-6" />
      <PageFooter />
    </div>
  );
}

/* بطاقة فرصة واحدة — شارة حالة + موزونة/حكم إن وُجدا + تفاصيل وتلميح ورابط */
function OpportunityCard({ item }: { item: OpportunityItem }) {
  const c = STATUS_META[item.status].color;
  const vColor = item.verdict
    ? item.verdict.icon === "🟢" ? "var(--success)" : item.verdict.icon === "🟡" ? "var(--gold)" : "var(--danger)"
    : undefined;
  return (
    <div className="rounded-xl px-3.5 py-3 flex flex-col gap-1.5"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <div className="flex items-start gap-2">
        <p className="text-[15px] font-black flex-1 leading-snug" style={{ color: "var(--text)" }}>{item.title}</p>
        <span className="text-[12px] font-black px-2 py-1 rounded-full flex-shrink-0"
          style={{ background: `color-mix(in srgb, ${c} 13%, transparent)`, color: c }}>
          {item.status}
        </span>
      </div>
      {item.score != null && item.verdict && (
        <p className="text-[15px] font-black">
          <span className="font-mono-nums" style={{ color: vColor }}>{item.verdict.icon} {ar(item.score)}٪</span>
          <span className="text-[12px] font-bold mr-2" style={{ color: "var(--text-muted)" }}>{item.verdict.label}</span>
        </p>
      )}
      <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.detail}</p>
      {item.hint && (
        <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>💡 {item.hint}</p>
      )}
      {item.linkTo && (
        <Link href={item.linkTo} className="text-[13px] font-black mt-0.5"
          style={{ color: "var(--accent-light)" }}>
          ← {LINK_LABELS[item.linkTo] ?? "التفاصيل"}
        </Link>
      )}
    </div>
  );
}
