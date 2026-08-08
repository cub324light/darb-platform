"use client";
/* ─── قالب فضاء الوحدة الواحد (Module Workspace Template) ───
   قالبٌ واحد يعرض أي وحدة/عضو من واصفها. أُعيد تصميم تجربته (UX فقط، بلا تغيير منطق):
   هيرو واضح (عنوان كبير · لماذا · ماذا ستذاكر · كم أنجزت · زرٌّ أساسيٌّ واحد) ثم أدوات
   ثانوية (الدليل/التجميعات/النتائج/الخطة). حالة «اكتمل» احتفالية.
   يقرأ من: الواصف + نتائج الطالب + الإحصائيات. لا Track/goal.
   ▸ حُذفت بطاقتا «ماذا أفعل الآن» و«ابدأ أوّل خطوة اليوم»: الأولى كانت تعيد الطالب إلى
     /roadmap وهو داخلها أصلاً (حلقة)، والثانية تكرّر ما يقوله قسم المذاكرة تحتها مباشرةً. */
import { useState } from "react";
import Link from "next/link";
import { loadTrackExamDates, saveTrackExamDates, loadResults, saveResults, currentScoreMap, loadStats } from "@/lib/storage";
import { computeXP, getLevel } from "@/lib/xp";
import { trackEvent } from "@/lib/analytics";
import { MODULE_STATE_LABEL, type ModuleState } from "@/lib/modules";
import type { ModuleContent, GuideSection } from "@/lib/modules";
import { n } from "@/lib/format";
import ExamDateButton from "@/components/ExamDateButton";
import Sheet from "@/components/Sheet";
import BackButton from "@/components/BackButton";
import dynamic from "next/dynamic";
const LeaksPlanner = dynamic(() => import("@/components/LeaksPlanner"), { ssr: false });
const StudyBody = dynamic(() => import("./StudyBody"), { ssr: false });

export interface WorkspaceView {
  label: string;
  icon?: string;          // الوحدة العليا فقط؛ العضو بلا أيقونة (fallback في الرأس)
  color: string;
  content: ModuleContent;
}

export interface NextUnit { label: string; icon?: string; onOpen: () => void; }

const todayStr = () => new Date().toISOString().slice(0, 10);
const daysLeft = (d: string) =>
  Math.round((new Date(d + "T00:00:00").getTime() - new Date(todayStr() + "T00:00:00").getTime()) / 86400000);

const STATE_COLOR: Record<ModuleState, string> = {
  "not-added": "var(--text-muted)", added: "var(--text-muted)", active: "var(--accent-light)",
  paused: "#F59E0B", completed: "#10B981", "needs-retake": "#EF4444",
};

const scrollToStudy = () => document.getElementById("ws-study")?.scrollIntoView({ behavior: "smooth", block: "start" });

export default function ModuleWorkspace({
  view, state, onBack, onRecordScore, onToggleRetake,
  progressPct = 0, next, completedCount, totalCount,
}: {
  view: WorkspaceView;
  state: ModuleState;
  onBack: () => void;
  onRecordScore: (score: string) => void;
  onToggleRetake: () => void;
  progressPct?: number;
  next?: NextUnit;
  completedCount?: number;
  totalCount?: number;
}) {
  const { label, icon, color, content } = view;
  const examKey = content.examKey;
  const isStudy = content.kind === "study";
  const done = state === "completed" || progressPct >= 100;
  const subjects = content.subjects ?? [];

  const [dates, setDates] = useState<Record<string, string>>(() => (typeof window !== "undefined" ? loadTrackExamDates() : {}));
  const [scoreInput, setScoreInput] = useState("");
  /* ▓ المادةُ تُفتح في **ورقةٍ منبثقة** — نفسُ نمط ورقة «＋ يدويّاً» في خطتي.
     جرّبنا التوسيعَ داخل الصفحة مع تمريرٍ إليه فلم يكن ما يريده الطالب: هو
     يريد شاشةَ المادة أمامه، لا قفزةً إلى أسفل صفحةٍ طويلة.
     ولا نُبقي StudyBody مركّباً مرّتين في آنٍ واحد: النسختان تقرآن نفس مفاتيح
     التخزين وتكتبانها، فالتي بقيت في الصفحة تحمل قِيَماً قديمة فتمحو ما أنجزه
     الطالبُ في الورقة. فواحدةٌ تعمل، والأخرى تُفكّ فتقرأ من جديدٍ عند العودة. */
  const [studyPhase, setStudyPhase] = useState<"tasees" | "tadreeb">("tasees");
  const [sheetSubject, setSheetSubject] = useState<string | null>(null);
  const openSubject = (name: string, ph: "tasees" | "tadreeb" = "tasees") => {
    setStudyPhase(ph);
    setSheetSubject(name);
  };
  const [scores, setScores] = useState<Record<string, { score: number; attempts: number }>>(() =>
    typeof window !== "undefined" ? currentScoreMap() : {});

  const d = examKey ? (dates[examKey] ?? "") : "";
  const dl = d ? daysLeft(d) : null;
  const myScore = scores[label]?.score;

  const setExamDate = (v: string) => { if (!examKey) return; const up = { ...dates, [examKey]: v }; setDates(up); saveTrackExamDates(up); };
  const clearExamDate = () => { if (!examKey) return; const up = { ...dates }; delete up[examKey]; setDates(up); saveTrackExamDates(up); };

  const recordScore = () => {
    const g = parseFloat(scoreInput);
    if (isNaN(g)) return;
    const prev = loadResults();
    saveResults([{ id: `${Date.now()}`, exam: label, score: String(g), date: d || todayStr() }, ...prev]);
    trackEvent("exam_completed", { exam: label, attemptNumber: prev.filter((r) => r.exam.trim() === label).length + 1 });
    /* ▓ الحدثان القائمان — بنفس دلالات «نتائجي» حرفاً بحرف. كانت هذه الشاشةُ
       تكتب الدرجةَ وتكتفي بالتحليلات، فيُنتج الفعلُ الواحدُ حالتين مختلفتين
       للذاكرة بحسب الشاشة التي سجّل منها الطالب: من «نتائجي» يعرف دويربُ
       إتقانَ المادّة ومَعلَمَ إكمال الاختبار، ومن هنا لا يعرف شيئاً.
       ولا حدثَ جديد: النوعان مسجَّلان ولهما مُتفاعِلٌ منذ البداية. */
    if (Number.isFinite(g)) {
      const before = prev.find((x) => x.exam === label && x.score != null);
      const prevScore = before?.score != null ? parseFloat(before.score) : NaN;
      import("@/lib/events").then(({ emit }) => {
        emit({ eventType: "ScoreUpdated", metadata: { exam: label, score: g, prev: Number.isFinite(prevScore) ? prevScore : undefined }, actor: { kind: "student" }, source: "ui" });
        emit({ eventType: "ExamCompleted", metadata: { exam: label, score: g }, actor: { kind: "student" }, source: "ui" });
      }).catch(() => { /* فشلُ الإطلاق لا يُسقط تسجيلَ الدرجة */ });
    }
    setScores(currentScoreMap());
    setScoreInput("");
    onRecordScore(String(g));
  };

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* رجوع خفيف أعلى الصفحة — الزرّ الموحّد نفسه في كل الصفحات */}
      <div className="self-start"><BackButton href="/roadmap" label="مساري" onBack={onBack} /></div>

      {/* ── شاشة الاكتمال (احتفالية) ── */}
      {done && <CompletionCard label={label} color={color} next={next} completedCount={completedCount} totalCount={totalCount} onBack={onBack} />}

      {/* ── الهيرو: عنوان كبير · لماذا · ماذا ستذاكر · كم أنجزت · زرٌّ واحد ── */}
      <div className="rounded-3xl p-5" style={{ background: `color-mix(in srgb, ${color} 9%, var(--surface))`, border: `1.5px solid ${color}40` }}>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-[32px] leading-none flex-shrink-0" aria-hidden="true">{icon ?? "📄"}</span>
          <h2 className="t-h2 font-black leading-tight flex-1 min-w-0" style={{ color: "var(--text)" }}>{label}</h2>
          <span className="t-caption font-black px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: `color-mix(in srgb, ${STATE_COLOR[state]} 16%, transparent)`, color: STATE_COLOR[state] }}>
            {MODULE_STATE_LABEL[state]}
          </span>
        </div>
        <p className="t-body leading-relaxed" style={{ color: "var(--text-muted)" }}>{content.intro}</p>

        {isStudy && (
          <>
            {/* نطاق + تقدّم */}
            <div className="flex items-center gap-2 flex-wrap mt-4">
              {subjects.length > 0 && (
                <span className="t-caption font-bold px-2.5 py-1 rounded-full" style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>📚 {n(subjects.length)} مواد</span>
              )}
              <span className="t-caption font-bold px-2.5 py-1 rounded-full font-mono-nums" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
                {done ? "اكتملت ✓" : `أنجزت ${n(progressPct)}٪`}
              </span>
            </div>
            {/* شريط التقدّم */}
            <div className="h-2.5 rounded-full overflow-hidden mt-3" style={{ background: "color-mix(in srgb, var(--text-muted) 20%, transparent)" }}>
              <div className="h-full rounded-full" style={{ width: `${Math.max(progressPct, done ? 100 : 0)}%`, background: done ? "var(--success)" : color }} />
            </div>
            {/* ماذا ستذاكر */}
            {subjects.length > 0 && (
              <div className="mt-4">
                <p className="t-caption font-bold mb-2" style={{ color: "var(--text-dim)" }}>ماذا ستذاكر</p>
                {/* ▓ كانت وسوماً جامدة: يضغط الطالبُ «الكمي» فلا يحدث شيء،
                    ودروسُها مكدّسةٌ في آخر الصفحة. صارت أزراراً تفتح ورقةَ
                    المادة فوق الصفحة — لا قفزةً إلى أسفلها. */}
                <div className="flex flex-wrap gap-1.5">
                  {subjects.map((s) => (
                    <button key={s.name} type="button"
                      onClick={() => openSubject(s.name)}
                      aria-label={`افتح دروس ${s.name}`}
                      className="t-caption font-bold px-2.5 py-1 rounded-lg transition active:scale-[0.96]"
                      style={{ background: "var(--surface2)", color: "var(--text)",
                               border: `1px solid ${(s.color ?? color)}44` }}>
                      {s.name} ←
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* زرٌّ أساسيٌّ واحد */}
            <button onClick={scrollToStudy} className="btn-primary glow-blue mt-5 w-full">
              {progressPct <= 0 ? "▶ ابدأ المذاكرة" : done ? "🔁 راجع المذاكرة" : "▶ أكمل المذاكرة"}
            </button>
          </>
        )}
      </div>

      {isStudy ? (
        <>
          {/* ── المذاكرة (الفعل الأساسي) ── */}
          <section id="ws-study" className="flex flex-col gap-3">
            <p className="eyebrow px-1">📖 المذاكرة</p>
            {/* الضغطُ من الشبكة يفتح الورقةَ أيضاً — سلوكٌ واحد لا اثنان */}
            {content.subjects && !sheetSubject && (
              <StudyBody subjects={content.subjects} examKey={examKey}
                selected={null} phase={studyPhase}
                onSelect={(name, ph) => { if (name) openSubject(name, ph); }} />
            )}
          </section>

          {/* ── أدوات مساعِدة (ثانوية) ── */}
          {content.guide && <StartHereGuide sections={content.guide} color={color} />}

          <section className="flex flex-col gap-3">
            <p className="eyebrow px-1">🎯 التجميعات</p>
            <LeaksPlanner color="var(--gold)" daysLeft={d ? daysLeft(d) : null} />
          </section>

          {/* نتائجي: الدرجة + الرضا/الإعادة */}
          <section className="flex flex-col gap-3">
            <p className="eyebrow px-1">📊 نتائجي</p>
            <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
              {myScore != null ? (
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono-nums font-black t-h2" style={{ color }}>{myScore}</span>
                  <span className="t-caption" style={{ color: "var(--text-muted)" }}>آخر درجة مسجّلة{scores[label]?.attempts ? ` · ${scores[label].attempts} محاولة` : ""}</span>
                  <button onClick={onToggleRetake}
                    className="ms-auto t-caption font-bold px-3 py-1.5 rounded-lg"
                    style={{ background: state === "needs-retake" ? "#EF4444" : "transparent", border: "1.5px solid #EF4444", color: state === "needs-retake" ? "#fff" : "#EF4444" }}>
                    {state === "needs-retake" ? "أنوي الإعادة ✓" : "أنوي الإعادة"}
                  </button>
                </div>
              ) : (
                <p className="t-caption mb-3" style={{ color: "var(--text-muted)" }}>سجّل درجتك بعد الاختبار لتتابع تقدّمك وتقرّر الإعادة.</p>
              )}
              <div className="flex gap-2">
                <input type="number" value={scoreInput} onChange={(e) => setScoreInput(e.target.value)}
                  placeholder="أدخل درجتك..." className="flex-1 min-w-0 rounded-xl px-4 py-3 t-body font-bold outline-none min-h-[48px]"
                  style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
                <button onClick={recordScore} disabled={!scoreInput.trim() || isNaN(parseFloat(scoreInput))}
                  className="px-5 rounded-xl font-black t-body min-h-[48px]" style={{ background: color, color: "#fff", border: "none" }}>سجّل</button>
              </div>
            </div>
          </section>

          {/* خطتي: موعد الاختبار + جدولي */}
          <section className="flex flex-col gap-3">
            <p className="eyebrow px-1">🗓️ خطتي</p>
            {examKey && (
              <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
                <div className="flex-1 min-w-0">
                  <p className="font-bold t-body" style={{ color: "var(--text)" }}>موعد الاختبار</p>
                  <p className="t-caption mt-0.5" style={{ color: dl == null ? "var(--text-muted)" : dl < 0 ? "var(--text-muted)" : dl <= 3 ? "#EF4444" : dl <= 14 ? "#F97316" : "#10B981" }}>
                    {dl == null ? "غير محدّد" : dl < 0 ? "انتهى" : dl === 0 ? "اليوم — بالتوفيق" : `${dl} يوم على الموعد`}
                  </p>
                </div>
                <ExamDateButton value={d} color={color} min={todayStr()} onChange={setExamDate} onClear={clearExamDate} />
              </div>
            )}
            <Link href="/plan" className="rounded-2xl py-3 px-4 flex items-center gap-3 no-underline transition active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-hi))", color: "#fff" }}>
              <span className="text-[20px]">🗓️</span>
              <span className="flex-1 text-right font-black t-body">خطتي — جدول اليوم والأسبوع</span>
              <span className="text-[18px] font-black">←</span>
            </Link>
          </section>
        </>
      ) : (
        /* ── hub: روابط العالم القائم (المدرسة/الجامعة) ── */
        <>
          <section className="flex flex-col gap-3">
            <p className="eyebrow px-1">الروابط</p>
            {(content.hub ?? []).map((l) => (
              <Link key={l.href + l.label} href={l.href} className="rounded-2xl p-4 flex items-center gap-3 no-underline transition active:scale-[0.98]"
                style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
                <span className="text-[23px] flex-shrink-0">{l.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-black t-body" style={{ color: "var(--text)" }}>{l.label}</p>
                  {l.desc && <p className="t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>{l.desc}</p>}
                </div>
                <span className="text-[18px] font-black" style={{ color: "var(--text-muted)" }}>←</span>
              </Link>
            ))}
          </section>
        </>
      )}

      {/* ── ورقةُ المادة: تفتح فوق الصفحة عند الضغط على «الكمي» أو أختِها ── */}
      {sheetSubject && content.subjects && (
        <Sheet onClose={() => setSheetSubject(null)}
          title={`${studyPhase === "tasees" ? "دروس" : "تمارين"} ${sheetSubject}`}
          titleColor={content.subjects.find((s) => s.name === sheetSubject)?.color ?? color}>
          <StudyBody subjects={content.subjects} examKey={examKey}
            selected={sheetSubject} phase={studyPhase}
            onSelect={(name, ph) => { if (name) openSubject(name, ph); }}
            detailOnly />
        </Sheet>
      )}
    </div>
  );
}

/* شاشة نجاح الوحدة — احتفالٌ ببياناتٍ حقيقية (رصيدٌ حالي، لا مكافأةً جديدة تُصرف). */
function CompletionCard({ label, color, next, completedCount, totalCount, onBack }: {
  label: string; color: string; next?: NextUnit; completedCount?: number; totalCount?: number; onBack: () => void;
}) {
  const [{ silver, levelName }] = useState(() => {
    if (typeof window === "undefined") return { silver: 0, levelName: "" };
    const st = loadStats();
    return { silver: st?.silver ?? 0, levelName: st ? getLevel(computeXP(st)).name : "" };
  });
  return (
    <div className="ds-card rise text-center" style={{ background: "color-mix(in srgb, var(--success) 12%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--success) 42%, var(--border))" }}>
      <div className="text-[46px] leading-none mb-1">✅</div>
      <h2 className="t-h2 font-black" style={{ color: "var(--text)" }}>أحسنت!</h2>
      <p className="t-body font-bold mt-1 mb-4" style={{ color: "var(--text-muted)" }}>أكملت وحدة {label} 🎉</p>

      <p className="t-caption font-bold mb-2" style={{ color: "var(--text-dim)" }}>رصيدك الآن</p>
      <div className="flex items-center justify-center gap-2.5 flex-wrap mb-4">
        <span className="t-title font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5" style={{ background: "var(--surface2)", color: "var(--text)" }}>🥈 <span className="font-mono-nums">{n(silver)}</span></span>
        {levelName && <span className="t-title font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5" style={{ background: "var(--surface2)", color: "var(--text)" }}>⭐ {levelName}</span>}
      </div>

      {typeof completedCount === "number" && typeof totalCount === "number" && totalCount > 0 && (
        <p className="t-body font-bold mb-4" style={{ color: color }}>تقدّمك في الرحلة: أكملت {n(completedCount)} من {n(totalCount)} وحدة</p>
      )}

      {next ? (
        <>
          <p className="t-caption font-bold mb-2" style={{ color: "var(--text-muted)" }}>الوحدة التالية: {next.icon} {next.label}</p>
          <button onClick={next.onOpen} className="btn-primary glow-blue w-full">ابدأ الوحدة التالية ←</button>
        </>
      ) : (
        <button onClick={onBack} className="btn-primary glow-blue w-full">→ رجوع إلى مساري</button>
      )}
    </div>
  );
}

/* «ابدأ من هنا» — الدليل الكامل للوحدة، تبويبٌ قابلٌ للطيّ (ثانويٌّ الآن، أسفل المذاكرة). */
function StartHereGuide({ sections, color }: { sections: GuideSection[]; color: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${color}55`, background: `color-mix(in srgb, ${color} 6%, var(--surface))` }}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full p-4 flex items-center gap-3 text-right transition active:scale-[0.99]">
        <span className="text-[24px] flex-shrink-0" aria-hidden="true">📖</span>
        <div className="flex-1 min-w-0">
          <p className="t-title font-black" style={{ color: "var(--text)" }}>الدليل الكامل</p>
          <p className="t-caption mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            ما هو الاختبار؟ الفرص، المحوسب والورقي، الرسوم، التسجيل، متى تبدأ، أفضل المصادر، والأسئلة الشائعة.
          </p>
        </div>
        <span className="t-body font-black flex-shrink-0" style={{ color }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-5 flex flex-col gap-5">
          {sections.map((sec, i) => (
            <div key={sec.title} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {sec.icon && <span className="text-[18px]" aria-hidden="true">{sec.icon}</span>}
                <h3 className="t-title font-black" style={{ color }}>{sec.title}</h3>
              </div>
              {sec.blocks.map((b, j) => (
                <div key={j} className="flex flex-col gap-1.5">
                  {b.sub && <p className="t-body font-black" style={{ color: "var(--text)" }}>{b.sub}</p>}
                  {b.text && <p className="t-body leading-relaxed" style={{ color: "var(--text-muted)" }}>{b.text}</p>}
                  {b.bullets && (
                    <ul className="flex flex-col gap-1.5">
                      {b.bullets.map((x, k) => (
                        <li key={k} className="t-body flex items-start gap-2.5" style={{ color: "var(--text-muted)" }}>
                          <span className="flex-shrink-0 mt-2 w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                          <span className="leading-relaxed">{x}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {b.note && (
                    <p className="t-body leading-relaxed rounded-xl p-3"
                      style={{ background: "color-mix(in srgb, var(--gold) 12%, var(--surface))", border: "1px solid color-mix(in srgb, var(--gold) 30%, transparent)", color: "var(--text)" }}>
                      {b.note}
                    </p>
                  )}
                </div>
              ))}
              {i < sections.length - 1 && <div className="h-px mt-2" style={{ background: "var(--border)" }} />}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
