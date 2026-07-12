"use client";
/* ─── «عالم تخصصك» (client): كل تخصص دقيق له عالمه — أدواته وشهاداته وشركاته ───
   بطلٌ واحد مُخصَّص للتخصص الدقيق (goals.majorId) فوق أقسام بطاقية من majors.ts،
   ثم طبقة ثانوية «خطواتك المهنية» من career.ts (تدريب/سيرة/لينكدإن/فرص/عليا).
   عرض فقط — التخصيص بتهيئة كسولة (قراءة واحدة من التخزين، بلا setState في effect).
   الألوان بمعنى: أزرق=أدوات · ذهبي=شهادات · أخضر=راتب · رمادي=معلومة. */
import { useState } from "react";
import Link from "next/link";
import { CardGrid } from "@/components/ds";
import { loadUser, loadGoals } from "@/lib/storage";
import { findMajor, type MajorCategory } from "@/lib/university";
import { getMajorWorld, hasMajorWorld, subjectFlow, coreSubjectsOf, type FlowNode } from "@/lib/majors";
import MajorGraph from "@/components/MajorGraph";
import {
  CAREER_DISCLAIMER, opportunitiesAll,
  resolveCategory, resumeFocusForMajor, linkedinFocusForMajor,
  RESUME_PRINCIPLES, RESUME_MISTAKES, RESUME_ATS_TIPS,
  LINKEDIN_CHECKLIST, GRAD_WHEN, GRAD_REQUIREMENTS, TRAINING_KINDS,
} from "@/lib/career";

/* ألوان دلالية موحّدة (متغيّرات ثيم فقط — تحترم الوضعين) */
const C_ACTION = "var(--accent)";      // أزرق = أدوات/إجراء (برامج + أدوات AI)
const C_CERT = "var(--gold)";          // ذهبي = شهادات
const C_INFO = "var(--text-muted)";    // رمادي = معلومة (مسارات/مشاريع/مراجع)

/* شرائح التبويب في «خطواتك المهنية» — الشهادات انتقلت لعالم التخصص فحُذف تبويبها */
type TabId = "training" | "resume" | "linkedin" | "opportunities" | "grad";
const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "training",      label: "التدريب",         icon: "🧭" },
  { id: "resume",        label: "السيرة الذاتية",  icon: "📄" },
  { id: "linkedin",      label: "لينكدإن",         icon: "🔗" },
  { id: "opportunities", label: "الفرص",           icon: "💼" },
  { id: "grad",          label: "الدراسات العليا", icon: "🧪" },
];

/* عنصر عالم موحّد — اسم + ملاحظة اختيارية */
interface WorldItem { name: string; note?: string }
const asItems = (arr: string[]): WorldItem[] => arr.map((name) => ({ name }));

/* شريحة موحّدة بنمط شرائح درب */
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[14px] font-black whitespace-nowrap flex-shrink-0 transition active:scale-95"
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

/* غلاف قسم موحّد — بطاقة نظام + عنوان t-h3 + إيقاع داخلي موحّد.
   id اختياري: يجعل القسم هدف تنقّل للسلسلة (كل عقدة تقفز لتفصيلها هنا). */
function Section({ id, icon, title, badge, children }: {
  id?: string; icon: string; title: string; badge?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="ds-card ds-stack-tight" style={id ? { scrollMarginTop: 76 } : undefined}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[20px]" aria-hidden="true">{icon}</span>
        <h2 className="t-h3 flex-1" style={{ color: "var(--text)" }}>{title}</h2>
        {badge && (
          <span className="t-caption px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ background: "color-mix(in srgb, var(--gold) 14%, transparent)", color: "var(--gold)" }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

/* بطاقة عنصر عالم — ارتفاع كامل (Grid متساوٍ) + حدّ دلالي على الجهة الابتدائية */
function WorldCard({ name, note, color }: { name: string; note?: string; color: string }) {
  return (
    <div className="rounded-xl px-3.5 py-3 flex flex-col gap-1 h-full"
      style={{
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        borderInlineStartWidth: 3,
        borderInlineStartColor: `color-mix(in srgb, ${color} 60%, transparent)`,
      }}>
      <p className="t-body font-black leading-snug" style={{ color: "var(--text)" }}>{name}</p>
      {note ? <p className="t-caption" style={{ color: "var(--text-muted)" }}>{note}</p> : null}
    </div>
  );
}

/* قسم بطاقي من عالم التخصص — يُخفى تماماً إن غاب حقله (لا عناوين فارغة) */
function WorldGrid({ id, icon, title, color, items }: {
  id?: string; icon: string; title: string; color: string; items: WorldItem[];
}) {
  if (!items.length) return null;
  return (
    <Section id={id} icon={icon} title={title}>
      <CardGrid cols={2}>
        {items.map((it, i) => <WorldCard key={i} name={it.name} note={it.note} color={color} />)}
      </CardGrid>
    </Section>
  );
}

/* بطاقة فرعية بخلفية أهدأ (تُستعمل في الطبقة الثانوية) */
function SubCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl px-3.5 py-3 flex flex-col gap-2"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <p className="t-body font-black" style={{ color: "var(--text)" }}>{title}</p>
      {children}
    </div>
  );
}

/* قائمة نقاط موحّدة */
function Bullets({ items, mark = "•" }: { items: string[]; mark?: string }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((t, i) => (
        <li key={i} className="t-caption flex gap-2" style={{ color: "var(--text-muted)" }}>
          <span className="flex-shrink-0" style={{ color: "var(--accent-light)" }} aria-hidden="true">{mark}</span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

/* لون ومقصد كل عقدة — لونٌ بمعنى، ومقصدٌ يقفز لتفصيلها بالأسفل (لا معلومة معزولة) */
const NODE_META: Record<FlowNode["kind"], { color: string; anchor?: string }> = {
  subject: { color: C_INFO },
  tool:    { color: C_ACTION, anchor: "#sec-programs" },
  project: { color: C_INFO,   anchor: "#sec-projects" },
  company: { color: C_INFO,   anchor: "#sec-companies" },
  cert:    { color: C_CERT,   anchor: "#sec-certs" },
  role:    { color: "var(--success)", anchor: "#sec-paths" },
};

/* عقدة واحدة في السلسلة — بطاقة تحمل الجملة الرابطة + العنصر، وتقفز لتفصيله */
function FlowNodeRow({ node, last }: { node: FlowNode; last: boolean }) {
  const meta = NODE_META[node.kind];
  const isDest = node.kind === "role";
  const inner = (
    <div className="rounded-xl px-3.5 py-2.5 flex items-center gap-3 transition active:scale-[0.99]"
      style={{
        background: isDest ? "color-mix(in srgb, var(--success) 12%, transparent)" : "var(--surface2)",
        border: `1px solid ${isDest ? "color-mix(in srgb, var(--success) 34%, transparent)" : "var(--border)"}`,
        borderInlineStartWidth: 3,
        borderInlineStartColor: `color-mix(in srgb, ${meta.color} 62%, transparent)`,
      }}>
      <span className="text-[19px] flex-shrink-0" aria-hidden="true">{node.icon}</span>
      <div className="flex-1 min-w-0 flex flex-col">
        <span className="t-caption" style={{ color: "var(--text-muted)" }}>{node.lead}</span>
        <span className="t-body font-black leading-snug"
          style={{ color: isDest ? "var(--success)" : "var(--text)" }}>{node.label}</span>
      </div>
      {meta.anchor && (
        <span className="text-[15px] flex-shrink-0" style={{ color: "var(--text-muted)" }} aria-hidden="true">↓</span>
      )}
    </div>
  );
  return (
    <div className="flex flex-col">
      {meta.anchor
        ? <a href={meta.anchor} className="no-underline">{inner}</a>
        : inner}
      {/* واصل رأسي بين العُقد — يجسّد «كلٌّ يقود للذي بعده» */}
      {!last && (
        <div className="flex justify-center" aria-hidden="true">
          <span className="text-[14px] leading-none py-0.5" style={{ color: "var(--accent-light)" }}>↓</span>
        </div>
      )}
    </div>
  );
}

/* ══ رحلتك من المادة إلى الوظيفة — السلسلة المترابطة (أنكور الصفحة) ══
   يختار الطالب مادة، فترتسم أمامه رحلتها كاملة: مادة → أداة → مشروع → جهة →
   شهادة → دور. كل عقدة تسلّم للتي بعدها، وتقفز لتفصيلها بالأسفل. */
function SubjectJourney({ majorId }: { majorId: string | null }) {
  const subjects = coreSubjectsOf(majorId);
  const [subject, setSubject] = useState(() => subjects[0] ?? "");
  if (subjects.length === 0) return null;
  const flow = subjectFlow(majorId, subject);

  return (
    <section className="ds-card ds-stack-tight"
      style={{
        background: "linear-gradient(160deg, color-mix(in srgb, var(--accent) 7%, var(--surface)) 0%, var(--surface) 78%)",
        borderColor: "color-mix(in srgb, var(--accent) 20%, var(--border))",
      }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[20px]" aria-hidden="true">🧭</span>
        <div className="flex-1">
          <h2 className="t-h3" style={{ color: "var(--text)" }}>رحلتك من المادة إلى الوظيفة</h2>
          <p className="t-caption" style={{ color: "var(--text-muted)" }}>
            اختر مادة — نُريك كيف تقودك خطوة بخطوة حتى العمل. لا معلومة معزولة.
          </p>
        </div>
      </div>

      {/* اختيار المادة — كل مادة ترسم رحلتها */}
      {subjects.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}
          role="tablist" aria-label="مواد تخصصك">
          {subjects.map((s) => (
            <Chip key={s} active={s === subject} onClick={() => setSubject(s)}>{s}</Chip>
          ))}
        </div>
      )}

      {/* السلسلة */}
      <div className="flex flex-col">
        {flow.nodes.map((n, i) => (
          <FlowNodeRow key={`${subject}-${i}`} node={n} last={i === flow.nodes.length - 1} />
        ))}
      </div>
    </section>
  );
}

export default function CareerCenter() {
  /* تهيئة كسولة: قراءة واحدة من التخزين (majorId لعالم التخصص، والفئة للطبقة الثانوية) */
  const [init] = useState(() => {
    if (typeof window === "undefined") return { majorId: null as string | null, cat: "عام" as MajorCategory };
    const g = loadGoals();
    const u = loadUser();
    return { majorId: g.majorId ?? null, cat: resolveCategory(g.majorId, u?.trackType) };
  });
  const [tab, setTab] = useState<TabId>("training");

  /* تخصص دقيق معرّف له عالم؟ («other»/غير محدّد = لا — نعرض احتياطياً عاماً بلا تخصيص البطل) */
  const specific = hasMajorWorld(init.majorId);
  const major = findMajor(init.majorId ?? undefined);
  const majorName = specific && major ? major.name : null;
  const world = getMajorWorld(init.majorId);   // آمن دائماً (لا يرمي؛ احتياطي عام عند الغياب)
  const cat = init.cat;

  const resumeFocus = resumeFocusForMajor(cat);
  const linkedinFocus = linkedinFocusForMajor(cat);

  return (
    /* ds-section: إيقاع رأسي موحّد يجعل الصفحة «تتنفّس» */
    <div className="ds-section">
      {/* ══ البطل الواحد — عالم التخصص أو مسيرتك المهنية (لا تخمين) ══ */}
      <header className="ds-card ds-card-lg flex flex-col gap-2"
        style={{
          background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 11%, var(--surface)) 0%, var(--surface) 72%)",
          borderColor: "color-mix(in srgb, var(--accent) 22%, var(--border))",
        }}>
        {majorName && <p className="eyebrow" style={{ color: "var(--accent-light)" }}>مسيرتك المهنية</p>}
        <h1 className="t-h1 grad-title">
          {majorName ? `عالم تخصصك — ${majorName}` : "مسيرتك المهنية"}
        </h1>
        <p className="t-body" style={{ color: "var(--text-dim)" }}>
          {majorName
            ? `كل ما تحتاجه في ${majorName}: أدواته وشهاداته وشركاته ومساراته.`
            : "أدوات مجالك وشهاداته وشركاته ومساراته — في مكان واحد."}
        </p>
      </header>

      {/* بطاقة تحديد التخصص — تظهر فقط حين لا تخصص دقيق (تفتح باب التخصيص) */}
      {!majorName && (
        <Link href="/profile"
          className="ds-card flex items-center gap-3 no-underline transition active:scale-[0.99]"
          style={{
            background: "color-mix(in srgb, var(--accent) 10%, transparent)",
            borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
          }}>
          <span className="text-[23px] flex-shrink-0" aria-hidden="true">🎯</span>
          <div className="flex-1 min-w-0">
            <p className="t-body font-black" style={{ color: "var(--text)" }}>حدّد تخصصك ليصير المحتوى خاصاً بك</p>
            <p className="t-caption" style={{ color: "var(--text-muted)" }}>من ملفك — تظهر أدوات تخصصك وشهاداته وشركاته ومساراته</p>
          </div>
          <span className="text-[20px] flex-shrink-0" style={{ color: "var(--accent-light)" }} aria-hidden="true">←</span>
        </Link>
      )}

      {/* ══ أنكور الصفحة: رحلتك من المادة إلى الوظيفة (فقط لتخصص دقيق) ══ */}
      {specific && <SubjectJourney majorId={init.majorId} />}

      {/* ══ شبكة تخصصك — استكشاف حر متعدّد الاتجاهات (ادخل من أي عقدة) ══ */}
      {specific && <MajorGraph majorId={init.majorId} />}

      {/* ══ الراتب الاسترشادي — بطاقة واحدة بارزة خضراء (نجاح) ══ */}
      {world.salary && (
        <div className="ds-card flex items-start gap-3"
          style={{
            background: "color-mix(in srgb, var(--success) 10%, transparent)",
            borderColor: "color-mix(in srgb, var(--success) 32%, transparent)",
          }}>
          <span className="text-[25px] flex-shrink-0" aria-hidden="true">💰</span>
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="t-body font-black" style={{ color: "var(--success)" }}>الراتب الاسترشادي</p>
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full"
                style={{ background: "color-mix(in srgb, var(--success) 16%, transparent)", color: "var(--success)" }}>
                تقريبي
              </span>
            </div>
            <p className="t-body font-black leading-snug" style={{ color: "var(--text)" }}>{world.salary.entrySar}</p>
            {world.salary.note && <p className="t-caption" style={{ color: "var(--text-muted)" }}>{world.salary.note}</p>}
          </div>
        </div>
      )}

      {/* 🧭 المسارات الوظيفية (رمادي = معلومة) */}
      <WorldGrid id="sec-paths" icon="🧭" title="مساراتك الوظيفية" color={C_INFO} items={asItems(world.careerPaths)} />

      {/* 🧰 برامج تخصصك (أزرق = أدوات) */}
      <WorldGrid id="sec-programs" icon="🧰" title="برامج تخصصك" color={C_ACTION} items={world.programs} />

      {/* 🎓 الشهادات الاحترافية (ذهبي) */}
      <WorldGrid id="sec-certs" icon="🎓" title="الشهادات الاحترافية" color={C_CERT} items={world.certs} />

      {/* 🤖 أدوات ذكاء اصطناعي لتخصصك (أزرق) + تنويه نزاهة (بنفس روح uni-gear) */}
      {world.aiTools.length > 0 && (
        <Section icon="🤖" title="أدوات ذكاء اصطناعي لتخصصك">
          <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3"
            style={{
              background: "color-mix(in srgb, var(--gold) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--gold) 32%, transparent)",
            }}>
            <span className="text-[18px] flex-shrink-0" aria-hidden="true">⚖️</span>
            <p className="t-caption" style={{ color: "var(--text-dim)" }}>
              استخدمها للفهم والمساعدة لا للغش — خلّها تشرح لك لتتعلّم، وسلّم شغلك بيدك أنت.
            </p>
          </div>
          <CardGrid cols={2}>
            {world.aiTools.map((it, i) => <WorldCard key={i} name={it.name} note={it.note} color={C_ACTION} />)}
          </CardGrid>
        </Section>
      )}

      {/* 🚀 أفكار مشاريع التخرّج (رمادي = معلومة) */}
      <WorldGrid id="sec-projects" icon="🚀" title="أفكار مشاريع تخرّج" color={C_INFO} items={asItems(world.projects)} />

      {/* 🏢 شركات توظّف تخصصك (رمادي = معلومة — شرائح مضغوطة) */}
      {world.companies.length > 0 && (
        <Section id="sec-companies" icon="🏢" title="شركات توظّف تخصصك">
          <div className="flex flex-wrap gap-1.5">
            {world.companies.map((c) => (
              <span key={c} className="t-caption px-2.5 py-1.5 rounded-lg"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-dim)" }}>
                {c}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* 📚 مراجع أساسية (اختيارية — تظهر فقط حيث تُعرف) */}
      <WorldGrid icon="📚" title="مراجع أساسية" color={C_INFO} items={world.books ?? []} />

      {/* ══ خطواتك المهنية — طبقة ثانوية مضغوطة (لا تنافس البطل) ══ */}
      <div className="ds-section">
        <div className="flex items-center gap-2 px-0.5">
          <span className="text-[20px]" aria-hidden="true">🧗</span>
          <div className="flex-1">
            <h2 className="t-h3" style={{ color: "var(--text)" }}>خطواتك المهنية</h2>
            <p className="t-caption" style={{ color: "var(--text-muted)" }}>تدريب وسيرة ولينكدإن وفرص ودراسات عليا — إرشاد عملي</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}
          role="tablist" aria-label="خطواتك المهنية">
          {TABS.map((t) => (
            <Chip key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
              <span aria-hidden="true">{t.icon}</span>
              {t.label}
            </Chip>
          ))}
        </div>

        {/* التدريب (تعاوني / صيفي) */}
        {tab === "training" && (
          <Section icon="🧭" title="التدريب التعاوني والصيفي">
            <p className="t-caption" style={{ color: "var(--text-muted)" }}>
              التدريب أسرع طريق لخبرة حقيقية قبل التخرّج — يبني سيرتك ويفتح لك أبواب التوظيف.
            </p>
            {TRAINING_KINDS.map((k) => (
              <SubCard key={k.id} title={k.title}>
                <p className="t-caption" style={{ color: "var(--text-muted)" }}>{k.what}</p>
                <span className="t-caption px-2.5 py-1 rounded-full self-start"
                  style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent-light)" }}>
                  🗓 {k.when}
                </span>
                <p className="t-caption font-black mt-0.5" style={{ color: "var(--text)" }}>كيف تجهّز نفسك؟</p>
                <Bullets items={k.prep} mark="✓" />
              </SubCard>
            ))}
          </Section>
        )}

        {/* السيرة الذاتية */}
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

        {/* لينكدإن */}
        {tab === "linkedin" && (
          <Section icon="🔗" title="تحسين ملف لينكدإن">
            <SubCard title="قائمة تحقّق للملف">
              <ul className="flex flex-col gap-2">
                {LINKEDIN_CHECKLIST.map((it) => (
                  <li key={it.id} className="flex gap-2">
                    <span className="flex-shrink-0 text-[15px]" style={{ color: "var(--success)" }} aria-hidden="true">☑</span>
                    <div className="flex flex-col">
                      <span className="t-caption" style={{ color: "var(--text)" }}>{it.label}</span>
                      <span className="t-caption" style={{ color: "var(--text-muted)" }}>{it.hint}</span>
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

        {/* الفرص (روابط رسمية) */}
        {tab === "opportunities" && (
          <Section icon="💼" title="جهات وبرامج التوظيف">
            <p className="t-caption" style={{ color: "var(--text-muted)" }}>
              بوابات رسمية موثوقة — الفرص تُعلن دورياً، فتابع المواقع مباشرة للتقديم.
            </p>
            <CardGrid cols={2}>
              {opportunitiesAll().map((o) => (
                <a key={o.id} href={o.officialUrl} target="_blank" rel="noopener noreferrer"
                  className="rounded-xl px-3.5 py-3 flex flex-col gap-1.5 no-underline transition active:scale-[0.98] h-full"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <p className="t-body font-black leading-snug" style={{ color: "var(--text)" }}>{o.title}</p>
                  <p className="t-caption" style={{ color: "var(--text-muted)" }}>{o.what}</p>
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {o.tags.map((t) => (
                      <span key={t} className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "color-mix(in srgb, var(--accent) 9%, transparent)", color: "var(--text-muted)" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <span className="t-caption mt-auto" style={{ color: "var(--accent-light)" }}>
                    زيارة الموقع الرسمي ↗
                  </span>
                </a>
              ))}
            </CardGrid>
          </Section>
        )}

        {/* الدراسات العليا */}
        {tab === "grad" && (
          <Section icon="🧪" title="الدراسات العليا">
            <SubCard title="متى تفكّر فيها؟">
              <Bullets items={GRAD_WHEN} mark="•" />
            </SubCard>
            <SubCard title="المتطلبات العامة">
              <Bullets items={GRAD_REQUIREMENTS} mark="✓" />
            </SubCard>
            <p className="t-caption" style={{ color: "var(--text-muted)" }}>
              المتطلبات تختلف بين الجامعات والبرامج — راجع الموقع الرسمي لكل برنامج قبل التقديم.
            </p>
          </Section>
        )}
      </div>

      {/* تنويه استرشادي موحّد */}
      <p className="t-caption px-1" style={{ color: "var(--text-muted)" }}>
        ⚖️ {CAREER_DISCLAIMER} — الأرقام (كالرواتب) استرشادية تقريبية، والمصادر الرسمية أولاً.
      </p>
    </div>
  );
}
