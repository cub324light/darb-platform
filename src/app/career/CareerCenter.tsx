"use client";
/* ─── مركز «مسيرتك المهنية» (client): تبويبات إرشادية متخصّصة حسب تخصص الطالب ───
   عرض فقط — كل البيانات من src/lib/career النقي. التخصيص بتهيئة كسولة: نقرأ
   تخصص الطالب مرة واحدة من التخزين (goals.majorId → فئته، أو trackType) بلا
   شبكة ولا setState في effect. الفئة قابلة للتغيير بشريحة. */
import { useState } from "react";
import Link from "next/link";
import { loadUser, loadGoals } from "@/lib/storage";
import { type MajorCategory } from "@/lib/university";
import {
  CAREER_CATEGORIES, CAREER_DISCLAIMER,
  certsForMajor, opportunitiesAll, resolveCategory,
  resumeFocusForMajor, linkedinFocusForMajor,
  RESUME_PRINCIPLES, RESUME_MISTAKES, RESUME_ATS_TIPS,
  LINKEDIN_CHECKLIST, GRAD_WHEN, GRAD_REQUIREMENTS, TRAINING_KINDS,
  type CertLevel,
} from "@/lib/career";

/* شرائح الأقسام */
type TabId = "training" | "resume" | "linkedin" | "certs" | "opportunities" | "grad";
const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "training",      label: "التدريب",        icon: "🧭" },
  { id: "resume",        label: "السيرة الذاتية", icon: "📄" },
  { id: "linkedin",      label: "لينكدإن",        icon: "🔗" },
  { id: "certs",         label: "الشهادات",       icon: "🎓" },
  { id: "opportunities", label: "الفرص",          icon: "💼" },
  { id: "grad",          label: "الدراسات العليا", icon: "🧪" },
];

/* لون مستوى الشهادة (متغيرات الثيم فقط) */
const LEVEL_COLOR: Record<CertLevel, string> = {
  "أساسي": "var(--success)",
  "متوسط": "var(--gold)",
  "متقدم": "var(--accent-light)",
};

/* شريحة موحّدة بنمط شرائح درب (UniTools) */
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-black whitespace-nowrap flex-shrink-0 transition active:scale-95"
      style={{
        background: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--surface)",
        color: active ? "var(--accent-light)" : "var(--text-muted)",
        border: active
          ? "1.5px solid color-mix(in srgb, var(--accent) 55%, transparent)"
          : "1.5px solid var(--border)",
      }}>
      {children}
    </button>
  );
}

/* غلاف قسم موحّد */
function Section({ icon, title, badge, children }: {
  icon: string; title: string; badge?: string; children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[18px]" aria-hidden="true">{icon}</span>
        <p className="text-[14px] font-black flex-1" style={{ color: "var(--text)" }}>{title}</p>
        {badge && (
          <span className="text-[10.5px] font-black px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ background: "color-mix(in srgb, var(--gold) 14%, transparent)", color: "var(--gold)" }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

/* بطاقة فرعية بخلفية أهدأ */
function SubCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl px-3.5 py-3 flex flex-col gap-2"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <p className="text-[12.5px] font-black" style={{ color: "var(--text)" }}>{title}</p>
      {children}
    </div>
  );
}

/* قائمة نقاط موحّدة */
function Bullets({ items, mark = "•" }: { items: string[]; mark?: string }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((t, i) => (
        <li key={i} className="text-[12.5px] leading-relaxed flex gap-2" style={{ color: "var(--text-muted)" }}>
          <span className="flex-shrink-0" style={{ color: "var(--accent-light)" }} aria-hidden="true">{mark}</span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export default function CareerCenter() {
  const [tab, setTab] = useState<TabId>("training");
  /* تهيئة كسولة: قراءة واحدة من التخزين لاشتقاق فئة التخصص */
  const [cat, setCat] = useState<MajorCategory>(() => {
    if (typeof window === "undefined") return "عام";
    const g = loadGoals();
    const u = loadUser();
    return resolveCategory(g.majorId, u?.trackType);
  });

  const certs = certsForMajor(cat);
  const resumeFocus = resumeFocusForMajor(cat);
  const linkedinFocus = linkedinFocusForMajor(cat);

  return (
    <div className="flex flex-col gap-3">
      {/* ── شريحة التخصص: التخصيص الظاهر للطالب ── */}
      <section className="rounded-2xl p-4 flex flex-col gap-2.5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          <span className="text-[18px]" aria-hidden="true">🎯</span>
          <p className="text-[13.5px] font-black flex-1" style={{ color: "var(--text)" }}>خصّص المركز لتخصصك</p>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}
          role="group" aria-label="اختيار فئة التخصص">
          {CAREER_CATEGORIES.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>
          ))}
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          الشهادات ونصائح السيرة ولينكدإن تتكيّف مع فئتك. حدّد تخصصك من{" "}
          <Link href="/profile" className="font-black" style={{ color: "var(--accent-light)" }}>ملفك</Link>
          {" "}ليأتي مختاراً تلقائياً.
        </p>
      </section>

      {/* ── شرائح التبويب بين الأقسام ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}
        role="tablist" aria-label="أقسام المركز المهني">
        {TABS.map((t) => (
          <Chip key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            <span aria-hidden="true">{t.icon}</span>
            {t.label}
          </Chip>
        ))}
      </div>

      {/* ═══ التدريب (تعاوني / صيفي) ═══ */}
      {tab === "training" && (
        <Section icon="🧭" title="التدريب التعاوني والصيفي">
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            التدريب أسرع طريق لخبرة حقيقية قبل التخرّج — يبني سيرتك ويفتح لك أبواب التوظيف.
          </p>
          {TRAINING_KINDS.map((k) => (
            <SubCard key={k.id} title={k.title}>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{k.what}</p>
              <span className="text-[11px] font-black px-2.5 py-1 rounded-full self-start"
                style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent-light)" }}>
                🗓 {k.when}
              </span>
              <p className="text-[11.5px] font-black mt-0.5" style={{ color: "var(--text)" }}>كيف تجهّز نفسك؟</p>
              <Bullets items={k.prep} mark="✓" />
            </SubCard>
          ))}
        </Section>
      )}

      {/* ═══ السيرة الذاتية ═══ */}
      {tab === "resume" && (
        <Section icon="📄" title="السيرة الذاتية" badge="قريباً: منشئ سيرة داخل المنصة">
          <SubCard title="مبادئ أساسية">
            <Bullets items={RESUME_PRINCIPLES} mark="✓" />
          </SubCard>
          <SubCard title={`ما يبرزه تخصص «${cat}»`}>
            <Bullets items={resumeFocus} mark="★" />
          </SubCard>
          <SubCard title="أخطاء شائعة تجنّبها">
            <Bullets items={RESUME_MISTAKES} mark="✕" />
          </SubCard>
          <SubCard title="ملاءمة أنظمة الفرز الآلي (ATS)">
            <Bullets items={RESUME_ATS_TIPS} mark="•" />
          </SubCard>
        </Section>
      )}

      {/* ═══ لينكدإن ═══ */}
      {tab === "linkedin" && (
        <Section icon="🔗" title="تحسين ملف لينكدإن">
          <SubCard title="قائمة تحقّق للملف">
            <ul className="flex flex-col gap-2">
              {LINKEDIN_CHECKLIST.map((it) => (
                <li key={it.id} className="flex gap-2">
                  <span className="flex-shrink-0 text-[13px]" style={{ color: "var(--success)" }} aria-hidden="true">☑</span>
                  <div className="flex flex-col">
                    <span className="text-[12.5px] font-bold" style={{ color: "var(--text)" }}>{it.label}</span>
                    <span className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{it.hint}</span>
                  </div>
                </li>
              ))}
            </ul>
          </SubCard>
          <SubCard title={`نقاط لتخصص «${cat}»`}>
            <Bullets items={linkedinFocus} mark="★" />
          </SubCard>
        </Section>
      )}

      {/* ═══ الشهادات (مفلترة بالتخصص) ═══ */}
      {tab === "certs" && (
        <Section icon="🎓" title={`شهادات احترافية · ${cat}`}>
          <p className="text-[11.5px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            أسماء معروفة ودائمة — التفاصيل والرسوم على المصدر الرسمي لكل شهادة. غيّر الفئة من الأعلى.
          </p>
          <div className="grid gap-2.5 desk-grid-2">
            {certs.map((c) => (
              <div key={c.id} className="rounded-xl px-3.5 py-3 flex flex-col gap-1.5"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <div className="flex items-start gap-2">
                  <p className="text-[13px] font-black flex-1 leading-snug" style={{ color: "var(--text)" }}>{c.name}</p>
                  <span className="text-[10px] font-black px-2 py-1 rounded-full flex-shrink-0"
                    style={{ background: `color-mix(in srgb, ${LEVEL_COLOR[c.level]} 14%, transparent)`, color: LEVEL_COLOR[c.level] }}>
                    {c.level}
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{c.forWhat}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ═══ الفرص (روابط رسمية — تبويب جديد) ═══ */}
      {tab === "opportunities" && (
        <Section icon="💼" title="جهات وبرامج التوظيف">
          <p className="text-[11.5px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            بوابات رسمية موثوقة — الفرص تُعلن دورياً، فتابع المواقع مباشرة للتقديم.
          </p>
          <div className="grid gap-2.5 desk-grid-2">
            {opportunitiesAll().map((o) => (
              <a key={o.id} href={o.officialUrl} target="_blank" rel="noopener noreferrer"
                className="rounded-xl px-3.5 py-3 flex flex-col gap-1.5 no-underline transition active:scale-[0.98]"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <p className="text-[13px] font-black leading-snug" style={{ color: "var(--text)" }}>{o.title}</p>
                <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{o.what}</p>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {o.tags.map((t) => (
                    <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "color-mix(in srgb, var(--accent) 9%, transparent)", color: "var(--text-muted)" }}>
                      {t}
                    </span>
                  ))}
                </div>
                <span className="text-[11.5px] font-black mt-0.5" style={{ color: "var(--accent-light)" }}>
                  زيارة الموقع الرسمي ↗
                </span>
              </a>
            ))}
          </div>
        </Section>
      )}

      {/* ═══ الدراسات العليا ═══ */}
      {tab === "grad" && (
        <Section icon="🧪" title="الدراسات العليا">
          <SubCard title="متى تفكّر فيها؟">
            <Bullets items={GRAD_WHEN} mark="•" />
          </SubCard>
          <SubCard title="المتطلبات العامة">
            <Bullets items={GRAD_REQUIREMENTS} mark="✓" />
          </SubCard>
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            المتطلبات تختلف بين الجامعات والبرامج — راجع الموقع الرسمي لكل برنامج قبل التقديم.
          </p>
        </Section>
      )}

      {/* ── جسر إلى أدوات الجامعة والأجهزة (ربط داخلي لا تكرار) ── */}
      <section className="rounded-2xl p-4 flex flex-col gap-2.5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-[12.5px] font-black" style={{ color: "var(--text)" }}>يكمّل مسيرتك</p>
        <div className="grid grid-cols-2 gap-2.5">
          <Link href="/uni-tools"
            className="rounded-xl px-3.5 py-3 flex flex-col gap-1 text-right no-underline transition active:scale-[0.97]"
            style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface2))", border: "1.5px solid color-mix(in srgb, var(--accent) 26%, transparent)" }}>
            <span className="text-[20px] leading-none">🧮</span>
            <span className="font-extrabold text-[13.5px]" style={{ color: "var(--text)" }}>أدوات الجامعة</span>
            <span className="text-[11.5px] leading-snug" style={{ color: "var(--text-muted)" }}>معدّلك والغياب والفاينل</span>
          </Link>
          <Link href="/uni-gear"
            className="rounded-xl px-3.5 py-3 flex flex-col gap-1 text-right no-underline transition active:scale-[0.97]"
            style={{ background: "color-mix(in srgb, var(--gold) 8%, var(--surface2))", border: "1.5px solid color-mix(in srgb, var(--gold) 26%, transparent)" }}>
            <span className="text-[20px] leading-none">💻</span>
            <span className="font-extrabold text-[13.5px]" style={{ color: "var(--text)" }}>أجهزة تخصصك</span>
            <span className="text-[11.5px] leading-snug" style={{ color: "var(--text-muted)" }}>أفضل جهاز لمجالك</span>
          </Link>
        </div>
      </section>

      {/* تنويه استرشادي موحّد */}
      <p className="text-[10.5px] font-bold leading-relaxed px-1" style={{ color: "var(--text-muted)" }}>
        ⚖️ {CAREER_DISCLAIMER} — هذه نسخة أولى إرشادية، نعمّق أدواتها تِباعاً.
      </p>
    </div>
  );
}
