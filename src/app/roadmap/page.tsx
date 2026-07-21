"use client";
/* ═══════════════ مساري — «🧭 الآن» (إعادة بناء · المرحلة B) ═══════════════
   مساري ليس Dashboard؛ هو مدير حياة الطالب. «الآن» تجيب خلال ٥ ثوانٍ عن «وش أسوي الآن؟»:
   ترحيبٌ من دويرب · رسالته اليوم · خطوتك الآن (Life Engine) · بطاقة الاختبار الأولوية
   (اسم + باقٍ + «جاهز تبدأ؟» — بلا مؤشّرات) · زرٌّ كبيرٌ واحد · شريط الأقسام أسفل.
   كل المنطق من الطبقة النقيّة (pickDailyMessage · Life Engine)؛ الصفحة تعرض فقط. */
import { useState } from "react";
import PageFooter from "@/components/PageFooter";
import PageGuide from "@/components/PageGuide";
import ModuleWorkspace from "@/components/roadmap/ModuleWorkspace";
import { loadUser, saveUser, ensureWorkspace, saveWorkspace, loadList, localDayKey, loadStats, loadTrackExamDates } from "@/lib/storage";
import { readLifeContext, lifeEngine } from "@/lib/lifeEngine";
import {
  moduleView, memberView, moduleContent, memberContent, isGroup, groupMembers, visibleModules,
  recordScore, setState as wsSetState, recordMemberScore, setMemberState,
  type Workspace, type ModuleId, type ExamMemberId, type ModuleInstance, type ModuleState,
} from "@/lib/modules";
import { orderByPriority } from "@/lib/roadmap/model";
import { loadRoadmapConfig } from "@/lib/roadmap/store";
import { pickDailyMessage } from "@/lib/roadmap/dailyMessage";
import { daysBetween, addDays } from "@/lib/roadmap/metrics";
import { days as daysWord } from "@/lib/format";

const DONE_KEY = "darb_done_lessons";
const CUSTOM_KEY = "darb_lessons";
interface Lesson { subject: string; id: string; }
interface Train { id: string; subject: string; }

/* تقدّم مادةٍ (لشاشة المذاكرة فقط — لا يظهر في «الآن») */
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

/* ترتيب شاشة المذاكرة (الوحدة التالية/الاكتمال) */
const STATE_ORDER: Record<ModuleState, number> = { active: 0, "needs-retake": 1, added: 2, paused: 3, completed: 4, "not-added": 5 };
const byPriority = (a: ModuleInstance, b: ModuleInstance): number =>
  (!!a.priority !== !!b.priority ? (a.priority ? -1 : 1) : (STATE_ORDER[a.state] ?? 9) - (STATE_ORDER[b.state] ?? 9));

/* أقسام مساري — تُبنى صفحاتها في المراحل التالية (C فصاعداً) */
const SECTIONS = [
  { id: "calendar", icon: "🗓️", label: "التقويم" },
  { id: "settings", icon: "⚙️", label: "الإعدادات" },
  { id: "resources", icon: "📚", label: "المصادر" },
  { id: "stats", icon: "📈", label: "الإحصائيات" },
] as const;

interface ExamEntry { kind: "module" | "member"; id: string; label: string; icon?: string; color: string; examKey?: string }

export default function RoadmapPage() {
  const [user] = useState(() => (typeof window !== "undefined" ? loadUser() : null));
  const [ws, setWs] = useState<Workspace | null>(() => {
    if (typeof window === "undefined") return null;
    const u = loadUser();
    if (!u) return null;
    const ensured = ensureWorkspace(u);
    if (!u.workspace && ensured.workspace) saveUser(ensured);
    return ensured.workspace ?? null;
  });
  const [sel, setSel] = useState<{ kind: "module" | "member"; id: string } | null>(null);
  const [top] = useState(() => (typeof window === "undefined" ? null : lifeEngine(readLifeContext())[0] ?? null));

  if (!ws) return <div className="min-h-dvh" />;

  const apply = (fn: (w: Workspace) => Workspace) =>
    setWs((cur) => { if (!cur) return cur; const next = fn(cur); saveWorkspace(next); return next; });

  const today = localDayKey();

  /* ── شاشة المذاكرة (تُفتح من «ابدأ المذاكرة» — مؤقّتاً حتى تُبنى «ماذا ستفعل اليوم؟» في C) ── */
  if (sel) {
    if (sel.kind === "module") {
      const id = sel.id as ModuleId;
      const inst = ws.modules.find((m) => m.id === id);
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
            <ModuleWorkspace view={moduleView(id)} state={inst?.state ?? "added"} progressPct={pct} next={nextUnit}
              completedCount={doneCount} totalCount={sorted.length} onBack={() => setSel(null)}
              onRecordScore={(s) => apply((w) => recordScore(w, id, s))}
              onToggleRetake={() => apply((w) => wsSetState(w, id, inst?.state === "needs-retake" ? "active" : "needs-retake"))} />
          </div>
        </div>
      );
    }
    const mid = sel.id as ExamMemberId;
    const member = groupMembers(ws, moduleView("english").id).concat(groupMembers(ws, "programs")).find((x) => x.id === mid);
    return (
      <div className="min-h-dvh pb-nav relative z-[1] page-enter">
        <div className="px-5 py-6 max-w-2xl mx-auto w-full">
          <ModuleWorkspace view={memberView(mid)} state={member?.state ?? "added"} progressPct={studyPct(memberView(mid).content.subjects)}
            onBack={() => setSel(null)}
            onRecordScore={(s) => apply((w) => recordMemberScore(w, mid, s))}
            onToggleRetake={() => apply((w) => setMemberState(w, mid, member?.state === "needs-retake" ? "active" : "needs-retake"))} />
        </div>
      </div>
    );
  }

  /* ── الاختبار صاحب الأولوية #١ (بلا مؤشّرات — اسم + باقٍ فقط) ── */
  const cfg = loadRoadmapConfig();
  const entries: ExamEntry[] = [];
  for (const m of visibleModules(ws)) {
    if (m.kind === "core") continue;
    if (isGroup(m.id)) groupMembers(ws, m.id).forEach((x) => { const v = memberView(x.id); entries.push({ kind: "member", id: x.id, label: v.label, color: v.color, examKey: memberContent(x.id).examKey }); });
    else { const v = moduleView(m.id); entries.push({ kind: "module", id: m.id, label: v.label, icon: v.icon, color: v.color, examKey: moduleContent(m.id).examKey }); }
  }
  const ordered = orderByPriority(cfg, entries.map((e) => e.id));
  const priority = entries.find((e) => e.id === ordered[0]) ?? entries[0] ?? null;

  const examDate = priority?.examKey ? (loadTrackExamDates()[priority.examKey] ?? null) : null;
  const daysLeft = examDate ? daysBetween(today, examDate) : null;

  /* ── رسالة دويرب — من إشاراتٍ حقيقية فقط ── */
  const dm = loadStats().dayMins ?? {};
  const everStarted = Object.values(dm).some((v) => v > 0) || ws.modules.some((m) => (m.progress ?? 0) > 0);
  let streakDays = 0;
  for (let k = 0; ; k++) { if ((dm[addDays(today, -k)] ?? 0) > 0) streakDays++; else break; }
  const daily = pickDailyMessage({
    name: user?.name, everStarted, yesterdayMins: dm[addDays(today, -1)] ?? 0, streakDays,
    daysToExam: daysLeft != null && daysLeft >= 0 ? daysLeft : null,
  });

  const startStudy = () => { if (priority) setSel({ kind: priority.kind, id: priority.id }); };

  return (
    <div className="min-h-dvh pb-nav relative z-[1] page-enter">
      <div className="max-w-xl mx-auto w-full px-5 pt-8 pb-6 flex flex-col gap-6">
        <PageGuide pageKey="roadmap" steps={[
          { title: "مساري = دربك خطوة بخطوة", desc: "هنا تعرف ماذا تفعل الآن. اضغط «ابدأ المذاكرة» لتبدأ جلستك مباشرة." },
        ]} />

        {/* ترحيب دويرب */}
        <div>
          <h1 className="t-h2 font-black leading-tight" style={{ color: "var(--text)" }}>{daily.greeting}</h1>
          {priority && (
            <p className="t-body mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
              اليوم عندك فرصة ترفع جاهزيتك في <span className="font-bold" style={{ color: "var(--text)" }}>{priority.label}</span>.
            </p>
          )}
        </div>

        {/* 💬 رسالة دويرب — تتغيّر يومياً حسب حالة الطالب الحقيقية */}
        <div className="rounded-3xl p-5" style={{ background: "color-mix(in srgb, var(--accent) 9%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--accent) 26%, var(--border))" }}>
          <p className="eyebrow mb-2" style={{ color: "var(--accent-light)" }}>💬 رسالة دويرب</p>
          <p className="t-title font-black leading-snug" style={{ color: "var(--text)" }}>{daily.message}</p>
        </div>

        {/* 🧭 خطوتك الآن — Life Engine (شيءٌ واحد) */}
        {top && (
          <div>
            <p className="eyebrow mb-2 px-1">🧭 خطوتك الآن</p>
            <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
              <span className="text-[26px] flex-shrink-0" aria-hidden="true">{top.icon}</span>
              <p className="t-body font-black flex-1 min-w-0 leading-snug" style={{ color: "var(--text)" }}>{top.title}</p>
            </div>
          </div>
        )}

        {/* 🧠 بطاقة الاختبار — اسم + باقٍ + «جاهز تبدأ؟» (بلا مؤشّرات) */}
        {priority ? (
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "var(--surface)", border: `1.5px solid ${priority.color}33` }}>
            <span className="text-[26px] flex-shrink-0" aria-hidden="true">{priority.icon ?? "🧠"}</span>
            <div className="flex-1 min-w-0">
              <p className="t-title font-black" style={{ color: "var(--text)" }}>{priority.label}</p>
              <p className="t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>
                {daysLeft != null && daysLeft > 0 ? `باقي ${daysWord(daysLeft)} · جاهز تبدأ؟`
                  : daysLeft === 0 ? "موعدك اليوم · بالتوفيق"
                  : "جاهز تبدأ؟"}
              </p>
            </div>
          </div>
        ) : (
          <p className="t-body px-1" style={{ color: "var(--text-muted)" }}>لا اختبارات بعد — ستضيفها من الإعدادات قريباً.</p>
        )}

        {/* ▶ ابدأ المذاكرة — أكبر عنصرٍ في الصفحة */}
        <button onClick={startStudy} disabled={!priority}
          className="w-full rounded-3xl glow-blue transition active:scale-[0.98]"
          style={{ background: "var(--accent)", color: "#fff", padding: "22px", opacity: priority ? 1 : 0.6, boxShadow: "0 10px 30px color-mix(in srgb, var(--accent) 45%, transparent)" }}>
          <span className="block font-black" style={{ fontSize: "1.4rem" }}>▶ ابدأ المذاكرة</span>
        </button>

        {/* شريط الأقسام (أسفل) — تُفعّل صفحاتها في المراحل التالية */}
        <div className="grid grid-cols-4 gap-2 mt-2">
          {SECTIONS.map((s) => (
            <div key={s.id} className="rounded-2xl py-3 flex flex-col items-center gap-1.5" style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", opacity: 0.7 }}>
              <span className="text-[20px]" aria-hidden="true">{s.icon}</span>
              <span className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>{s.label}</span>
              <span className="t-caption" style={{ color: "var(--text-dim)", fontSize: "0.62rem" }}>قريباً</span>
            </div>
          ))}
        </div>

        <PageFooter />
      </div>
    </div>
  );
}
