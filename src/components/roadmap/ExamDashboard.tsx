"use client";
/* ═══════════ لوحة الاختبار (Exam Dashboard) — عرضٌ نقيّ للمؤشّرات ═══════════
   نظرةٌ واحدةٌ احترافية لاختبارٍ واحد: الاسم · الحالة · مؤشّراتٌ صادقة (بطاقات) ·
   زرٌّ واحدٌ كبير «ابدأ المذاكرة» · بطاقات المواد · أدواتٌ ثانوية.
   ▸ عرضٌ فقط: كل الحساب في المحرّكات النقيّة (computeExamDashboard)، وهذا المكوّن يعرض
     ما وصله. ▸ صدق: مؤشّرٌ بلا بياناتٍ كافية لا يعرض رقماً — بل حالةٌ فارغةٌ بتلميح.
   ▸ «لم يبدأ» = رسالةٌ تحفيزية لا لوحةٌ مليئةٌ بالأصفار. */
import Link from "next/link";
import { n, pct, dateShort, days } from "@/lib/format";
import { EXAM_STATUS_LABEL, type ExamStatus } from "@/lib/roadmap/model";
import type { ExamDashboard as ExamDashboardData } from "@/lib/roadmap/metrics";
import type { Band } from "@/lib/roadmap/readiness";

export interface SubjectStat { name: string; color: string; pct: number }

const STATUS_COLOR: Record<ExamStatus, string> = {
  "not-started": "var(--text-muted)", studying: "var(--accent-light)", registered: "#3B82F6",
  taken: "#8B5CF6", "waiting-result": "#F59E0B", done: "#10B981",
};
const BAND_COLOR: Record<Band, string> = { good: "#10B981", watch: "#F59E0B", risk: "#EF4444" };
const READINESS_LABEL: Record<Band, string> = { good: "ممتازة", watch: "متابعة", risk: "خطر" };
const DANGER_LABEL: Record<Band, string> = { good: "آمن", watch: "انتبه", risk: "خطر" };

/* بطاقة مؤشّر — رقمٌ ذو معنى، أو حالةٌ فارغةٌ صادقة (تلميحٌ لا صفر). */
function Tile({ icon, label, value, sub, hint, tone }: {
  icon: string; label: string; value?: string | null; sub?: string; hint?: string; tone?: string;
}) {
  return (
    <div className="rounded-2xl p-3.5 flex flex-col gap-1.5" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
      <div className="flex items-center gap-1.5">
        <span className="text-[15px]" aria-hidden="true">{icon}</span>
        <span className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>{label}</span>
      </div>
      {value != null ? (
        <>
          <p className="t-h3 font-black font-mono-nums leading-none" style={{ color: tone ?? "var(--text)" }}>{value}</p>
          {sub && <p className="t-caption" style={{ color: "var(--text-muted)" }}>{sub}</p>}
        </>
      ) : (
        <p className="t-caption leading-snug" style={{ color: "var(--text-dim)" }}>{hint ?? "لا بيانات كافية"}</p>
      )}
    </div>
  );
}

export default function ExamDashboard({
  label, icon, color, d, subjects, onOpen, onDelete,
}: {
  label: string; icon?: string; color: string;
  d: ExamDashboardData;
  subjects: SubjectStat[];
  onOpen: () => void;         // يفتح مساحة المذاكرة (الزر الكبير · المواد · الأدوات)
  onDelete: () => void;       // حذف هذا الاختبار (بسبب — ثانويّ وغير منافس)
}) {
  const notStarted = d.status === "not-started";
  const errLa = d.activeErrors.lastErrorDaysAgo;
  /* «آخر خطأ قبل…» — صياغةٌ سليمة بعد «قبل» (يومين لا يومان، وجمعٌ صحيح) */
  const errSub = d.activeErrors.available && errLa != null
    ? (errLa === 0 ? "آخر خطأ اليوم"
      : errLa === 1 ? "آخر خطأ أمس"
      : errLa === 2 ? "آخر خطأ قبل يومين"
      : `آخر خطأ قبل ${n(errLa)} ${errLa <= 10 ? "أيام" : "يوماً"}`)
    : undefined;

  return (
    <div className="flex flex-col gap-5">
      {/* ١ + ٢ — الاسم + الحالة */}
      <div className="flex items-center gap-3">
        <span className="text-[30px] leading-none flex-shrink-0" aria-hidden="true">{icon ?? "📄"}</span>
        <h2 className="t-h2 font-black leading-tight flex-1 min-w-0" style={{ color: "var(--text)" }}>{label}</h2>
        <span className="t-caption font-black px-3 py-1 rounded-full flex-shrink-0"
          style={{ background: `color-mix(in srgb, ${STATUS_COLOR[d.status]} 16%, transparent)`, color: STATUS_COLOR[d.status] }}>
          {EXAM_STATUS_LABEL[d.status]}
        </span>
      </div>

      {/* ٣ — المؤشّرات: «لم يبدأ» ⇒ رسالةٌ تحفيزية لا لوحةَ أصفار */}
      {notStarted ? (
        <div className="rounded-3xl p-5 flex items-start gap-3" style={{ background: "color-mix(in srgb, var(--gold) 10%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--gold) 32%, var(--border))" }}>
          <span className="text-[28px] flex-shrink-0" aria-hidden="true">🚀</span>
          <div className="min-w-0">
            <p className="t-title font-black mb-1" style={{ color: "var(--text)" }}>ابدأ أوّل جلسة لهذا الاختبار</p>
            <p className="t-body leading-relaxed" style={{ color: "var(--text-muted)" }}>
              وبعدها ستبدأ المنصّة بعرض تقدّمك وتحليلك بالكامل — الجاهزية، النسبة المتوقّعة، ومتى تكون مستعداً.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <Tile icon="🎯" label="الدرجة المستهدفة"
            value={d.target.available ? n(d.target.value) : null} hint="حدّد درجتك المستهدفة" />
          <Tile icon="📅" label="موعد الاختبار"
            value={d.examDate ? dateShort(d.examDate) : d.suggestedDate.available && d.suggestedDate.date ? dateShort(d.suggestedDate.date) : null}
            sub={!d.examDate && d.suggestedDate.available ? "مقترح" : undefined}
            hint={d.suggestedDate.hint || "حدّد موعد اختبارك أولاً."} />
          <Tile icon="⏳" label="الباقي"
            value={d.countdown.available ? (d.countdown.daysLeft < 0 ? "انتهى" : d.countdown.daysLeft === 0 ? "اليوم" : days(d.countdown.daysLeft)) : null}
            hint="حدّد الموعد ليظهر العدّ" />
          <Tile icon="📈" label="النسبة المتوقّعة"
            value={d.prediction.available ? pct(d.prediction.score) : null}
            tone={d.prediction.available ? BAND_COLOR[d.prediction.band] : undefined} hint={d.prediction.hint} />
          <Tile icon="🟢" label="الجاهزية"
            value={d.readiness.available ? `${pct(d.readiness.score)} · ${READINESS_LABEL[d.readiness.band]}` : null}
            tone={d.readiness.available ? BAND_COLOR[d.readiness.band] : undefined} hint="لا توجد بيانات كافية بعد" />
          <Tile icon="🚦" label="مستوى الخطر"
            value={d.danger.available ? DANGER_LABEL[d.danger.band] : null}
            tone={d.danger.available ? BAND_COLOR[d.danger.band] : undefined} hint="ابدأ المذاكرة ليُقاس الخطر" />
          <Tile icon="❌" label="الأخطاء"
            value={d.activeErrors.available ? n(d.activeErrors.count) : null} sub={errSub}
            hint="سجّل أخطاءك في «أخطائي»" />
          <Tile icon="📚" label="إنجاز المذاكرة"
            value={d.planProgress.available ? pct(d.planProgress.pct) : null}
            tone={color} hint="أضِف دروسك وابدأ إنجازها" />
        </div>
      )}

      {/* ٤ — الزرّ الأساسي الوحيد (أهمّ عنصر) */}
      <button onClick={onOpen} className="btn-primary glow-blue w-full text-center">
        ▶ ابدأ المذاكرة
      </button>

      {/* ٥ — مواد هذا الاختبار (كلٌّ بطاقةٌ تدخل للمذاكرة) */}
      {subjects.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <p className="eyebrow px-1">📖 مواد هذا الاختبار</p>
          {subjects.map((s) => (
            <button key={s.name} onClick={onOpen}
              className="rounded-2xl px-4 py-3.5 flex items-center gap-3 text-right transition active:scale-[0.98]"
              style={{ background: "var(--surface)", border: `1.5px solid ${s.color}33` }}>
              <span className="w-1.5 self-stretch rounded-full flex-shrink-0" style={{ background: s.color, minHeight: "34px" }} />
              <div className="flex-1 min-w-0">
                <p className="font-black t-body" style={{ color: "var(--text)" }}>{s.name}</p>
                <p className="t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>{s.pct > 0 ? `أنجزت ${pct(s.pct)}` : "لم تبدأ بعد"}</p>
              </div>
              {s.pct > 0 && <span className="font-mono-nums font-black t-body flex-shrink-0" style={{ color: s.color }}>{pct(s.pct)}</span>}
              <span className="text-[16px] font-black flex-shrink-0" style={{ color: "var(--text-muted)" }}>←</span>
            </button>
          ))}
        </section>
      )}

      {/* ٦ — أدواتٌ ثانوية (لا تنافس زرّ المذاكرة) */}
      <section className="flex flex-col gap-2">
        <p className="eyebrow px-1">🧰 أدوات مساعِدة</p>
        <div className="grid grid-cols-2 gap-2">
          <SecondaryTool icon="📖" label="الدليل" onClick={onOpen} />
          <SecondaryTool icon="🎯" label="التجميعات" onClick={onOpen} />
          <SecondaryTool icon="📊" label="النتائج" onClick={onOpen} />
          <Link href="/plan" className="rounded-xl px-3 py-3 flex items-center gap-2 no-underline transition active:scale-[0.98]"
            style={{ background: "var(--surface2)", border: "1.5px solid var(--border)" }}>
            <span className="text-[16px]" aria-hidden="true">🗓️</span>
            <span className="t-body font-bold" style={{ color: "var(--text)" }}>الخطة</span>
          </Link>
        </div>
      </section>

      {/* حذف الاختبار — ثانويٌّ وخافت (لا ينافس) */}
      <button onClick={onDelete} className="self-center t-caption font-bold px-3 py-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>
        🗑️ حذف هذا الاختبار
      </button>
    </div>
  );
}

function SecondaryTool({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-xl px-3 py-3 flex items-center gap-2 transition active:scale-[0.98]"
      style={{ background: "var(--surface2)", border: "1.5px solid var(--border)" }}>
      <span className="text-[16px]" aria-hidden="true">{icon}</span>
      <span className="t-body font-bold" style={{ color: "var(--text)" }}>{label}</span>
    </button>
  );
}
