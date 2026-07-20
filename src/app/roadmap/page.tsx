"use client";
/* ═══════════════ مساري — لوحة عمل الطالب من وحداتٍ مستقلة ═══════════════
   بُنيت بالكامل على نظام الوحدات (Module Workspace). تقرأ فقط من المصدر الجديد:
   Profile → recommendedExams (اقتراح الوحدات) → Life Engine (ماذا الآن). كل وحدة
   تُعرض من واصفها في قالبٍ واحد (لا صفحة لكل وحدة، ولا منطق Track/goal للقرار).
   الإضافة/الحذف/الإخفاء/الأولوية عبر Workspace (المكان الوحيد الذي يُنشئ وحدة). */
import { useState } from "react";
import Link from "next/link";
import Dome from "@/components/Dome";
import PageFooter from "@/components/PageFooter";
import PageGuide from "@/components/PageGuide";
import ModuleWorkspace from "@/components/roadmap/ModuleWorkspace";
import AddModuleMenu from "@/components/roadmap/AddModuleMenu";
import JourneyTimeline from "@/components/roadmap/JourneyTimeline";
import { loadUser, saveUser, ensureWorkspace, saveWorkspace, loadList, localDayKey, loadResults } from "@/lib/storage";
import { toBoardStage, type BoardStage } from "@/lib/examEligibility";
import { recommendedExamsForUser, type RecommendedExam } from "@/lib/recommendedExams";
import { readLifeContext, lifeEngine } from "@/lib/lifeEngine";
import {
  moduleView, memberView, moduleContent, isGroup, groupMembers, MODULE_STATE_LABEL,
  addModule, addMember, removeModule, removeMember, hideModule, setPriority,
  recordScore, setState as wsSetState, recordMemberScore, setMemberState, visibleModules,
  type Workspace, type ModuleId, type ExamMemberId, type ModuleInstance, type ModuleState,
  type AddTarget, type EligibilityContext,
} from "@/lib/modules";

/* مفاتيح تخزين الدروس/التمارين (تطابق StudyBody — لحساب تقدّم البطاقة) */
const DONE_KEY = "darb_done_lessons";
const CUSTOM_KEY = "darb_lessons";
interface Lesson { subject: string; id: string; }
interface Train { id: string; subject: string; }

/* تقدّم مادةٍ دراسيةٍ من التخزين القائم (نفس مصدر StudyBody) */
function studyPct(subjects: { name: string }[] | undefined): number {
  if (!subjects?.length || typeof window === "undefined") return 0;
  const done = new Set(loadList<string>(DONE_KEY));
  const custom = loadList<Lesson>(CUSTOM_KEY);
  const tItems = loadList<Train>("darb_tadreeb_items");
  const tDone = new Set(loadList<string>("darb_tadreeb_done"));
  let total = 0, hit = 0;
  for (const s of subjects) {
    const keys = custom.filter((c) => c.subject === s.name).map((c) => `custom-${c.id}`);
    const tr = tItems.filter((t) => t.subject === s.name).map((t) => t.id);
    total += keys.length + tr.length;
    hit += keys.filter((k) => done.has(k)).length + tr.filter((k) => tDone.has(k)).length;
  }
  return total === 0 ? 0 : Math.round((hit / total) * 100);
}

const STATE_COLOR: Record<ModuleState, string> = {
  "not-added": "var(--text-muted)", added: "var(--text-muted)", active: "var(--accent-light)",
  paused: "#F59E0B", completed: "#10B981", "needs-retake": "#EF4444",
};

/* ترتيب البطاقات حسب الأولوية: المثبّتة أولاً، ثم الأكثر إلحاحاً (نشط/يحتاج إعادة)
   فالمضاف فالمتوقّف فالمكتمل. عرضٌ فقط — لا يمسّ ترتيب البيانات في Workspace. */
const STATE_ORDER: Record<ModuleState, number> = {
  active: 0, "needs-retake": 1, added: 2, paused: 3, completed: 4, "not-added": 5,
};
function byPriority(a: ModuleInstance, b: ModuleInstance): number {
  if (!!a.priority !== !!b.priority) return a.priority ? -1 : 1;
  return (STATE_ORDER[a.state] ?? 9) - (STATE_ORDER[b.state] ?? 9);
}

/* وجهة recommendedExam → هدف إضافة (لاقتراح سريع من الوجهة) */
function recTarget(r: RecommendedExam): AddTarget | null {
  switch (r.kind) {
    case "qudurat": return { kind: "module", id: "qudurat" };
    case "tahsili": return { kind: "module", id: "tahsili" };
    case "aramco": return { kind: "member", id: "aramco" };
    case "itc": return { kind: "member", id: "itc" };
    default: return null; // language: عبر زر الإضافة (مجموعة)
  }
}

export default function RoadmapPage() {
  const [user] = useState(() => (typeof window !== "undefined" ? loadUser() : null));
  const [ws, setWs] = useState<Workspace | null>(() => {
    if (typeof window === "undefined") return null;
    const u = loadUser();
    if (!u) return null;
    const ensured = ensureWorkspace(u);
    if (!u.workspace && ensured.workspace) saveUser(ensured); // ثبّت البناء الأول
    return ensured.workspace ?? null;
  });
  const [sel, setSel] = useState<{ kind: "module" | "member"; id: string } | null>(null);
  /* بطاقة الخيارات المفتوحة (تثبيت/إخفاء/حذف) — واحدةٌ في أي لحظة، لتقليل التشتيت */
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  /* أولوية Life Engine (ماذا الآن) — تُقرأ مرّة (لقطة العميل) */
  const [top] = useState(() => (typeof window === "undefined" ? null : lifeEngine(readLifeContext())[0] ?? null));

  if (!ws) return <div className="min-h-dvh" />;

  const apply = (fn: (w: Workspace) => Workspace) =>
    setWs((cur) => { if (!cur) return cur; const next = fn(cur); saveWorkspace(next); return next; });

  const today = localDayKey();
  const stage: BoardStage | null = toBoardStage({ studyLevel: user?.studyLevel, grade: user?.grade });
  const rec = recommendedExamsForUser(
    { studyLevel: user?.studyLevel, grade: user?.grade, gradStage: user?.gradStage, targets: user?.targets, academicTerm: user?.academicTerm },
    today,
  );
  const ctx: EligibilityContext | null = stage ? {
    stage,
    isUniGrad: user?.gradStage === "خريج جامعة",
    afterFirstTerm: user?.academicTerm ? user.academicTerm !== "first" : false,
    isTargeted: rec.some((r) => r.kind === "qudurat" || r.kind === "tahsili"),
    today,
  } : null;

  /* ── فضاء وحدة/عضو مفتوح ── */
  if (sel) {
    if (sel.kind === "module") {
      const id = sel.id as ModuleId;
      const inst = ws.modules.find((m) => m.id === id);
      /* التقدّم + الوحدة التالية + عدّاد الاكتمال (لشاشة النجاح) — من بياناتٍ قائمة */
      const pct = studyPct(moduleContent(id).subjects);
      const sorted = [...visibleModules(ws)].sort(byPriority);
      const doneCount = sorted.filter((m) => m.state === "completed").length;
      const idx = sorted.findIndex((m) => m.id === id);
      let nextUnit: { label: string; icon?: string; onOpen: () => void } | undefined;
      for (let i = idx + 1; i < sorted.length; i++) {
        if (!isGroup(sorted[i].id)) { const nid = sorted[i].id; const nv = moduleView(nid); nextUnit = { label: nv.label, icon: nv.icon, onOpen: () => setSel({ kind: "module", id: nid }) }; break; }
      }
      return (
        <div className="min-h-dvh pb-nav relative z-[1] page-enter">
          <div className="px-5 py-6 max-w-2xl mx-auto w-full">
            <ModuleWorkspace
              view={moduleView(id)}
              state={inst?.state ?? "added"}
              progressPct={pct}
              next={nextUnit}
              completedCount={doneCount}
              totalCount={sorted.length}
              onBack={() => setSel(null)}
              onRecordScore={(s) => apply((w) => recordScore(w, id, s))}
              onToggleRetake={() => apply((w) => wsSetState(w, id, inst?.state === "needs-retake" ? "active" : "needs-retake"))}
            />
          </div>
        </div>
      );
    }
    const mid = sel.id as ExamMemberId;
    const member = groupMembers(ws, moduleView("english").id).concat(groupMembers(ws, "programs")).find((x) => x.id === mid);
    return (
      <div className="min-h-dvh pb-nav relative z-[1] page-enter">
        <div className="px-5 py-6 max-w-2xl mx-auto w-full">
          <ModuleWorkspace
            view={memberView(mid)}
            state={member?.state ?? "added"}
            progressPct={studyPct(memberView(mid).content.subjects)}
            onBack={() => setSel(null)}
            onRecordScore={(s) => apply((w) => recordMemberScore(w, mid, s))}
            onToggleRetake={() => apply((w) => setMemberState(w, mid, member?.state === "needs-retake" ? "active" : "needs-retake"))}
          />
        </div>
      </div>
    );
  }

  /* ── اللوحة ── */
  const cards = visibleModules(ws);
  /* اقتراحات الوجهة غير المضافة (من recommendedExams) */
  const present = new Set<string>();
  for (const m of ws.modules) { present.add(m.id); (m.members ?? []).forEach((x) => present.add(x.id)); }
  const suggestions = rec
    .map((r) => ({ r, t: recTarget(r) }))
    .filter((x): x is { r: RecommendedExam; t: AddTarget } => !!x.t && !present.has(x.t.id));

  /* مرحلة الرحلة الحالية (خط الرحلة) — مشتقّة من بياناتٍ قائمة، عرضٌ فقط بلا منطقٍ جديد:
     بدأت(٠) · تذاكر(١) · اختبرت(٢) · بانتظار النتيجة(٣) · جاهز للتقديم(٤) · القبول(٥ الهدف). */
  const jResults = typeof window !== "undefined" ? loadResults() : [];
  const jStudied = ws.modules.some((m) => (m.progress ?? 0) > 0 || m.state === "active" || m.state === "completed");
  const jScore = jResults.length > 0;
  const jPending = (user?.pendingResults?.length ?? 0) > 0;
  const jFinal = (user?.finalizedExams?.length ?? 0) > 0;
  const journeyStage = jFinal ? 4 : jPending ? 3 : jScore ? 2 : jStudied ? 1 : 0;

  const renderCard = (m: ModuleInstance) => {
    const v = moduleView(m.id);
    const group = isGroup(m.id);
    const members = group ? groupMembers(ws, m.id) : [];
    const pct = !group ? studyPct(moduleContent(m.id).subjects) : Math.round(members.reduce((a, x) => a + studyPct(memberView(x.id).content.subjects), 0) / (members.length || 1));
    const recHint = rec.find((r) =>
      (r.kind === "qudurat" && m.id === "qudurat") || (r.kind === "tahsili" && m.id === "tahsili") ||
      (r.kind === "language" && m.id === "english") ||
      (["aramco", "itc"].includes(r.kind) && m.id === "programs"));

    const menuOpen = openMenu === m.id;
    return (
      <div key={m.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: `1.5px solid ${v.color}33` }}>
        <div className="flex items-stretch">
          <button onClick={() => !group && setSel({ kind: "module", id: m.id })}
            className="flex-1 min-w-0 p-4 flex items-center gap-3 text-right transition active:scale-[0.99]"
            style={{ cursor: group ? "default" : "pointer" }}>
            <span className="text-[26px] flex-shrink-0" aria-hidden="true">{v.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-black t-title" style={{ color: "var(--text)" }}>{v.label}</p>
                {m.priority && <span className="t-caption" title="أولوية مثبّتة">📌</span>}
              </div>
              <p className="t-caption mt-0.5" style={{ color: STATE_COLOR[m.state] }}>
                {MODULE_STATE_LABEL[m.state]}{recHint?.hint ? ` · ${recHint.hint}` : ""}
              </p>
            </div>
            {!group && pct > 0 && <span className="font-mono-nums font-black t-body flex-shrink-0" style={{ color: v.color }}>{pct}%</span>}
            {!group && <span className="text-[16px] font-black flex-shrink-0" style={{ color: "var(--text-muted)" }}>←</span>}
          </button>
          {/* خيارات الوحدة — مطويّة افتراضياً لتقليل التشتيت */}
          <button onClick={() => setOpenMenu(menuOpen ? null : m.id)} aria-label="خيارات الوحدة" aria-expanded={menuOpen}
            className="px-3 flex items-center justify-center flex-shrink-0 text-[20px] font-black transition active:scale-90"
            style={{ color: menuOpen ? "var(--accent-light)" : "var(--text-muted)", borderInlineStart: "1px solid var(--border)" }}>⋯</button>
        </div>

        {/* أعضاء المجموعة (اللغة/البرامج) — كلٌّ فضاءٌ مستقل */}
        {group && (
          <div className="px-4 pb-4 flex flex-col gap-2">
            {members.length === 0 && <p className="t-caption px-1" style={{ color: "var(--text-muted)" }}>أضف اختباراً من «إضافة وحدة».</p>}
            {members.map((x) => {
              const mv = memberView(x.id);
              const mp = studyPct(mv.content.subjects);
              return (
                <button key={x.id} onClick={() => setSel({ kind: "member", id: x.id })}
                  className="rounded-xl px-3.5 py-3 flex items-center gap-3 text-right transition active:scale-[0.98]"
                  style={{ background: "var(--surface2)", border: `1.5px solid ${mv.color}33` }}>
                  <div className="w-1.5 self-stretch rounded-full flex-shrink-0" style={{ background: mv.color, minHeight: "28px" }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold t-body" style={{ color: "var(--text)" }}>{mv.label}</p>
                    <p className="t-caption mt-0.5" style={{ color: STATE_COLOR[x.state] }}>{MODULE_STATE_LABEL[x.state]}</p>
                  </div>
                  {mp > 0 && <span className="font-mono-nums font-black t-small flex-shrink-0" style={{ color: mv.color }}>{mp}%</span>}
                  <button onClick={(e) => { e.stopPropagation(); apply((w) => removeMember(w, x.id)); }}
                    className="text-[15px] px-1.5 min-h-[36px] flex-shrink-0" style={{ color: "var(--text-muted)" }} aria-label="حذف">✕</button>
                </button>
              );
            })}
          </div>
        )}

        {/* شريط التحكّم — يظهر فقط عند فتح «⋯» */}
        {menuOpen && (
          <div className="px-4 pb-3 flex items-center gap-2 flex-wrap rise" style={{ borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
            <button onClick={() => apply((w) => setPriority(w, m.id, !m.priority))}
              className="t-caption font-bold px-2.5 py-1 rounded-lg" style={{ background: "var(--surface2)", color: m.priority ? "var(--accent-light)" : "var(--text-muted)" }}>
              {m.priority ? "📌 إلغاء التثبيت" : "📌 تثبيت أولوية"}
            </button>
            {m.kind !== "core" && (
              <>
                <button onClick={() => apply((w) => hideModule(w, m.id, true))}
                  className="t-caption font-bold px-2.5 py-1 rounded-lg" style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>🙈 إخفاء</button>
                <button onClick={() => { if (confirm(`حذف وحدة ${v.label} من مساري؟`)) apply((w) => removeModule(w, m.id)); }}
                  className="t-caption font-bold px-2.5 py-1 rounded-lg ms-auto" style={{ background: "transparent", color: "#EF4444" }}>🗑️ حذف</button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-dvh pb-nav relative z-[1] page-enter">
      <div className="max-w-2xl mx-auto w-full">
        <PageGuide pageKey="roadmap" steps={[
          { title: "مساري = طريقك خطوة بخطوة", desc: "في الأعلى «خطوتك الآن» تقول لك ماذا تفعل اليوم، وتحتها وحداتك مرتّبةً حسب الأولوية." },
          { title: "أضف ما يخصّك", desc: "من «إضافة وحدة» تختار اختبارات القبول واللغة والبرامج المتاحة لمرحلتك." },
          { title: "افتح أي وحدة", desc: "اضغط الوحدة لتذاكر فيها، وزر «⋯» لخيارات التثبيت والإخفاء والحذف." },
        ]} />
        <Dome compact>
          <h1 className="title-lg grad-title">مساري</h1>
        </Dome>
        <div className="h-4" />

        <div className="px-5 flex flex-col gap-5">
          {/* خطوتك الآن — الهيرو (من Life Engine): أوّل ما يراه الطالب */}
          {top && (
            <Link href={top.href} className="rounded-3xl p-5 no-underline block transition active:scale-[0.99]"
              style={{ background: "color-mix(in srgb, var(--accent) 12%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--accent) 34%, var(--border))" }}>
              <p className="eyebrow mb-2.5" style={{ color: "var(--accent-light)" }}>🧭 خطوتك الآن</p>
              <div className="flex items-start gap-3">
                <span className="text-[30px] leading-none flex-shrink-0" aria-hidden="true">{top.icon}</span>
                <p className="t-h3 font-black flex-1 min-w-0 leading-snug" style={{ color: "var(--text)" }}>{top.title}</p>
              </div>
              <div className="btn-primary glow-blue mt-4 w-full text-center pointer-events-none">{top.cta} ←</div>
            </Link>
          )}

          {/* خط الرحلة — إحساس السير في رحلةٍ لا مجرّد بطاقات */}
          <JourneyTimeline stage={journeyStage} />

          {/* اقتراحات الوجهة (من recommendedExams) */}
          {suggestions.length > 0 && (
            <section>
              <p className="eyebrow mb-2.5 px-1">✨ مقترحة لوجهتك</p>
              <div className="rounded-2xl p-3 flex flex-col gap-2" style={{ background: "color-mix(in srgb, var(--accent) 6%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--accent) 20%, var(--border))" }}>
                {suggestions.map(({ r, t }) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5" style={{ background: "var(--surface2)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold t-body" style={{ color: "var(--text)" }}>{r.label}</p>
                      <p className="t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>{r.reason}</p>
                    </div>
                    <button onClick={() => apply((w) => (t.kind === "module" ? addModule(w, t.id) : addMember(w, t.id)))}
                      className="t-caption font-black px-3 py-1.5 rounded-lg flex-shrink-0" style={{ background: "var(--accent)", color: "#fff" }}>أضف ＋</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* وحداتك — مرتّبة حسب الأولوية (المثبّتة ثم الأكثر إلحاحاً) */}
          <section>
            <p className="eyebrow mb-2.5 px-1">📚 وحداتك</p>
            <div className="flex flex-col gap-3">
              {cards.length > 0
                ? [...cards].sort(byPriority).map(renderCard)
                : <p className="t-body px-1" style={{ color: "var(--text-muted)" }}>لا وحدات بعد — أضف أوّل وحدة من الأسفل لتبدأ رحلتك.</p>}
            </div>
          </section>

          {/* إضافة وحدة (هرمي، مقيّد بالأهلية) */}
          {ctx && <AddModuleMenu ws={ws} ctx={ctx} onAdd={(t) => apply((w) => (t.kind === "module" ? addModule(w, t.id) : addMember(w, t.id)))} />}

          {/* وحدات مخفيّة — إظهار سريع */}
          {ws.modules.some((m) => m.hidden) && (
            <div className="flex flex-wrap gap-2">
              <span className="t-caption self-center" style={{ color: "var(--text-muted)" }}>مخفيّة:</span>
              {ws.modules.filter((m) => m.hidden).map((m) => (
                <button key={m.id} onClick={() => apply((w) => hideModule(w, m.id, false))}
                  className="t-caption font-bold px-3 py-1.5 rounded-lg" style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
                  {moduleView(m.id).icon} {moduleView(m.id).label} — إظهار
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-6" />
        <PageFooter />
      </div>
    </div>
  );
}
